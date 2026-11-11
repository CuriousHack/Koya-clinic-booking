const express = require('express');
const router = express.Router();

const resetController = require('./modules/reset/reset.controller');
const slotController = require('./modules/slots/slot.controller');
const bookingController = require('./modules/bookings/booking.controller');

// Reset endpoint
router.post('/reset', resetController.reset.bind(resetController));

// Slot endpoints
router.get('/slots', slotController.getSlots.bind(slotController));
router.get('/slots/:id', slotController.getSlotById.bind(slotController));
router.post('/slots', slotController.createSlot.bind(slotController));

// Booking endpoints
router.post('/bookings', bookingController.createBooking.bind(bookingController));
router.get('/bookings/:id', bookingController.getBookingById.bind(bookingController));
router.get('/bookings', bookingController.getBookings.bind(bookingController));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
