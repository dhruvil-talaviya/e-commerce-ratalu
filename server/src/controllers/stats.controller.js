const Review = require('../models/Review');
const Customer = require('../models/Customer');
const Flavor = require('../models/Flavor');
const sendResponse = require('../utils/response');

/**
 * The numbers the storefront is allowed to say out loud.
 *
 * The hero hardcoded "4.9★ Avg. rating" and "Loved by 2,000+ snackers". There
 * are no approved reviews at all and 14 customers — both figures were invented.
 * Anything the site claims about itself now comes from here, and a claim we
 * can't back with a real count comes back null so the component can omit it
 * rather than make something up.
 */
// @route   GET /api/v1/stats
// @access  Public
exports.getPublicStats = async (req, res, next) => {
  try {
    const [approved, customerCount, flavourCount] = await Promise.all([
      Review.find({ status: 'Approved' }).select('rating').lean(),
      Customer.countDocuments({ status: { $ne: 'Blocked' } }),
      Flavor.countDocuments({ status: 'Active' })
    ]);

    const reviewCount = approved.length;
    const avgRating = reviewCount
      ? Math.round((approved.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
      : null;

    sendResponse(res, 200, {
      success: true,
      data: {
        // null, not 0 — "no rating yet" is not "rated zero".
        avgRating,
        reviewCount,
        customerCount,
        flavourCount
      }
    });
  } catch (error) {
    next(error);
  }
};
