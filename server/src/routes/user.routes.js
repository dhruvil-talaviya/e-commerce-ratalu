const express = require('express');
const router = express.Router();
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  patchAddress
} = require('../controllers/user.controller');

const { protect } = require('../middlewares/auth');

router.route('/addresses')
  .get(protect, getAddresses)
  .post(protect, addAddress);

router.route('/addresses/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress)
  .patch(protect, patchAddress);

router.patch('/addresses/:id/default', protect, setDefaultAddress);

module.exports = router;
