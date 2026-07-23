/**
 * analytics.service.js — Single source of truth for all dashboard KPIs.
 *
 * Every dashboard card, chart, report, and export MUST use this service.
 * No KPI formula may be duplicated in controllers or frontend code.
 *
 * Business Rules (Ratalu Wafers):
 * - Online payments only (Razorpay). No COD revenue.
 * - Customer may cancel within 5 minutes of placement.
 * - No return policy.
 * - Admin may cancel at any pre-shipment stage.
 * - Historical Gross Sales never decrease.
 * - Refunds affect only the date they are processed.
 */

const Order = require('../models/Order');
const Refund = require('../models/Refund');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Flavor = require('../models/Flavor');
const Inventory = require('../models/Inventory');
const { resolveDateRange, startOfDayInTz, DEFAULT_TZ, getTimezoneOffsetMs } = require('../utils/date');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build a MongoDB date match clause from a resolved range. */
function dateMatch(field, range) {
  if (!range.start && !range.end) return {};
  const clause = {};
  if (range.start) clause.$gte = range.start;
  if (range.end) clause.$lte = range.end;
  return { [field]: clause };
}

/**
 * Statuses that represent successfully paid orders.
 * An order enters Gross Sales the moment payment.status becomes 'Paid'.
 * A refunded order was originally paid, so it stays in Gross Sales.
 */
const PAID_STATUSES = ['Paid', 'Refunded', 'Partially Refunded'];

