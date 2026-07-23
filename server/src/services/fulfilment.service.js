const ErrorResponse = require('../utils/errorResponse');

/**
 * The order lifecycle — one definition, used by the API and mirrored by the console.
 *
 * The console and the database used to disagree about what an order status even
 * IS. The admin's "Change status…" dropdown offered "Ready for Dispatch",
 * "In Transit", "Return Requested" and "Return Approved"; none of those are in
 * the Order enum, so choosing one threw a Mongoose ValidationError and the order
 * silently refused to move. Meanwhile the values that DID exist were accepted
 * unconditionally — a Delivered order could be dragged back to Packed.
 *
 * Statuses here are exactly the Order schema enum. Transitions say which moves
 * are real, so the console can offer only the ones that will work.
 */

/** What can follow what. A status absent from this map is terminal. */
const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Packed', 'Cancelled'],
  Packed: ['Ready to Ship', 'Cancelled'],
  'Ready to Ship': ['Assigned to Logistics', 'Cancelled'],
  'Assigned to Logistics': ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered', 'Returned'],
  Delivered: ['Returned'],

  // Terminal, or owned by the refunds module.
  Cancelled: [],
  Returned: [],
  'Refund Requested': [],
  'Refund Approved': [],
  'Refund Completed': [],
  'Payment Failed': [],
  Expired: []
};

/**
 * Dispatch is the one step that needs more than a click: an order cannot be
 * handed to a courier without naming the courier and the AWB the customer will
 * track it with.
 */
const REQUIRES_COURIER = 'Assigned to Logistics';

/** The happy path, in order — what the console draws as a progress track. */
const FULFILMENT_FLOW = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Packed',
  'Ready to Ship',
  'Assigned to Logistics',
  'Shipped',
  'Out for Delivery',
  'Delivered'
];

/** Where an order can go from here. */
const nextStatuses = (current) => TRANSITIONS[current] ?? [];

/**
 * Refuse a move the lifecycle doesn't allow.
 *
 * The message names what IS possible, so the console never has to guess and the
 * admin isn't left staring at a generic failure.
 */
const assertTransition = (from, to) => {
  if (from === to) {
    throw new ErrorResponse(`This order is already ${to}.`, 400);
  }

  const allowed = nextStatuses(from);

  if (!allowed.includes(to)) {
    throw new ErrorResponse(
      allowed.length
        ? `A ${from} order can only move to: ${allowed.join(', ')}.`
        : `A ${from} order is final and cannot be moved.`,
      400
    );
  }
};

const validateStatusTransition = (from, to, role, reason) => {
  if (from === to) {
    throw new ErrorResponse(`This order is already ${to}.`, 400);
  }

  const allowed = nextStatuses(from);
  if (allowed.includes(to)) {
    return { isOverride: false };
  }

  // Override rules
  if (from === 'Delivered' && to !== 'Returned') {
    throw new ErrorResponse('Delivered orders are locked and cannot be modified.', 400);
  }

  if (role !== 'Super Admin') {
    throw new ErrorResponse(`Unauthorized status transition from ${from} to ${to}. Only a Super Admin can override order status transitions.`, 403);
  }

  if (!reason || !reason.trim()) {
    throw new ErrorResponse('A reason is required to override status transitions.', 400);
  }

  return { isOverride: true };
};

module.exports = {
  TRANSITIONS,
  FULFILMENT_FLOW,
  REQUIRES_COURIER,
  nextStatuses,
  assertTransition,
  validateStatusTransition
};
