const express = require('express');

const {
  getRestaurantDashboard
} = require(
  '../controllers/restaurantDashboardController'
);

const authMiddleware =
  require('../middleware/authMiddleware');

const allowRoles =
  require('../middleware/roleMiddleware');

const router = express.Router();

router.get(
  '/dashboard',
  authMiddleware,
  allowRoles('restaurant'),
  getRestaurantDashboard
);

module.exports = router;