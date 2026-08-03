const express = require('express');
const router = express.Router();

const {
  getEntries,
  getCalendarSummary,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/otherBusiness.controller');

const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('admin')];

router.get('/', ...adminOnly, getEntries);
router.get('/calendar-summary', ...adminOnly, getCalendarSummary);
router.post('/', ...adminOnly, createEntry);
router.put('/:id', ...adminOnly, updateEntry);
router.delete('/:id', ...adminOnly, deleteEntry);

module.exports = router;
