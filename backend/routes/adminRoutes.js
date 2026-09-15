const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const admin = require('../controllers/adminController');

const router = express.Router();
router.use(authMiddleware, admin.requireAdmin);
router.get('/overview', admin.getOverview);
router.get('/restaurants', admin.listRestaurants);
router.post('/restaurants', admin.saveRestaurant);
router.patch('/restaurants/:id', admin.saveRestaurant);
router.get('/orders', admin.listOrders);
router.get('/users', admin.listUsers);

module.exports = router;
