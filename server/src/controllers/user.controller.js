const Customer = require('../models/Customer');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

// Validation helper
const validateAddressInput = (body) => {
  const { fullName, phone, houseNo, street, area, city, state, pinCode, addressType } = body;
  
  if (!fullName || !fullName.trim()) return 'Full Name is required';
  if (!phone || !phone.trim()) return 'Mobile Number is required';
  if (!houseNo || !houseNo.trim()) return 'House / Flat No. is required';
  if (!street || !street.trim()) return 'Street / Road is required';
  if (!area || !area.trim()) return 'Area / Locality is required';
  if (!city || !city.trim()) return 'City is required';
  if (!state || !state.trim()) return 'State is required';
  if (!pinCode || !pinCode.trim()) return 'PIN Code is required';

  if (!/^\d{10}$/.test(phone.trim())) {
    return 'Phone number must be exactly 10 digits';
  }

  if (!/^\d{6}$/.test(pinCode.trim())) {
    return 'PIN Code must be exactly 6 digits';
  }

  if (addressType && !['Home', 'Work', 'Other'].includes(addressType)) {
    return 'Invalid Address Type';
  }

  return null;
};

// @desc    Get all saved addresses of current user
// @route   GET /api/user/addresses
// @access  Private
exports.getAddresses = async (req, res, next) => {
  try {
    sendResponse(res, 200, {
      success: true,
      data: req.user.addresses || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new address
// @route   POST /api/user/addresses
// @access  Private
exports.addAddress = async (req, res, next) => {
  try {
    const errorMsg = validateAddressInput(req.body);
    if (errorMsg) {
      return next(new ErrorResponse(errorMsg, 400));
    }

    const {
      fullName, phone, houseNo, building, street, area,
      landmark, city, state, country, pinCode,
      latitude, longitude, accuracy, addressType, isDefault
    } = req.body;

    const addresses = req.user.addresses || [];
    
    // Determine if this address should be default
    const shouldBeDefault = isDefault || addresses.length === 0;

    if (shouldBeDefault) {
      addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Add address
    req.user.addresses.push({
      fullName: fullName.trim(),
      phone: phone.trim(),
      houseNo: houseNo.trim(),
      building: (building || '').trim(),
      street: street.trim(),
      area: area.trim(),
      landmark: (landmark || '').trim(),
      city: city.trim(),
      state: state.trim(),
      country: country || 'India',
      pinCode: pinCode.trim(),
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      accuracy: accuracy !== undefined ? accuracy : null,
      addressType: addressType || 'Home',
      isDefault: shouldBeDefault
    });

    const newAddress = req.user.addresses[req.user.addresses.length - 1];
    
    if (shouldBeDefault) {
      req.user.activeAddressId = newAddress._id.toString();
    }

    await req.user.save();

    sendResponse(res, 201, {
      success: true,
      message: 'Address added successfully',
      data: newAddress
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing address
// @route   PUT /api/user/addresses/:id
// @access  Private
exports.updateAddress = async (req, res, next) => {
  try {
    const errorMsg = validateAddressInput(req.body);
    if (errorMsg) {
      return next(new ErrorResponse(errorMsg, 400));
    }

    const address = req.user.addresses.id(req.params.id);
    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    const {
      fullName, phone, houseNo, building, street, area,
      landmark, city, state, country, pinCode,
      latitude, longitude, accuracy, addressType, isDefault
    } = req.body;

    const shouldBeDefault = isDefault;

    if (shouldBeDefault) {
      req.user.addresses.forEach(addr => {
        if (addr._id.toString() !== req.params.id) {
          addr.isDefault = false;
        }
      });
      req.user.activeAddressId = req.params.id;
    }

    address.fullName = fullName.trim();
    address.phone = phone.trim();
    address.houseNo = houseNo.trim();
    address.building = (building || '').trim();
    address.street = street.trim();
    address.area = area.trim();
    address.landmark = (landmark || '').trim();
    address.city = city.trim();
    address.state = state.trim();
    address.country = country || 'India';
    address.pinCode = pinCode.trim();
    if (latitude !== undefined) address.latitude = latitude;
    if (longitude !== undefined) address.longitude = longitude;
    if (accuracy !== undefined) address.accuracy = accuracy;
    address.addressType = addressType || 'Home';
    address.isDefault = shouldBeDefault;

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an address
// @route   DELETE /api/user/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.params.id);
    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    const wasDefault = address.isDefault;

    // Use Mongoose subdocument remove
    address.deleteOne();

    // If we deleted the default/active address, set another one as default
    if (wasDefault && req.user.addresses.length > 0) {
      req.user.addresses[0].isDefault = true;
      req.user.activeAddressId = req.user.addresses[0]._id.toString();
    } else if (req.user.addresses.length === 0) {
      req.user.activeAddressId = null;
    }

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Address deleted successfully',
      data: req.user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set an address as default
// @route   PATCH /api/user/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.params.id);
    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    req.user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === req.params.id;
    });

    req.user.activeAddressId = req.params.id;

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Default address set successfully',
      data: req.user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patch updates for address fields
// @route   PATCH /api/user/addresses/:id
// @access  Private
exports.patchAddress = async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.params.id);
    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    const fields = [
      'fullName', 'phone', 'houseNo', 'building', 'street', 'area',
      'landmark', 'city', 'state', 'country', 'pinCode',
      'latitude', 'longitude', 'accuracy', 'addressType', 'isDefault'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        address[field] = req.body[field];
      }
    });

    // Special validation checks on modified fields
    if (req.body.phone && !/^\d{10}$/.test(req.body.phone.trim())) {
      return next(new ErrorResponse('Phone number must be exactly 10 digits', 400));
    }
    if (req.body.pinCode && !/^\d{6}$/.test(req.body.pinCode.trim())) {
      return next(new ErrorResponse('PIN Code must be exactly 6 digits', 400));
    }

    if (req.body.isDefault) {
      req.user.addresses.forEach(addr => {
        if (addr._id.toString() !== req.params.id) {
          addr.isDefault = false;
        }
      });
      req.user.activeAddressId = req.params.id;
    }

    await req.user.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Address patched successfully',
      data: address
    });
  } catch (error) {
    next(error);
  }
};
