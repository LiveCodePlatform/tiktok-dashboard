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

// POST /api/orders/bulk-delete: Bulk delete orders
router.post('/orders/bulk-delete', orderController.bulkDeleteOrders);

// POST /api/orders/bulk-status: Bulk update order status
router.post('/orders/bulk-status', orderController.bulkUpdateOrderStatus);

// PATCH /api/orders/:id/status: Update single order status
router.patch('/orders/:id/status', orderController.updateOrderStatus);

// DELETE /api/orders/:id: Delete an order
router.delete('/orders/:id', orderController.deleteOrder);

module.exports = router;
