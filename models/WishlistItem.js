const mongoose = require('mongoose');

const WishlistItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: false },
  amazonLink: { type: String, required: true },
  price: { type: Number, required: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user
});

module.exports = mongoose.model('WishlistItem', WishlistItemSchema);
