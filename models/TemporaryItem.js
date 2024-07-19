const mongoose = require('mongoose');

const temporaryItemSchema = new mongoose.Schema({
  name: String,
  image: String,
  amazonLink: String,
  price: Number,
  address: String,
  dateOfArrival: Date,
  purchasedBy: String,
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // 1 hour
  }
});

module.exports = mongoose.model('TemporaryItem', temporaryItemSchema);
