const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
  name: String,
  image: String,
  amazonLink: String,
  price: Number,
  address: String,
  dateOfArrival: Date,
  purchasedBy: String,
  message: String
});

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);