/** Active non-terminal order statuses (still in-flight). */
const IN_FLIGHT_STATUSES = [
  'Confirmed', 'Preparing', 'Packed', 'Ready to Ship',
  'Assigned to Logistics', 'Shipped', 'Out for Delivery'
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYTICS QUERY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all dashboard KPIs in optimized aggregation pipelines.
 *
 * @param {Object} opts
 * @param {string} opts.filter - Named range: today, yesterday, last7days, etc.
 * @param {string} [opts.customFrom] - ISO string for custom range start.
 * @param {string} [opts.customTo] - ISO string for custom range end.
 * @param {string} [opts.tz] - IANA timezone (default: Asia/Kolkata).
 */
async function getDashboardKPIs({ filter = 'allTime', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const dateClause = dateMatch('createdAt', range);
  const refundDateClause = dateMatch('refundedAt', range);

  // ───── ORDER AGGREGATION (single $facet) ──────────────────────────────────
  const [orderStats] = await Order.aggregate([
    { $match: { ...dateClause } },
    {
      $facet: {
        // Financial KPIs
        financial: [
          {
            $group: {
              _id: null,
              grossSales: {
                $sum: {
                  $cond: [
                    { $in: ['$payment.status', PAID_STATUSES] },
                    '$totals.total', 0
                  ]
                }
              },
              deliveredRevenue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'Delivered'] },
                        { $in: ['$payment.status', PAID_STATUSES] }
                      ]
                    },
                    '$totals.total', 0
                  ]
                }
              },
              pendingRevenue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$payment.status', 'Paid'] },
                        { $ne: ['$status', 'Delivered'] },
                        { $ne: ['$status', 'Cancelled'] }
                      ]
                    },
                    '$totals.total', 0
                  ]
                }
              },
              totalOrderValue: { $sum: '$totals.total' },
              paidOrderCount: {
                $sum: { $cond: [{ $in: ['$payment.status', PAID_STATUSES] }, 1, 0] }
              },
              totalDiscount: {
                $sum: {
                  $cond: [
                    { $in: ['$payment.status', PAID_STATUSES] },
                    '$totals.discount', 0
                  ]
                }
              },
              totalGst: {
                $sum: {
                  $cond: [
                    { $in: ['$payment.status', PAID_STATUSES] },
                    '$totals.gst', 0
                  ]
                }
              },
              totalShipping: {
                $sum: {
                  $cond: [
                    { $in: ['$payment.status', PAID_STATUSES] },
                    '$totals.shipping', 0
                  ]
                }
              },
              highestOrder: { $max: '$totals.total' },
              lowestOrder: { $min: '$totals.total' },
              totalItems: { $sum: { $sum: '$items.quantity' } },
              totalOrders: { $sum: 1 }
            }
          }
        ],

        // Order status breakdown
        statusBreakdown: [
          { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totals.total' } } }
        ],

        // Cancellation split (structured field)
        cancellations: [
          { $match: { status: 'Cancelled' } },
          {
            $group: {
              _id: { $ifNull: ['$cancelledBy', 'unknown'] },
              count: { $sum: 1 },
              amount: { $sum: '$totals.total' }
            }
          }
        ],

        // Payment status breakdown
        paymentBreakdown: [
          { $group: { _id: '$payment.status', count: { $sum: 1 } } }
        ],

        // Repeat customer analysis
        repeatCustomers: [
          { $match: { 'payment.status': { $in: PAID_STATUSES } } },
          { $group: { _id: '$customerId', orderCount: { $sum: 1 }, totalSpend: { $sum: '$totals.total' } } },
          {
            $group: {
              _id: null,
              totalPayingCustomers: { $sum: 1 },
              repeatCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
              avgRevenuePerCustomer: { $avg: '$totalSpend' },
              maxCustomerSpend: { $max: '$totalSpend' }
            }
          }
        ],

        // Top selling products
        topProducts: [
          { $match: { 'payment.status': { $in: PAID_STATUSES } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.flavorName',
              flavorId: { $first: '$items.flavorId' },
              quantitySold: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } }
            }
          },
          { $sort: { quantitySold: -1 } },
          { $limit: 10 }
        ],

        // Least selling products
        leastProducts: [
          { $match: { 'payment.status': { $in: PAID_STATUSES } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.flavorName',
              flavorId: { $first: '$items.flavorId' },
              quantitySold: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } }
            }
          },
          { $sort: { quantitySold: 1 } },
          { $limit: 5 }
        ],

        // Avg processing time (Confirmed→Delivered in hours)
        processingTime: [
          { $match: { status: 'Delivered' } },
          { $unwind: '$timeline' },
          {
            $group: {
              _id: '$_id',
              created: { $min: '$timeline.time' },
              delivered: { $max: '$timeline.time' }
            }
          },
          { $project: { hours: { $divide: [{ $subtract: ['$delivered', '$created'] }, 3600000] } } },
          { $group: { _id: null, avgHours: { $avg: '$hours' } } }
        ]
      }
    }
  ]);

  // ───── REFUND AGGREGATION ─────────────────────────────────────────────────
  const [refundStats] = await Refund.aggregate([
    {
      $facet: {
        completed: [
          { $match: { status: 'Refunded', ...refundDateClause } },
          {
            $group: {
              _id: null,
              totalRefunded: { $sum: { $ifNull: ['$ledger.netRefund', '$approvedAmount'] } },
              count: { $sum: 1 }
            }
          }
        ],
        allStatuses: [
          { ...(range.start || range.end ? { $match: dateMatch('createdAt', range) } : { $match: {} }) },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        avgRefundTime: [
          { $match: { status: 'Refunded', refundedAt: { $ne: null } } },
          { $project: { hours: { $divide: [{ $subtract: ['$refundedAt', '$requestedAt'] }, 3600000] } } },
          { $group: { _id: null, avgHours: { $avg: '$hours' } } }
        ]
      }
    }
  ]);

  // ───── CUSTOMER AGGREGATION ───────────────────────────────────────────────
  const todayRange = resolveDateRange('today', null, null, tz);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalCustomers, newCustomersToday, newCustomersRange, activeCustomers, inactiveCustomers] = await Promise.all([
    Customer.countDocuments({}),
    Customer.countDocuments({ createdAt: { $gte: todayRange.start, $lte: todayRange.end } }),
    range.start ? Customer.countDocuments({ createdAt: { $gte: range.start, $lte: range.end || new Date() } }) : Customer.countDocuments({}),
    Customer.countDocuments({ status: 'Active', updatedAt: { $gte: thirtyDaysAgo } }),
    Customer.countDocuments({ status: 'Active', updatedAt: { $lt: thirtyDaysAgo } })
  ]);

  // ───── PRODUCT AGGREGATION ────────────────────────────────────────────────
  const [totalFlavors, activeFlavors, inactiveFlavors, outOfStockFlavors] = await Promise.all([
    Flavor.countDocuments({}),
    Flavor.countDocuments({ status: 'Active' }),
    Flavor.countDocuments({ status: 'Inactive' }),
    Flavor.countDocuments({ inStock: false })
  ]);

  // ───── INVENTORY AGGREGATION (in MongoDB, not in-memory) ──────────────────
  const [inventoryStats] = await Inventory.aggregate([
    {
      $group: {
        _id: null,
        totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
        totalStock: { $sum: '$currentStock' },
        totalReserved: { $sum: '$reservedStock' },
        lowStockCount: {
          $sum: {
            $cond: [
              { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$lowStockAlertLimit'] }] },
              1, 0
            ]
          }
        },
        outOfStockCount: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } }
      }
    }
  ]);

  // ───── EXTRACT & COMPUTE ──────────────────────────────────────────────────
  const fin = orderStats.financial[0] || {};
  const refCompleted = refundStats.completed[0] || {};

  const grossSales = fin.grossSales || 0;
  const refundAmount = refCompleted.totalRefunded || 0;
  const netSales = grossSales - refundAmount;

  // Status counts
  const statusMap = {};
  (orderStats.statusBreakdown || []).forEach(s => { statusMap[s._id] = { count: s.count, amount: s.amount }; });

  // Cancellation breakdown
  const cancelMap = {};
  (orderStats.cancellations || []).forEach(c => { cancelMap[c._id] = { count: c.count, amount: c.amount }; });

  // Payment breakdown
  const paymentMap = {};
  (orderStats.paymentBreakdown || []).forEach(p => { paymentMap[p._id] = p.count; });

  // Refund status breakdown
  const refundStatusMap = {};
  (refundStats.allStatuses || []).forEach(s => { refundStatusMap[s._id] = s.count; });

  const totalOrders = fin.totalOrders || 0;
  const paidOrderCount = fin.paidOrderCount || 0;
  const repeatData = orderStats.repeatCustomers[0] || {};

  const inv = inventoryStats || {};

  return {
    // ─── Financial ─────────────────────────────────────────────────────────
    financial: {
      grossSales,
      refundAmount,
      netSales,
      deliveredRevenue: fin.deliveredRevenue || 0,
      pendingRevenue: fin.pendingRevenue || 0,
      aov: paidOrderCount > 0 ? Math.round(grossSales / paidOrderCount) : 0,
      totalDiscount: fin.totalDiscount || 0,
      totalGst: fin.totalGst || 0,
      totalShipping: fin.totalShipping || 0
    },

    // ─── Orders ────────────────────────────────────────────────────────────
    orders: {
      total: totalOrders,
      pending: statusMap['Pending']?.count || 0,
      confirmed: statusMap['Confirmed']?.count || 0,
      preparing: statusMap['Preparing']?.count || 0,
      packed: statusMap['Packed']?.count || 0,
      shipped: (statusMap['Shipped']?.count || 0) +
               (statusMap['Ready to Ship']?.count || 0) +
               (statusMap['Assigned to Logistics']?.count || 0) +
               (statusMap['Out for Delivery']?.count || 0),
      delivered: statusMap['Delivered']?.count || 0,
      cancelled: statusMap['Cancelled']?.count || 0,
      customerCancelled: cancelMap['customer']?.count || 0,
      adminCancelled: cancelMap['admin']?.count || 0,
      customerCancelledAmount: cancelMap['customer']?.amount || 0,
      adminCancelledAmount: cancelMap['admin']?.amount || 0,
      highestOrder: fin.highestOrder || 0,
      lowestOrder: fin.lowestOrder || 0,
      avgItemsPerOrder: totalOrders > 0 ? Math.round((fin.totalItems || 0) / totalOrders * 10) / 10 : 0,
      avgProcessingHours: Math.round((orderStats.processingTime[0]?.avgHours || 0) * 10) / 10
    },

    // ─── Payments ──────────────────────────────────────────────────────────
    payments: {
      successful: paymentMap['Paid'] || 0,
      pending: paymentMap['Pending'] || 0,
      failed: paymentMap['Failed'] || 0,
      refunded: paymentMap['Refunded'] || 0,
      cancelled: paymentMap['Cancelled'] || 0,
      successRate: totalOrders > 0 ? Math.round(((paymentMap['Paid'] || 0) / totalOrders) * 1000) / 10 : 0,
      failureRate: totalOrders > 0 ? Math.round(((paymentMap['Failed'] || 0) / totalOrders) * 1000) / 10 : 0,
      refundRate: paidOrderCount > 0 ? Math.round((refCompleted.count || 0) / paidOrderCount * 1000) / 10 : 0
    },

    // ─── Customers ─────────────────────────────────────────────────────────
    customers: {
      total: totalCustomers,
      newToday: newCustomersToday,
      newInRange: newCustomersRange,
      active: activeCustomers,
      inactive: inactiveCustomers,
      returning: repeatData.repeatCustomers || 0,
      repeatRate: (repeatData.totalPayingCustomers || 0) > 0
        ? Math.round((repeatData.repeatCustomers || 0) / repeatData.totalPayingCustomers * 1000) / 10
        : 0,
      avgRevenuePerCustomer: Math.round(repeatData.avgRevenuePerCustomer || 0),
      lifetimeValue: Math.round(repeatData.maxCustomerSpend || 0)
    },

    // ─── Products ──────────────────────────────────────────────────────────
    products: {
      total: totalFlavors,
      active: activeFlavors,
      inactive: inactiveFlavors,
      outOfStock: outOfStockFlavors,
      topSelling: (orderStats.topProducts || []).map(p => ({
        flavorId: p.flavorId || p._id?.flavorId || p._id || '',
        name: p._id?.flavorName || (typeof p._id === 'string' ? p._id : 'Unknown'),
        quantitySold: p.quantitySold,
        revenue: p.revenue
      })),
      leastSelling: (orderStats.leastProducts || []).map(p => ({
        flavorId: p.flavorId || p._id?.flavorId || p._id || '',
        name: p._id?.flavorName || (typeof p._id === 'string' ? p._id : 'Unknown'),
        quantitySold: p.quantitySold,
        revenue: p.revenue
      }))
    },

    // ─── Inventory ─────────────────────────────────────────────────────────
    inventory: {
      totalValue: inv.totalValue || 0,
      availableStock: Math.max((inv.totalStock || 0) - (inv.totalReserved || 0), 0),
      reservedStock: inv.totalReserved || 0,
      lowStock: inv.lowStockCount || 0,
      outOfStock: inv.outOfStockCount || 0
    },

    // ─── Business ──────────────────────────────────────────────────────────
    business: {
      cancellationRate: totalOrders > 0
        ? Math.round((statusMap['Cancelled']?.count || 0) / totalOrders * 1000) / 10
        : 0,
      fulfillmentRate: totalOrders > 0
        ? Math.round((statusMap['Delivered']?.count || 0) / totalOrders * 1000) / 10
        : 0,
      avgBasketSize: totalOrders > 0
        ? Math.round((fin.totalItems || 0) / totalOrders * 10) / 10
        : 0,
      revenueGrowth: 0, // Computed by chart trend comparison
      orderGrowth: 0,
      customerGrowth: 0
    },

    // ─── Refund Status ─────────────────────────────────────────────────────
    refunds: {
      submitted: refundStatusMap['Submitted'] || 0,
      underReview: refundStatusMap['Under Review'] || 0,
      approved: refundStatusMap['Approved'] || 0,
      processing: refundStatusMap['Refund Processing'] || 0,
      completed: refundStatusMap['Refunded'] || 0,
      failed: refundStatusMap['Failed'] || 0,
      rejected: refundStatusMap['Rejected'] || 0,
      avgRefundHours: Math.round((refundStats.avgRefundTime[0]?.avgHours || 0) * 10) / 10,
      totalRefunded: refundAmount,
      refundedCount: refCompleted.count || 0
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Revenue + orders trend grouped by day.
 * Uses a single aggregation instead of N sequential queries.
 */
async function getRevenueTrend({ filter = 'last7days', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = {};
  if (range.start) match.createdAt = { $gte: range.start };
  if (range.end) match.createdAt = { ...match.createdAt, $lte: range.end };

  // Revenue from paid orders only
  match['payment.status'] = { $in: PAID_STATUSES };

  const offset = getTimezoneOffsetMs(tz);

  const trend = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $add: ['$createdAt', offset] }
          }
        },
        revenue: { $sum: '$totals.total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } }
  ]);

  return trend;
}

