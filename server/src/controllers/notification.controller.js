const Notification = require('../models/Notification');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

// @desc    List the signed-in customer's notifications (newest first)
// @route   GET /api/v1/notifications
// @access  Private
/**
 * How far back the customer's inbox reaches.
 *
 * Kept server-side and never surfaced in the UI copy: the inbox simply shows
 * "your notifications", and anything older quietly falls off. Bounding the
 * query also stops the payload growing without limit as an account ages.
 */
const INBOX_WINDOW_DAYS = 30;

exports.getNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const since = new Date(Date.now() - INBOX_WINDOW_DAYS * 86400000);

    /**
     * `customerId: null` is a broadcast to every customer — but admin alerts are
     * also stored without a customerId, and in Mongo `{customerId: null}` matches
     * a *missing* field too. Without the `isAdmin` guard, every internal admin
     * notification would be served to every customer.
     */
    const scope = {
      isAdmin: { $ne: true },
      createdAt: { $gte: since },
      $or: [{ customerId: req.user._id }, { customerId: null }]
    };

    const [notifications, unread] = await Promise.all([
      Notification.find(scope).sort({ createdAt: -1 }).limit(limit).lean(),
      // Counted in the database, not from the returned page — otherwise the
      // badge would under-report as soon as the list is truncated.
      Notification.countDocuments({ ...scope, read: false })
    ]);

    sendResponse(res, 200, {
      success: true,
      data: notifications,
      meta: { unread, total: notifications.length }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark one notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      isAdmin: { $ne: true },
      $or: [{ customerId: req.user._id }, { customerId: null }]
    });

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    notification.read = true;
    await notification.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark every notification as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { customerId: req.user._id, read: false },
      { $set: { read: true } }
    );

    sendResponse(res, 200, {
      success: true,
      message: 'All notifications marked as read',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      customerId: req.user._id
    });

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Notification deleted',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List admin notifications (newest first)
// @route   GET /api/v1/admin/notifications
// @access  Private (Admin)
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, type } = req.query;

    const filter = { isAdmin: true };
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, totalRecords] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Notification.countDocuments(filter)
    ]);

    const unread = await Notification.countDocuments({ isAdmin: true, read: false });

    sendResponse(res, 200, {
      success: true,
      data: notifications,
      meta: { unread, total: totalRecords },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum) || 1,
        totalRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark one admin notification as read
// @route   PATCH /api/v1/admin/notifications/:id/read
// @access  Private (Admin)
exports.markAdminRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, isAdmin: true },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all admin notifications as read
// @route   PATCH /api/v1/admin/notifications/read-all
// @access  Private (Admin)
exports.markAdminAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { isAdmin: true, read: false },
      { $set: { read: true } }
    );

    sendResponse(res, 200, {
      success: true,
      message: 'All admin notifications marked as read',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an admin notification
// @route   DELETE /api/v1/admin/notifications/:id
// @access  Private (Admin)
exports.deleteAdminNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      isAdmin: true
    });

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Notification deleted',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
