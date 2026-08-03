const OtherBusinessEntry = require('../models/OtherBusinessEntry');
const sendResponse = require('../utils/response');

/**
 * @desc    Get entries for Other Business ledger aggregated STRICTLY 1 row per day
 * @route   GET /api/v1/admin/other-business
 * @access  Private (Admin)
 */
exports.getEntries = async (req, res, next) => {
  try {
    const {
      date,
      month,
      year,
      type,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const matchQuery = {};

    // Date filter
    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      matchQuery.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchQuery.date.$lte = e;
      }
    } else if (year || month) {
      const y = parseInt(year, 10) || new Date().getFullYear();
      let start, end;
      if (month && parseInt(month, 10) > 0) {
        const m = parseInt(month, 10) - 1; // 0-indexed month
        start = new Date(y, m, 1, 0, 0, 0, 0);
        end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      } else {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
      }
      matchQuery.date = { $gte: start, $lte: end };
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      matchQuery.$or = [
        { title: regex },
        { category: regex },
        { comments: regex },
        { businessName: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Aggregate MongoDB entries grouping by Day YYYY-MM-DD so there is strictly 1 entry per day!
    const aggregatePipeline = [
      { $match: matchQuery },
      {
        $project: {
          dayStr: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
          },
          date: 1,
          type: 1,
          amount: 1,
          saleAmount: {
            $cond: [{ $gt: ['$saleAmount', 0] }, '$saleAmount', { $cond: [{ $eq: ['$type', 'sale'] }, '$amount', 0] }],
          },
          expenseAmount: {
            $cond: [{ $gt: ['$expenseAmount', 0] }, '$expenseAmount', { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }],
          },
          title: 1,
          category: 1,
          comments: 1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: '$dayStr',
          id: { $first: '$_id' },
          date: { $first: '$date' },
          saleAmount: { $sum: '$saleAmount' },
          expenseAmount: { $sum: '$expenseAmount' },
          titles: { $addToSet: '$title' },
          category: { $first: '$category' },
          comments: { $push: '$comments' },
          createdAt: { $max: '$createdAt' },
        },
      },
      {
        $project: {
          _id: '$id',
          dayStr: '$_id',
          date: 1,
          saleAmount: 1,
          expenseAmount: 1,
          amount: { $subtract: ['$saleAmount', '$expenseAmount'] },
          type: {
            $cond: [
              { $and: [{ $gt: ['$saleAmount', 0] }, { $gt: ['$expenseAmount', 0] }] },
              'both',
              { $cond: [{ $gt: ['$saleAmount', 0] }, 'sale', 'expense'] },
            ],
          },
          title: {
            $reduce: {
              input: '$titles',
              initialValue: '',
              in: {
                $cond: [
                  { $eq: ['$$value', ''] },
                  '$$this',
                  { $concat: ['$$value', ' / ', '$$this'] },
                ],
              },
            },
          },
          category: 1,
          comments: {
            $reduce: {
              input: '$comments',
              initialValue: '',
              in: {
                $cond: [
                  { $or: [{ $eq: ['$$this', ''] }, { $eq: ['$$this', null] }] },
                  '$$value',
                  {
                    $cond: [
                      { $eq: ['$$value', ''] },
                      '$$this',
                      { $concat: ['$$value', ' | ', '$$this'] },
                    ],
                  },
                ],
              },
            },
          },
          createdAt: 1,
        },
      },
      { $sort: { date: -1, createdAt: -1 } },
    ];

    // Execute aggregation for paginated data
    const aggregatedResults = await OtherBusinessEntry.aggregate(aggregatePipeline);
    const totalRecords = aggregatedResults.length;

    // Apply pagination in memory on grouped daily records
    const paginatedEntries = aggregatedResults.slice(skip, skip + limitNum);

    // Calculate totals across all matching records
    let totalSales = 0;
    let totalExpenses = 0;
    aggregatedResults.forEach((r) => {
      totalSales += r.saleAmount || 0;
      totalExpenses += r.expenseAmount || 0;
    });

    const netProfit = totalSales - totalExpenses;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    return sendResponse(res, 200, {
      success: true,
      message: 'Ledger entries fetched successfully',
      data: paginatedEntries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        totalRecords,
      },
      meta: {
        totalSales,
        totalExpenses,
        netProfit,
        totalCount: totalRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly daily summary map for rendering calendar badges
 * @route   GET /api/v1/admin/other-business/calendar-summary
 * @access  Private (Admin)
 */
exports.getCalendarSummary = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const summary = await OtherBusinessEntry.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $project: {
          dayStr: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
          },
          saleAmount: {
            $cond: [{ $gt: ['$saleAmount', 0] }, '$saleAmount', { $cond: [{ $eq: ['$type', 'sale'] }, '$amount', 0] }],
          },
          expenseAmount: {
            $cond: [{ $gt: ['$expenseAmount', 0] }, '$expenseAmount', { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }],
          },
        },
      },
      {
        $group: {
          _id: '$dayStr',
          sales: { $sum: '$saleAmount' },
          expenses: { $sum: '$expenseAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryMap = {};
    summary.forEach((item) => {
      summaryMap[item._id] = {
        sales: item.sales,
        expenses: item.expenses,
        count: item.count,
      };
    });

    return sendResponse(res, 200, {
      success: true,
      data: summaryMap,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or Upsert a SINGLE daily record for a date (strictly 1 entry per day!)
 * @route   POST /api/v1/admin/other-business
 * @access  Private (Admin)
 */
exports.createEntry = async (req, res, next) => {
  try {
    const { date, type, amount, saleAmount, expenseAmount, title, category, comments, businessName } = req.body;

    if (!date) {
      return sendResponse(res, 400, {
        success: false,
        message: 'Entry date is required',
      });
    }

    const sAmt = Number(saleAmount !== undefined ? saleAmount : (type === 'sale' ? amount : 0));
    const eAmt = Number(expenseAmount !== undefined ? expenseAmount : (type === 'expense' ? amount : 0));

    if (sAmt <= 0 && eAmt <= 0 && (!amount || Number(amount) <= 0)) {
      return sendResponse(res, 400, {
        success: false,
        message: 'Please enter a valid Sale or Expense amount',
      });
    }

    const d = new Date(date);
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));

    // Find existing entry for this day
    let entry = await OtherBusinessEntry.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    let entryType = 'both';
    if (sAmt > 0 && eAmt <= 0) entryType = 'sale';
    if (eAmt > 0 && sAmt <= 0) entryType = 'expense';

    const netAmt = sAmt - eAmt;

    if (entry) {
      // Update the existing single entry for this day!
      entry.saleAmount = Math.max(0, sAmt);
      entry.expenseAmount = Math.max(0, eAmt);
      entry.amount = netAmt;
      entry.type = entryType;
      if (title) entry.title = title.trim();
      if (category) entry.category = category.trim();
      if (comments !== undefined) entry.comments = comments.trim();
      await entry.save();
    } else {
      // Create the single entry for this day!
      entry = await OtherBusinessEntry.create({
        date: new Date(date),
        type: entryType,
        saleAmount: Math.max(0, sAmt),
        expenseAmount: Math.max(0, eAmt),
        amount: netAmt,
        title: title ? title.trim() : 'Daily Transaction Record',
        category: category ? category.trim() : 'Sales Revenue',
        comments: comments ? comments.trim() : '',
        businessName: businessName ? businessName.trim() : 'My Other Business',
        createdBy: req.user?._id,
      });

      // Purge any accidental duplicates for this date to keep strictly 1 row!
      await OtherBusinessEntry.deleteMany({
        date: { $gte: startOfDay, $lte: endOfDay },
        _id: { $ne: entry._id },
      });
    }

    return sendResponse(res, 201, {
      success: true,
      message: 'Daily ledger record saved successfully (1 row per day)',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a ledger entry
 * @route   PUT /api/v1/admin/other-business/:id
 * @access  Private (Admin)
 */
exports.updateEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, type, amount, saleAmount, expenseAmount, title, category, comments, businessName } = req.body;

    const entry = await OtherBusinessEntry.findById(id);
    if (!entry) {
      return sendResponse(res, 404, {
        success: false,
        message: 'Ledger entry not found',
      });
    }

    if (date) entry.date = new Date(date);

    const sAmt = saleAmount !== undefined ? Number(saleAmount) : entry.saleAmount;
    const eAmt = expenseAmount !== undefined ? Number(expenseAmount) : entry.expenseAmount;

    entry.saleAmount = Math.max(0, sAmt);
    entry.expenseAmount = Math.max(0, eAmt);
    entry.amount = entry.saleAmount - entry.expenseAmount;

    if (entry.saleAmount > 0 && entry.expenseAmount > 0) {
      entry.type = 'both';
    } else if (entry.saleAmount > 0) {
      entry.type = 'sale';
    } else if (entry.expenseAmount > 0) {
      entry.type = 'expense';
    }

    if (title) entry.title = title.trim();
    if (category !== undefined) entry.category = category.trim() || 'General';
    if (comments !== undefined) entry.comments = comments.trim();
    if (businessName !== undefined) entry.businessName = businessName.trim() || 'My Other Business';

    await entry.save();

    return sendResponse(res, 200, {
      success: true,
      message: 'Ledger entry updated successfully',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a ledger entry (or clear for that date)
 * @route   DELETE /api/v1/admin/other-business/:id
 * @access  Private (Admin)
 */
exports.deleteEntry = async (req, res, next) => {
  try {
    const { id } = req.params;

    const entry = await OtherBusinessEntry.findById(id);
    if (!entry) {
      return sendResponse(res, 404, {
        success: false,
        message: 'Ledger entry not found',
      });
    }

    // Also delete any duplicates for the same date
    const d = new Date(entry.date);
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));

    await OtherBusinessEntry.deleteMany({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    return sendResponse(res, 200, {
      success: true,
      message: 'Ledger entry deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};
