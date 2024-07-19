const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file


// Read username and password from environment variables
const USERNAME = process.env.ADMIN;
const PASSWORD = process.env.PASSKEY;


router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: 'public' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    req.session.isAuthenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/auth/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
