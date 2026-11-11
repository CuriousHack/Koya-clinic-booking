const mongoose = require('mongoose');
const Booking = require('./booking.model');
const Slot = require('../slots/slot.model');

class BookingService {
  /**
   * Book an available slot.
   * Finds the slot, verifies availability, marks as booked, and creates the booking.
   */
  async createBooking(bookingData) {
    const { slotId, patientName, patientEmail, patientPhone, reason } = bookingData;

    // Check if slot exists
    const slot = await Slot.findOne({
      $or: [{ _id: slotId }, { id: slotId }],
    });

    if (!slot) {
      const error = new Error('Slot not found');
      error.statusCode = 404;
      throw error;
    }

    if (slot.status !== 'available') {
      const error = new Error('Slot is already booked or unavailable');
      error.statusCode = 409;
      throw error;
    }

    // Mark slot as booked
    slot.status = 'booked';
    await slot.save();

    const bookingId = new mongoose.Types.ObjectId().toString();
    const booking = new Booking({
      _id: bookingId,
      id: bookingId,
      slotId: slot._id,
      patientName,
      patientEmail,
      patientPhone,
      reason,
      status: 'confirmed',
    });

    await booking.save();

    return await Booking.findById(booking._id).populate('slotId');
  }

  /**
   * Look up a booking by ID with slot details.
   */
  async getBookingById(bookingId) {
    return await Booking.findOne({
      $or: [{ _id: bookingId }, { id: bookingId }],
    }).populate('slotId');
  }

  /**
   * List bookings with optional filter (e.g. by patientEmail, status).
   */
  async listBookings(filters = {}) {
    const query = {};
    if (filters.patientEmail) query.patientEmail = filters.patientEmail.toLowerCase();
    if (filters.status) query.status = filters.status;

    return await Booking.find(query).populate('slotId').sort({ createdAt: -1 });
  }
}

module.exports = new BookingService();
