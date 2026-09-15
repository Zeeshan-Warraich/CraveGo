const express = require('express');

const {
  updateOrderStatus
} = require(
  '../controllers/restaurantOrderController'
);

const authMiddleware =
  require('../middleware/authMiddleware');

const allowRoles =
  require('../middleware/roleMiddleware');

const router = express.Router();

router.patch(
  '/:id/status',
  authMiddleware,
  allowRoles('restaurant'),
  updateOrderStatus
);

module.exports = router;