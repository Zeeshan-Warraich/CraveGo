const express = require('express');
const cors = require('cors');
require('dotenv').config();

const restaurantRoutes = require('./routes/restaurantRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const restaurantDashboardRoutes =
  require('./routes/restaurantDashboardRoutes');
const restaurantMenuRoutes =
  require('./routes/restaurantMenuRoutes');
const restaurantOrderRoutes =
  require('./routes/restaurantOrderRoutes');

const adminRoutes = require('./routes/adminRoutes');

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu-items', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use(
  '/api/restaurant',
  restaurantDashboardRoutes
);
app.use(
  '/api/restaurant/menu',
  restaurantMenuRoutes
);
app.use(
  '/api/restaurant/orders',
  restaurantOrderRoutes
);
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CraveGo backend is running!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`CraveGo backend running on http://localhost:${PORT}`);
});