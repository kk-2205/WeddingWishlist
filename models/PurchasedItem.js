const mongoose = require('mongoose');

const purchasedItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  dateOfArrival: {
    type: Date,
    required: true
  },
  purchasedBy: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('PurchasedItem', purchasedItemSchema);
