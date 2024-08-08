const express = require('express');
const router = express.Router();
const WishlistItem = require('../models/WishlistItem');
const TemporaryItem = require('../models/TemporaryItem');
const PurchasedItem = require('../models/PurchasedItem');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const moment = require('moment');

// Middleware to check if the user is authenticated
async function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    try {
      const user = await User.findById(req.session.userId); // Assuming userId is stored in session
      if (user) {
        req.user = user;
        return next();
      } else {
        if (req.session.isMarriedCouple) {
          return next();
        }
        return res.status(401).send('You must log in to perform this action');
      }
    } catch (err) {
      return res.status(500).send('Internal Server Error');
    }
  } else {
    return res.status(401).send('You must log in to perform this action');
  }
}

// Middleware to check if the user is a guest
function isGuest(req, res, next) {
  if (req.session.isAuthenticated && !req.session.isMarriedCouple) {
    return next();
  } else if (!req.session.isAuthenticated) {
    return res.redirect('/auth/login'); // Redirect unauthenticated users to login
  } else {
    res.status(403).send('Guests only');
  }
}

// Middleware to check if the user is a married couple
function isMarriedCouple(req, res, next) {
  if (req.session.isMarriedCouple) {
    return next();
  } else if (!req.session.isAuthenticated) {
    return res.redirect('/auth/login'); // Redirect unauthenticated users to login
  } else {
    res.status(403).send('Only the married couple can perform this action');
  }
}

// Get all wishlist items
router.get('/', async (req, res) => {
  try {
    const wishlistItems = await WishlistItem.find();
    res.render('wishlist', { items: wishlistItems, loggedIn: req.isAuthenticated(), session: req.session, user: req.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Render the add item form
router.get('/add', isAuthenticated, isMarriedCouple, (req, res) => {
  res.render('addItem', { loggedIn: req.session.isAuthenticated, session: req.session  });
});

// Handle adding new item to the wishlist
router.post('/add', isAuthenticated, isMarriedCouple, async (req, res) => {
  try {
    const { name, image, amazonLink, price } = req.body;
    const newItem = new WishlistItem({ name, image, amazonLink, price });
    await newItem.save();
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Save item to user's saved list
router.post('/saved', isAuthenticated, isGuest, async (req, res) => {
  try {
    const { id } = req.body;
    const item = await WishlistItem.findById(id);
    if (!item) return res.status(404).send('Item not found');

    // Create a new TemporaryItem
    const temporaryItem = new TemporaryItem(item.toObject());
    await temporaryItem.save();

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send('User not found');

    // Add TemporaryItem to the user's savedItems
    if (!user.savedItems.includes(temporaryItem._id)) {
      user.savedItems.push(temporaryItem._id);
      await user.save();
    }

    // Remove the item from the Wishlist
    await WishlistItem.findByIdAndDelete(id);

    res.redirect('/wishlist/saved');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Show saved list
router.get('/saved', isAuthenticated, isGuest, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedItems').exec();
    res.render('savedList', { items: user.savedItems, loggedIn: req.session.isAuthenticated, session: req.session, user: req.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Show confirm purchase form
router.get('/confirmPurchase', isAuthenticated, isGuest, async (req, res) => {
  try {
    const item = await TemporaryItem.findById(req.query.id);
    if (!item) return res.status(404).send('Item not found');

    res.render('confirmPurchase', { item: item, loggedIn: req.session.isAuthenticated, session: req.session,user: req.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Confirm purchase route
router.post('/confirmPurchase', isAuthenticated, isGuest, async (req, res) => {
  try {
    const { id, dateOfArrival, purchasedBy, message, contact } = req.body;

    const user = await User.findById(req.user._id);
    const itemIndex = user.savedItems.indexOf(id);
    if (itemIndex === -1) return res.status(404).send('Item not found in saved list');

    const temporaryItem = await TemporaryItem.findById(id);
    if (!temporaryItem) return res.status(404).send('TemporaryItem not found');

    const purchasedItem = new PurchasedItem({
      name: temporaryItem.name,
      image: temporaryItem.image,
      dateOfArrival,
      purchasedBy,
      message,
      contact
    });

    await purchasedItem.save();
    user.savedItems.splice(itemIndex, 1);
    await user.save();

    await TemporaryItem.findByIdAndDelete(id);
    const itemname = purchasedItem.name;
    const email = user.email;
    const name = user.name;
    // Send password via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `${name}, Your Purchase Has Been Successfully Confirmed!`,
  text: `Dear ${name},\n\nWe are pleased to inform you that your purchase of "${itemname}" has been successfully confirmed. Thank you for your generous contribution to Sai and Soham's wedding wishlist!\n\nBest regards,\nKarishma Kamalahasan\nSai and Soham Wedding Wishlist Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Message sent: %s', info.messageId);
      }
    });

    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Move item from saved list back to wishlist
router.post('/cancel', isAuthenticated, isGuest, async (req, res) => {
  try {
    const { id } = req.body;

    const user = await User.findById(req.user._id);
    const itemIndex = user.savedItems.indexOf(id);
    if (itemIndex === -1) return res.status(404).send('Item not found in saved list');

    const temporaryItem = await TemporaryItem.findById(id);
    const wishlistItem = new WishlistItem({
      name: temporaryItem.name,
      image: temporaryItem.image,
      amazonLink: temporaryItem.amazonLink,
      price: temporaryItem.price
    });

    await wishlistItem.save();
    user.savedItems.splice(itemIndex, 1);
    await user.save();

    await TemporaryItem.findByIdAndDelete(id);

    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Show purchased list (Only for the married couple)
router.get('/purchased', isAuthenticated, isMarriedCouple, async (req, res) => {
  try {
    const purchasedItems = await PurchasedItem.find();
    purchasedItems.forEach(item => {
      item.formattedDate = moment(item.dateOfArrival).format('ddd, MMM D YYYY'); // Format the date
    });
    res.render('purchased', { items: purchasedItems, loggedIn: req.session.isAuthenticated, session: req.session, user: req.user });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
