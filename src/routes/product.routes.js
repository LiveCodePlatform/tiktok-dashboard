import express from 'express';
import * as productController from '../controllers/product.controller.js';

const router = express.Router();

// Product Routes
router.post('/products', productController.createProduct);
router.get('/products', productController.getProducts);
router.patch('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.patch('/products/:id/adjust-stock', productController.adjustStock);

// Order & Utility Routes
router.get('/order/:salecode', productController.checkOrder);
router.post('/order/checkout', productController.checkout);
router.get('/orders', productController.getOrders);
router.post('/check-message', productController.classifyMessage);

export default router;