/**
 * Order trend (all orders, not just paid).
 */
async function getOrderTrend({ filter = 'last7days', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = {};
  if (range.start) match.createdAt = { $gte: range.start };
  if (range.end) match.createdAt = { ...match.createdAt, $lte: range.end };

  const offset = getTimezoneOffsetMs(tz);

  const trend = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $add: ['$createdAt', offset] }
          }
        },
        orders: { $sum: 1 },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', orders: 1, cancelled: 1, delivered: 1 } }
  ]);

  return trend;
}

/**
 * Refund trend — grouped by refundedAt date (not createdAt).
 */
async function getRefundTrend({ filter = 'last7days', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = { status: 'Refunded', refundedAt: { $ne: null } };
  if (range.start) match.refundedAt.$gte = range.start;
  if (range.end) match.refundedAt.$lte = range.end;

  const offset = getTimezoneOffsetMs(tz);

  const trend = await Refund.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $add: ['$refundedAt', offset] }
          }
        },
        amount: { $sum: { $ifNull: ['$ledger.netRefund', '$approvedAmount'] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', amount: 1, count: 1 } }
  ]);

  return trend;
}

/**
 * Customer growth trend.
 */
async function getCustomerGrowth({ filter = 'last7days', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = {};
  if (range.start) match.createdAt = { $gte: range.start };
  if (range.end) match.createdAt = { ...match.createdAt, $lte: range.end };

  const offset = getTimezoneOffsetMs(tz);

  const trend = await Customer.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $add: ['$createdAt', offset] }
          }
        },
        newCustomers: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', newCustomers: 1 } }
  ]);

  return trend;
}

