const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const session = require('express-session');

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
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // Session expires in 1 hour
}));

// Routes
const wishlistRoutes = require('./routes/wishlist');
const authRoutes = require('./routes/auth');

app.use('/wishlist', wishlistRoutes);
app.use('/auth', authRoutes);

// Root route (Welcome page)
app.get('/', async (req, res) => {
  const items = await WishlistItem.find();
  res.render('index', { items, loggedIn: req.session.isAuthenticated });
});


// Other routes (like add item) should also pass `loggedIn`
app.get('/wishlist/add', (req, res) => {
  res.render('addItem', { loggedIn: req.session.isAuthenticated });
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/wishlist', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch(err => console.error('MongoDB connection error:', err));

// Check every minute if items in the temporary list should be moved back to the wishlist
cron.schedule('* * * * *', async () => {
  try {
    const expiredItems = await TemporaryItem.find({ createdAt: { $lt: new Date(Date.now() - 3600000) } }); // 1 hour
    for (const item of expiredItems) {
      const wishlistItem = new WishlistItem(item.toObject());
      await wishlistItem.save();
      await TemporaryItem.findByIdAndDelete(item._id);
    }
  } catch (err) {
    console.error('Error in cron job:', err);
  }
});
