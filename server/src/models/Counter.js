const mongoose = require('mongoose');

/**
 * Atomic sequence generator.
 *
 * `findOneAndUpdate` with `$inc` is a single atomic document operation, so two
 * concurrent checkouts can never be handed the same number — which a
 * `countDocuments() + 1` approach would happily do under load.
 */
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'orderNumber'
  seq: { type: Number, default: 0 }
});

/** Reserve and return the next value in the named sequence. */
CounterSchema.statics.next = async function (name) {
  const counter = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = mongoose.model('Counter', CounterSchema);
