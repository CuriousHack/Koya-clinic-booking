const express = require('express');
const bookingController = require('./booking.controller');

const router = express.Router();

// POST /api/bookings - Book a slot
router.post('/', bookingController.createBooking.bind(bookingController));

// GET /api/bookings/:id - Look up a booking by ID
router.get('/:id', bookingController.getBookingById.bind(bookingController));

// GET /api/bookings - List bookings (optional filter by patientEmail)
router.get('/', bookingController.getBookings.bind(bookingController));

module.exports = router;
