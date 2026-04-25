const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./utils/db');

const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Routes
app.use('/api', productRoutes);

// Export for Vercel
module.exports = app;

// Only listen if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
}
