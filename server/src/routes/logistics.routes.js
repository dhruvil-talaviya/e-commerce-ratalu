const express = require('express');
const router = express.Router();
const {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner
} = require('../controllers/logistics.controller');

const { protect, authorize } = require('../middlewares/auth');
const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

router.route('/admin/logistics/partners')
  .get(...adminOnly, getPartners)
  .post(...adminOnly, createPartner);

router.route('/admin/logistics/partners/:id')
  .put(...adminOnly, updatePartner)
  .delete(...adminOnly, deletePartner);

module.exports = router;
