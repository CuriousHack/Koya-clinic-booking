const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/koya-booking',
  API_KEY: process.env['X-API-Key'] || process.env.X_API_KEY || process.env.API_KEY || 'koya-api-key',
};
