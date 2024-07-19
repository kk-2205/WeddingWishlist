const express = require('express');
const router = express.Router();
const WishlistItem = require('../models/WishlistItem');
const TemporaryItem = require('../models/TemporaryItem');
const PurchasedItem = require('../models/PurchasedItem');
const moment = require('moment'); 

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  } else {
    res.status(401).send('You must log in to perform this action');
  }
}

// Get all wishlist items
router.get('/', async (req, res) => {
  try {
    const wishlistItems = await WishlistItem.find();
    res.render('wishlist', { items: wishlistItems, loggedIn: req.session.isAuthenticated });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Render the add item form
router.get('/add', isAuthenticated, (req, res) => {
  res.render('addItem', { loggedIn: req.session.isAuthenticated });
});

// Handle adding new item to the wishlist
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { name, image, amazonLink, price } = req.body;
    const newItem = new WishlistItem({ name, image, amazonLink, price });
    await newItem.save();
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Move item to temporary list only for non-logged-in users and show confirmation form
router.post('/temporary', async (req, res) => {
  if (req.session.isAuthenticated) {
    return res.status(403).send('Married couple cannot interact with wishlist items');
  }
  try {
    const { id } = req.body;
    const item = await WishlistItem.findById(id);
    if (!item) return res.status(404).send('Item not found');

    const temporaryItem = new TemporaryItem(item.toObject());
    await temporaryItem.save();
    await WishlistItem.findByIdAndDelete(id);

    res.render('confirmPurchase', { item: temporaryItem, loggedIn: req.session.isAuthenticated });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Move item from temporary to purchased
router.post('/purchased', async (req, res) => {
  try {
    const { id, dateOfArrival, purchasedBy, message, contact } = req.body; // Removed other fields from req.body
    const item = await TemporaryItem.findById(id); // Find item in TemporaryItem
    if (!item) return res.status(404).send('Item not found');

    const purchasedItem = new PurchasedItem({
      name: item.name,
      image: item.image,
      dateOfArrival,
      purchasedBy,
      message,
      contact
    });

    await purchasedItem.save(); // Save item to PurchasedItem
    await TemporaryItem.findByIdAndDelete(id); // Remove item from TemporaryItem

    res.redirect('/'); // Redirect to home after purchase
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Move item from temporary back to wishlist on cancel
router.post('/cancel', async (req, res) => {
  try {
    const { id } = req.body;
    const item = await TemporaryItem.findById(id);
    if (!item) return res.status(404).send('Item not found');

    const wishlistItem = new WishlistItem({
      name: item.name,
      image: item.image,
      amazonLink: item.amazonLink,
      price: item.price,
    });

    await wishlistItem.save();
    await TemporaryItem.findByIdAndDelete(id);

    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get all purchased items
router.get('/purchased', isAuthenticated, async (req, res) => {
  try {
    const purchasedItems = await PurchasedItem.find();
    purchasedItems.forEach(item => {
      item.formattedDate = moment(item.dateOfArrival).format('ddd, MMM D YYYY'); // Format the date
    });
    res.render('purchased', { items: purchasedItems, loggedIn: req.session.isAuthenticated });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
