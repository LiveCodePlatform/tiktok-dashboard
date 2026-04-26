require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db.config');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB()
  .then(() => {
    // Only listen if not running in production (Vercel handles listening)
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Server is running on port: ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

module.exports = app; // Export for Vercel
