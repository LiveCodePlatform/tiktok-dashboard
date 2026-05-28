const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// GET /api/order/:productCode: Find product by productCode and check stock
router.get('/order/:productCode', orderController.checkOrder);

// POST /api/check-message: Classify user message
router.post('/check-message', orderController.classifyMessage);

// POST /api/orders: Create a multi-product order
router.post('/orders', orderController.createOrder);

// GET /api/orders: List all orders with optional filters
router.get('/orders', orderController.getOrders);

module.exports = router;
