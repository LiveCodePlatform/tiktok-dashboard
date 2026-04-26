import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import productRoutes from './routes/product.routes.js';
import globalErrorHandler from './middlewares/errorHandler.middleware.js';
import AppError from './errors/AppError.js';

const app = express();

// ============================================
// Middleware Setup
// ============================================
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));

// ============================================
// Routes
// ============================================
app.use('/api', productRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// ============================================
// Error Handling
// ============================================

// 404 Handler
app.all('(.*)', (req, res, next) => {
  next(new AppError(404, `Can't find ${req.originalUrl} on this server!`, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;
