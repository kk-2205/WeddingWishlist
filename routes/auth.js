const express = require('express');
const router = express.Router();
const passport = require('passport');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User'); // Ensure you have the correct path

// Sign-up route
router.get('/signup', (req, res) => {
  res.render('signup', { loggedIn: req.session.isAuthenticated, session: req.session});
});

router.post('/signup', async (req, res) => {
  try {
    const { email, name } = req.body;
    const password = crypto.randomBytes(4).toString('hex'); // Generate a random password
    const newUser = new User({ email, name, password });
    await newUser.save();

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
      subject: `${name}, welcome to Sai and Soham's wedding wishlist!`,
      text: `You have signed up on Sai and Soham's wedding wishlist. Your login password is: ${password}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Message sent: %s', info.messageId);
      }
    });

    res.redirect('/auth/guest-login');
  } catch (err) {
    console.error(err);
    res.redirect('/auth/signup');
  }
});


// Login route
router.get('/login', (req, res) => {
  res.render('login', { loggedIn: req.session.isAuthenticated, session: req.session})
});

router.post('/login', async (req, res) => {
  const USERNAME = process.env.ADMIN;
  const PASSWORD = process.env.PASSKEY;
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    req.session.isAuthenticated = true;
    req.session.isMarriedCouple = (username === process.env.ADMIN); // Set a session variable
    res.redirect('/');
  } else {
    res.redirect('/auth/login');
  }
  
});

// Guest login route
router.get('/guest-login', (req, res) => {
  res.render('guestLogin', { loggedIn: req.session.isAuthenticated, session: req.session});
});

router.post('/guest-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && user.password === password) {
      req.session.isAuthenticated = true;
      req.session.userId = user._id;
      req.session.isMarriedCouple = false;
      req.session.userName = user.name;
      document.getElementById('confirmForm').addEventListener('submit', function(event) {
        alert('Your purchase has been confirmed!');
        window.location.href = '/'; // Redirect to the home page
    });
    res.redirect('/');
    } else {
      console.log('incorrect')
      res.redirect('/auth/guest-login');
    }
  } catch (err) {
    console.error(err);
    res.redirect('/auth/guest-login');
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  } else {
    res.status(401).send('You must log in to perform this action');
  }
}

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
    }
    res.redirect('/');
  });
});

module.exports = router;
