const DeliveryPartner = require('../models/DeliveryPartner');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const { notifyAdmin } = require('../utils/notify');

// @desc    List all delivery partners
// @route   GET /api/v1/admin/logistics/partners
// @access  Private (Admin)
exports.getPartners = async (req, res, next) => {
  try {
    const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
    sendResponse(res, 200, { success: true, data: partners });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a delivery partner
// @route   POST /api/v1/admin/logistics/partners
// @access  Private (Admin)
exports.createPartner = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.create(req.body);

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: `Created delivery partner ${partner.companyName}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    await notifyAdmin({
      title: 'Delivery Partner Added',
      message: `New partner ${partner.companyName} has been onboarded.`,
      type: 'General'
    });

    sendResponse(res, 201, { success: true, data: partner });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a delivery partner
// @route   PUT /api/v1/admin/logistics/partners/:id
// @access  Private (Admin)
exports.updatePartner = async (req, res, next) => {
  try {
    let partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) {
      return next(new ErrorResponse('Partner not found', 404));
    }

    partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: `Updated delivery partner ${partner.companyName}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, data: partner });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a delivery partner
// @route   DELETE /api/v1/admin/logistics/partners/:id
// @access  Private (Admin)
exports.deletePartner = async (req, res, next) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) {
      return next(new ErrorResponse('Partner not found', 404));
    }

    await partner.deleteOne();

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: `Deleted delivery partner ${partner.companyName}`,
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    next(error);
  }
};
