const Notification = require('../models/Notification');
const logger = require('../config/logger');

/**
 * Record a customer-facing notification.
 *
 * Deliberately never throws: a notification is a side-effect of the real work
 * (placing an order, changing a status), so a write failure here must not roll
 * back or 500 the operation that triggered it. Failures are logged instead.
 */
const notify = async (customerId, { title, message, type = 'General' }) => {
  try {
    if (!customerId) return null;
    return await Notification.create({ customerId, title, message, type });
  } catch (error) {
    logger.error(`Failed to write notification: ${error.message}`);
    return null;
  }
};

/**
 * Human-readable copy for each order status the customer can land on.
 *
 * These keys are the EXACT Order schema statuses (see models/Order.js and
 * services/fulfilment.service.js). The old map still referenced retired
 * statuses like "Ready for Dispatch" and "In Transit" that the lifecycle no
 * longer produces, so those transitions fell through to a bland "is now …".
 */
const ORDER_STATUS_COPY = {
  Pending: 'has been received and is awaiting payment.',
  Confirmed: 'is confirmed and being prepared.',
  Preparing: 'is being prepared with care.',
  Packed: 'has been packed and is ready to ship.',
  'Ready to Ship': 'is packed and waiting for courier pickup.',
  'Assigned to Logistics': 'has been handed to our courier partner.',
  Shipped: 'has been shipped and is on its way to you.',
  'Out for Delivery': 'is out for delivery today.',
  Delivered: 'has been delivered. Enjoy every crunch!',
  Cancelled: 'has been cancelled.',
  Returned: 'has been marked as returned.',
  'Refund Requested': 'has a refund request under review.',
  'Refund Approved': 'has an approved refund — the amount is on its way back to you.',
  'Refund Completed': 'has been fully refunded.',
  'Payment Failed': "couldn't be paid — the payment didn't go through. You can retry it from your orders.",
  Expired: "expired because payment wasn't completed in time. Your items have been released."
};

/** Notify a customer that one of their orders changed status. */
const notifyOrderStatus = (order, status) =>
  notify(order.customerId, {
    title: `Order ${order.displayId || order.id}`,
    message: `Your order ${order.displayId || order.id} ${
      ORDER_STATUS_COPY[status] || `is now ${status}.`
    }`,
    type: 'OrderStatus'
  });

/** Record an admin-facing alert notification. */
const notifyAdmin = async ({ title, message, type = 'General' }) => {
  try {
    return await Notification.create({ isAdmin: true, title, message, type });
  } catch (error) {
    logger.error(`Failed to write admin notification: ${error.message}`);
    return null;
  }
};

module.exports = { notify, notifyOrderStatus, notifyAdmin, ORDER_STATUS_COPY };
