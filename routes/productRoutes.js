const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// POST /api/products: Add a new product
router.post('/products', productController.createProduct);

// GET /api/products: List all products
router.get('/products', productController.getProducts);

// GET /api/order/:salecode: Find product by salecode and check stock
router.get('/order/:salecode', productController.checkOrder);

// POST /api/check-message: Classify user message
router.post('/check-message', productController.classifyMessage);

// POST /api/order/checkout: Deduct stock
router.post('/order/checkout', productController.checkout);

// GET /api/orders: List all orders
router.get('/orders', productController.getOrders);

// PATCH /api/products/:id/adjust-stock: Manually adjust stock
router.patch('/products/:id/adjust-stock', productController.adjustStock);

// PATCH /api/products/:id: Update product details
router.patch('/products/:id', productController.updateProduct);

// DELETE /api/products/:id: Remove a product
router.delete('/products/:id', productController.deleteProduct);

module.exports = router;
