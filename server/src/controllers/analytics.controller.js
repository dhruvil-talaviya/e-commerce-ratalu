const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Wishlist = require('../models/Wishlist');
const Flavor = require('../models/Flavor');
const sendResponse = require('../utils/response');

/** Start of the local day, N days ago (0 = today). */
const dayStart = (daysAgo = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
};

/** Orders that count as real revenue (not cancelled / failed / expired). */
const LIVE_ORDER = { status: { $nin: ['Cancelled', 'Payment Failed', 'Expired'] } };

/**
 * Record one page view.
 *
 * @route POST /api/v1/track
 * @access Public
 */
exports.track = async (req, res) => {
  try {
    const visitorId = String(req.body.visitorId || '').slice(0, 64);
    if (visitorId) {
      await Visit.create({
        visitorId,
        path: String(req.body.path || '/').slice(0, 200),
        authed: Boolean(req.body.authed),
        referrer: String(req.body.referrer || '').slice(0, 200),
      });
    }
  } catch {
    // Analytics is never allowed to fail a request.
  }
  return res.status(200).json({ success: true });
};

/**
 * Reach dashboard — real counts, no invented numbers.
 *
 * @route GET /api/v1/admin/reach
 * @access Private (Admin)
 */
exports.getReach = async (req, res, next) => {
  try {
    const today = dayStart(0);

    const [
      visitorsToday,
      viewsToday,
      newCustomersToday,
      ordersTodayAgg,
      totalCustomers,
      returningToday,
      likesAgg,
    ] = await Promise.all([
      // Unique visitors today.
      Visit.distinct('visitorId', { createdAt: { $gte: today } }).then((v) => v.length),
      // Raw page views today.
      Visit.countDocuments({ createdAt: { $gte: today } }),
      // New sign-ups today.
      Customer.countDocuments({ createdAt: { $gte: today } }),
      // Orders + revenue today.
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, ...LIVE_ORDER } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totals.total' } } },
      ]),
      Customer.countDocuments({}),
      // Signed-in visitors today (a proxy for returning customers).
      Visit.distinct('visitorId', { createdAt: { $gte: today }, authed: true }).then((v) => v.length),
      // Product likes aggregation.
      Wishlist.aggregate([
        { $unwind: '$ids' },
        { $group: { _id: '$ids', likesCount: { $sum: 1 } } },
        { $sort: { likesCount: -1 } }
      ])
    ]);

    const ordersToday = ordersTodayAgg[0]?.count || 0;
    const revenueToday = ordersTodayAgg[0]?.revenue || 0;

    // Conversion: of today's unique visitors, how many placed an order.
    const conversionRate = visitorsToday > 0 ? Math.round((ordersToday / visitorsToday) * 1000) / 10 : 0;

    // Resolve all active products with their exact real-time likes count
    const allFlavors = await Flavor.find({ status: 'Active' }).select('name slug image gradient categoryId').lean();
    const likesMap = new Map(likesAgg.map((item) => [item._id, item.likesCount]));

    const topLikedProducts = allFlavors.map((flavor) => {
      const likesCount = likesMap.get(flavor.slug) || likesMap.get(String(flavor._id)) || 0;
      return {
        flavorId: flavor.slug,
        name: flavor.name,
        image: flavor.image || null,
        gradient: flavor.gradient || null,
        likesCount
      };
    }).sort((a, b) => b.likesCount - a.likesCount);

    const totalLikes = likesAgg.reduce((acc, curr) => acc + curr.likesCount, 0);
    const activeProductsCount = allFlavors.length || 1;
    const avgLikesPerProduct = Math.round((totalLikes / activeProductsCount) * 10) / 10;

    const accountsWithLikes = await Wishlist.countDocuments({ 'ids.0': { $exists: true } });
    const engagementRate = totalCustomers > 0 ? Math.round((accountsWithLikes / totalCustomers) * 1000) / 10 : 0;
    const mostLikedProduct = topLikedProducts[0] || null;

    // ── 7-day trend, oldest first ──────────────────────────────────────────
    const series = [];
    for (let i = 6; i >= 0; i--) {
      const from = dayStart(i);
      const to = dayStart(i - 1);

      const [visitors, signups, ordersAgg] = await Promise.all([
        Visit.distinct('visitorId', { createdAt: { $gte: from, $lt: to } }).then((v) => v.length),
        Customer.countDocuments({ createdAt: { $gte: from, $lt: to } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: from, $lt: to }, ...LIVE_ORDER } },
          { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totals.total' } } },
        ]),
      ]);

      series.push({
        date: from.toISOString().slice(0, 10),
        label: from.toLocaleDateString('en-IN', { weekday: 'short' }),
        visitors,
        signups,
        orders: ordersAgg[0]?.count || 0,
        revenue: ordersAgg[0]?.revenue || 0,
      });
    }

    sendResponse(res, 200, {
      success: true,
      data: {
        today: {
          visitors: visitorsToday,
          views: viewsToday,
          signups: newCustomersToday,
          orders: ordersToday,
          revenue: revenueToday,
          returningVisitors: returningToday,
          conversionRate,
          totalLikes,
        },
        totals: {
          customers: totalCustomers,
          likes: totalLikes,
          avgLikesPerProduct,
          engagementRate,
          accountsWithLikes,
        },
        mostLikedProduct,
        topLikedProducts,
        series,
      },
    });
  } catch (error) {
    next(error);
  }
};
