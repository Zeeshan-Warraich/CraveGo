const express = require('express');

const {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require(
  '../controllers/restaurantMenuController'
);

const authMiddleware =
  require('../middleware/authMiddleware');

const allowRoles =
  require('../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  allowRoles('restaurant'),
  createMenuItem
);

router.patch(
  '/:id',
  authMiddleware,
  allowRoles('restaurant'),
  updateMenuItem
);

router.delete(
  '/:id',
  authMiddleware,
  allowRoles('restaurant'),
  deleteMenuItem
);

module.exports = router;