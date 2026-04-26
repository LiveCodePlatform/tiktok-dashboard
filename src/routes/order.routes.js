const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// GET /api/order/:salecode: Find product by salecode and check stock
router.get('/order/:salecode', orderController.checkOrder);

// POST /api/check-message: Classify user message
router.post('/check-message', orderController.classifyMessage);

// POST /api/order/checkout: Deduct stock
router.post('/order/checkout', orderController.checkout);

// GET /api/orders: List all orders
router.get('/orders', orderController.getOrders);

module.exports = router;
