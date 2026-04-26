require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db.config');

const PORT = process.env.PORT || 5000;

// Connect to Database
// In a serverless environment like Vercel, it's often better to 
// connect in a middleware or at the top level without process.exit
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
    // Do not call process.exit(1) in production/serverless
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

module.exports = app; // Export for Vercel