/**
 * Hourly orders distribution (for "today" typically).
 */
async function getHourlyOrders({ filter = 'today', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = {};
  if (range.start) match.createdAt = { $gte: range.start };
  if (range.end) match.createdAt = { ...match.createdAt, $lte: range.end };

  const offset = getTimezoneOffsetMs(tz);

  const hourly = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $hour: { $add: ['$createdAt', offset] } },
        orders: { $sum: 1 },
        revenue: {
          $sum: { $cond: [{ $in: ['$payment.status', PAID_STATUSES] }, '$totals.total', 0] }
        }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, hour: '$_id', orders: 1, revenue: 1 } }
  ]);

  return hourly;
}

/**
 * Order status distribution for pie/donut chart.
 */
async function getOrderStatusDistribution({ filter = 'allTime', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = {};
  if (range.start) match.createdAt = { $gte: range.start };
  if (range.end) match.createdAt = { ...match.createdAt, $lte: range.end };

  const dist = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return dist.map(d => ({ status: d._id, count: d.count }));
}

/**
 * Payment status distribution for pie/donut chart.
 */
async function getPaymentStatusDistribution({ filter = 'allTime', customFrom, customTo, tz = DEFAULT_TZ } = {}) {
  const range = resolveDateRange(filter, customFrom, customTo, tz);
  const match = {};
  if (range.start) match.createdAt = { $gte: range.start };
  if (range.end) match.createdAt = { ...match.createdAt, $lte: range.end };

  const dist = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$payment.status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return dist.map(d => ({ status: d._id || 'Unknown', count: d.count }));
}

module.exports = {
  getDashboardKPIs,
  getRevenueTrend,
  getOrderTrend,
  getRefundTrend,
  getCustomerGrowth,
  getHourlyOrders,
  getOrderStatusDistribution,
  getPaymentStatusDistribution,
  PAID_STATUSES,
  IN_FLIGHT_STATUSES
};
