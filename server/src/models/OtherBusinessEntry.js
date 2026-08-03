const mongoose = require('mongoose');

const OtherBusinessEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Entry date is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['sale', 'expense', 'both'],
      default: 'sale',
    },
    saleAmount: {
      type: Number,
      default: 0,
      min: [0, 'Sale amount cannot be negative'],
    },
    expenseAmount: {
      type: Number,
      default: 0,
      min: [0, 'Expense amount cannot be negative'],
    },
    amount: {
      type: Number,
      default: 0,
    },
    title: {
      type: String,
      required: [true, 'Description/Particulars is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    comments: {
      type: String,
      default: '',
      trim: true,
    },
    businessName: {
      type: String,
      default: 'My Other Business',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

OtherBusinessEntrySchema.index({ date: 1, type: 1 });

module.exports = mongoose.model('OtherBusinessEntry', OtherBusinessEntrySchema);
