const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Flavor = require('../models/Flavor');
const sendResponse = require('../utils/response');

// @desc    Get Admin Dashboard Overview & Reports
// @route   GET /api/v1/admin/reports
// @access  Private (Admin only)
exports.getDashboardReports = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const pastWeek = new Date();
    pastWeek.setDate(pastWeek.getDate() - 7);

    const pastMonth = new Date();
    pastMonth.setDate(pastMonth.getDate() - 30);

    // 1. Total Revenue calculations (Completed = Confirmed, Packed, Ready for Dispatch, In Transit, Out for Delivery, Delivered)
    const validStatuses = ['Confirmed', 'Packed', 'Ready for Dispatch', 'In Transit', 'Out for Delivery', 'Delivered'];

    const revenueToday = await Order.aggregate([
      { $match: { status: { $in: validStatuses }, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$totals.total' } } }
    ]);

    const revenueWeekly = await Order.aggregate([
      { $match: { status: { $in: validStatuses }, createdAt: { $gte: pastWeek } } },
      { $group: { _id: null, total: { $sum: '$totals.total' } } }
    ]);

    const revenueMonthly = await Order.aggregate([
      { $match: { status: { $in: validStatuses }, createdAt: { $gte: pastMonth } } },
      { $group: { _id: null, total: { $sum: '$totals.total' } } }
    ]);

    const revenueTotal = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $group: { _id: null, total: { $sum: '$totals.total' } } }
    ]);

    // 2. Order counts
    const todayOrdersCount = await Order.countDocuments({ createdAt: { $gte: todayStart } });
    const pendingOrdersCount = await Order.countDocuments({ status: 'Pending' });
    const deliveredOrdersCount = await Order.countDocuments({ status: 'Delivered' });
    const cancelledOrdersCount = await Order.countDocuments({ status: 'Cancelled' });

    // 3. Customer metrics
    const totalCustomers = await Customer.countDocuments();
    const newCustomers = await Customer.countDocuments({ createdAt: { $gte: pastMonth } });

    // 4. Average Order Value
    const aovAgg = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $group: { _id: null, avgValue: { $avg: '$totals.total' } } }
    ]);

    // 5. Top Selling Products
    const topProducts = await Order.aggregate([
      { $match: { status: { $in: validStatuses } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { flavorId: '$items.flavorId', flavorName: '$items.flavorName' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 }
    ]);

    // 6. Sales / Orders trend (past 7 days)
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      const dailyRev = await Order.aggregate([
        { $match: { status: { $in: validStatuses }, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totals.total' } } }
      ]);
      const dailyCount = await Order.countDocuments({ createdAt: { $gte: start, $lte: end } });

      salesTrend.push({
        date: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        sales: dailyRev[0]?.total || 0,
        orders: dailyCount
      });
    }

    // 7. Inventory status
    const inventoryList = [];
    const products = await Product.find();
    for (const p of products) {
      const flavor = await Flavor.findOne({ id: p.flavorId });
      if (flavor) {
        for (const pack of p.packs) {
          inventoryList.push({
            flavorName: flavor.name,
            flavorId: flavor.id,
            packId: pack.id,
            packLabel: pack.label,
            sku: pack.sku || `${flavor.id}-${pack.id}`,
            stock: pack.stock
          });
        }
      }
    }

    sendResponse(res, 200, {
      success: true,
      data: {
        overview: {
          revenue: {
            today: revenueToday[0]?.total || 0,
            weekly: revenueWeekly[0]?.total || 0,
            monthly: revenueMonthly[0]?.total || 0,
            total: revenueTotal[0]?.total || 0
          },
          orders: {
            today: todayOrdersCount,
            pending: pendingOrdersCount,
            delivered: deliveredOrdersCount,
            cancelled: cancelledOrdersCount
          },
          customers: {
            total: totalCustomers,
            new: newCustomers,
            returning: totalCustomers - newCustomers > 0 ? totalCustomers - newCustomers : 0
          },
          aov: Math.round(aovAgg[0]?.avgValue || 0)
        },
        topProducts: topProducts.map(tp => ({
          flavorId: tp._id.flavorId,
          name: tp._id.flavorName,
          quantity: tp.quantitySold,
          revenue: tp.revenue
        })),
        salesTrend,
        inventoryList
      }
    });
  } catch (error) {
    next(error);
  }
};
