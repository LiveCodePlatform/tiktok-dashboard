const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const upload = require('../middlewares/upload.middleware');

// POST /api/products: Add a new product (with optional image)
router.post('/products', upload.single('image'), productController.createProduct);

// GET /api/products: List all products
router.get('/products', productController.getProducts);

// GET /api/products/:id: Get product details by ID
router.get('/products/:id', productController.getProductById);

// PATCH /api/products/:id/adjust-stock: Manually adjust stock
router.patch('/products/:id/adjust-stock', productController.adjustStock);

// PATCH /api/products/:id: Update product details (with optional image)
router.patch('/products/:id', upload.single('image'), productController.updateProduct);

// DELETE /api/products/:id: Remove a product
router.delete('/products/:id', productController.deleteProduct);

module.exports = router;
