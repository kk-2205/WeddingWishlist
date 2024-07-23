const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport'); // Use passport directly
const flash = require('connect-flash'); // Add this line
require('./config/passport')(passport);  // Ensure this is set up

const WishlistItem = require('./models/WishlistItem');
const TemporaryItem = require('./models/TemporaryItem');
const PurchasedItem = require('./models/PurchasedItem');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Current Directory:', __dirname);

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 3600000 } // Session expires in 1 hour
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Routes
const wishlistRoutes = require('./routes/wishlist');
const authRoutes = require('./routes/auth');


app.use('/wishlist', wishlistRoutes);
app.use('/auth', authRoutes);

app.use((req, res, next) => {
  res.locals.session = req.session;  // Make session accessible in views
  next();
});

// Root route (Welcome page)
app.get('/', async (req, res) => {
  const items = await WishlistItem.find();
  res.render('index', { items, loggedIn: req.session.isAuthenticated, session: req.session, user: req.user }); // Added session
});

// Other routes (like add item) should also pass `loggedIn`
app.get('/wishlist/add', (req, res) => {
  res.render('addItem', { loggedIn: req.session.isAuthenticated, session: req.session}); // Added session
});

app.get('/wishlist/confirmPurchase', (req, res) => {
  res.render('confirmPurchase', { loggedIn: req.session.isAuthenticated, session: req.session, user: req.user});
});



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Check every minute if items in the temporary list should be moved back to the wishlist

module.exports = app; // Ensure you export the app
