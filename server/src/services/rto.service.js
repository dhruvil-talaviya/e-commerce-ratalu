/**
 * RTO (Return to Origin) Service
 *
 * Single source of truth for everything that must happen when Shiprocket
 * reports a shipment as RTO In Transit or RTO Delivered.
 *
 * Called from:
 *  - webhook.controller.js  (realtime Shiprocket push)
 *  - LogisticsService.syncShipmentStatus()  (manual poll / scheduled sync)
 *
 * Centralising the logic here means both callers always behave identically,
 * and there is exactly one place to update when business rules change.
 */

'use strict';

const Refund  = require('../models/Refund');
const Counter = require('../models/Counter');
const LogisticsAuditLog = require('../models/LogisticsAuditLog');
const { notifyRTOCustomer, notifyAdmin } = require('../utils/notify');
const logger  = require('../config/logger');

/**
 * Called the moment Shiprocket first signals RTO (webhook or sync).
 *
 * What it does:
 *  1. Sets Order.status → "RTO In Transit" and pushes a timeline entry.
 *  2. Stamps shipment.rtoInitiatedAt (once only) and stores the raw courier
 *     reason for debugging.
 *  3. For prepaid orders (non-COD, payment is Paid) — auto-creates a Refund
 *     document in "Submitted" state (pending admin approval). Money never
 *     moves automatically.
 *  4. Sends the customer a rich notification explaining what happened and
 *     what their options are.
 *  5. Sends admin an alert so the RTO doesn't slip through unnoticed.
 *  6. Writes a LogisticsAuditLog entry.
 *
 * Guard: if shipment.rtoRefundAutoCreated is already true (duplicate webhook),
 * steps 3 and 4 are skipped so we never create two Refund records.
 *
 * @param {import('../models/Order')}    order     - Mongoose Order document
 * @param {import('../models/Shipment')} shipment  - Mongoose Shipment document
 * @param {string}  courierReason  - Raw reason string from Shiprocket payload
 * @returns {Promise<{ refundCreated: boolean, refundId: string|null }>}
 */
exports.handleRTOInitiated = async (order, shipment, courierReason = '') => {
  let refundCreated = false;
  let refundId      = null;

  try {
    // ── 1. Update Order status ────────────────────────────────────────────────
    if (order.status !== 'RTO In Transit') {
      order.status      = 'RTO In Transit';
      order.orderStatus = 'RTO In Transit';
      order.timeline.push({
        status: 'RTO In Transit',
        time:   new Date(),
        note:   `Courier returning parcel. ${courierReason ? `Reason: ${courierReason}.` : 'Delivery could not be completed.'}`
      });
      await order.save();
    }

    // ── 2. Stamp RTO timestamps & raw reason on Shipment ─────────────────────
    if (!shipment.rtoInitiatedAt) {
      shipment.rtoInitiatedAt  = new Date();
    }
    if (courierReason && !shipment.courierReasonRaw) {
      shipment.courierReasonRaw = courierReason;
    }
    // (caller is responsible for saving the shipment after this returns)

    // ── 3. Auto-create Refund for prepaid orders (once) ──────────────────────
    const isPrepaid = order.payment?.method !== 'COD'
                   && order.payment?.status  === 'Paid';

    if (isPrepaid && !shipment.rtoRefundAutoCreated) {
      // Check no open refund already exists (e.g. customer had already raised one)
      const existing = await Refund.findOne({
        orderId: order.id,
        status:  { $nin: ['Rejected', 'Cancelled', 'Refunded'] }
      });

      if (!existing) {
        const seq  = await Counter.next('refundNumber');
        refundId   = `REF-${String(seq).padStart(6, '0')}`;

        await Refund.create({
          refundId,
          orderId:       order.id,
          customerId:    order.customerId,
          customerName:  order.userName,
          customerPhone: order.userPhone  || '',
          orderTotal:    order.totals.total,
          requestedAmount: order.totals.total,
          reason:        'Other',
          description:   `Auto-created: courier RTO. ${courierReason || 'Delivery failed.'}`,
          source:        'rto_auto',
          status:        'Submitted',
          timeline: [{
            status: 'Submitted',
            note:   `Auto-created on RTO. Courier reason: ${courierReason || 'Not provided.'}`,
            by:     'system',
            at:     new Date()
          }]
        });

        shipment.rtoRefundAutoCreated = true;
        refundCreated = true;
        logger.info(`[RTO Service] Auto-created refund ${refundId} for prepaid order ${order.id}`);
      } else {
        // Mark guard even though we didn't create — prevents repeated checks
        shipment.rtoRefundAutoCreated = true;
        logger.info(`[RTO Service] Skipped auto-refund for ${order.id} — open refund ${existing.refundId} already exists`);
      }
    }

    // ── 4. Rich customer notification ─────────────────────────────────────────
    await notifyRTOCustomer(order, courierReason).catch(err =>
      logger.warn(`[RTO Service] Customer notification failed: ${err.message}`)
    );

    // ── 5. Admin alert ────────────────────────────────────────────────────────
    await notifyAdmin({
      title:   `RTO: Order ${order.displayId || order.id}`,
      message: `Order ${order.displayId || order.id} is being returned by the courier. ` +
               `${courierReason ? `Reason: ${courierReason}. ` : ''}` +
               `${refundCreated ? `Refund ${refundId} auto-created (pending your approval).` : ''}`,
      type: 'RTO'
    }).catch(err =>
      logger.warn(`[RTO Service] Admin notification failed: ${err.message}`)
    );

    // ── 6. Audit log ──────────────────────────────────────────────────────────
    await LogisticsAuditLog.create({
      action:        'rto_initiated',
      orderId:       order.id,
      shipmentId:    String(shipment._id),
      user:          'system',
      userRole:      'system',
      details:       `RTO initiated. Courier: ${shipment.courierName || 'Unknown'}. ` +
                     `Reason: ${courierReason || 'Not provided'}. ` +
                     `Refund auto-created: ${refundCreated} (${refundId || 'N/A'}).`
    }).catch(err =>
      logger.warn(`[RTO Service] Audit log failed: ${err.message}`)
    );

  } catch (err) {
    logger.error(`[RTO Service] handleRTOInitiated error for order ${order?.id}: ${err.message}`);
  }

  return { refundCreated, refundId };
};
