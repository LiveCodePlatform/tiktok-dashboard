import express from 'express';
import productRouter from './product.routes.js';

const router = express.Router();

router.use('/api', productRouter);

export {
    productRouter
};

export default router;
