const app = require('./app');
const routes = require('./routes');
const { PORT, MONGODB_URI, API_KEY, API_KEY_SOURCE } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const slotService = require('./modules/slots/slot.service');

let server;

async function startServer() {
  try {
    if (!API_KEY) {
      throw new Error('API key is not configured. Set API_KEY in the API service environment before starting the server.');
    }

    await connectDB(MONGODB_URI);

    // Auto-seed sample slots if collection is empty
    const seeded = await slotService.seedInitialSlotsIfEmpty();
    if (seeded.length > 0) {
      console.log(`[Bootstrap] Initialized ${seeded.length} sample appointment slots`);
    }

    server = app.listen(PORT, () => {
      console.log(`[Server] Clinic Booking API running on port ${PORT}`);
      console.log(`[Server] API key loaded from ${API_KEY_SOURCE}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Reset endpoint: http://localhost:${PORT}/api/reset`);
      console.log(`[Server] Slots endpoint: http://localhost:${PORT}/api/slots`);
      console.log(`[Server] Bookings endpoint: http://localhost:${PORT}/api/bookings`);
    });
  } catch (error) {
    console.error(`[Server] Failed to start server:`, error.message);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
