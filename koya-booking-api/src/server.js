const app = require('./app');
const routes = require('./routes');
const { PORT, MONGODB_URI } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const slotService = require('./modules/slots/slot.service');

let server;

async function startServer() {
  try {
    await connectDB(MONGODB_URI);

    // Auto-seed sample slots if collection is empty
    const seeded = await slotService.seedInitialSlotsIfEmpty();
    if (seeded.length > 0) {
      console.log(`[Bootstrap] Initialized ${seeded.length} sample appointment slots`);
    }

    server = app.listen(PORT, () => {
      console.log(`[Server] Clinic Booking API running on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/health`);
      console.log(`[Server] Reset endpoint: http://localhost:${PORT}/reset`);
      console.log(`[Server] Slots endpoint: http://localhost:${PORT}/slots`);
      console.log(`[Server] Bookings endpoint: http://localhost:${PORT}/bookings`);
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
