const mongoose = require('mongoose');
const Booking = require('./booking.model');
const Slot = require('../slots/slot.model');

class BookingService {
  /**
   * Validates and books an available slot with concurrency control.
   */
  async createBooking({ slot_id, name, email, reason }) {
    // 1. Look up slot (Level 2: 404 if the slot doesn't exist)
    const slot = await Slot.findOne({
      $or: [{ _id: slot_id }, { id: slot_id }],
    });

    if (!slot) {
      const error = new Error('Slot not found');
      error.statusCode = 404;
      throw error;
    }

    // 2. Level 2: 400 if the slot has already started
    const slotStartTime = new Date(slot.startTime || slot.start);
    if (slotStartTime.getTime() <= Date.now()) {
      const error = new Error('Cannot book a slot that has already started');
      error.statusCode = 400;
      throw error;
    }

    // 3. Level 3: Concurrency handling using atomic conditional update
    // If two requests arrive at the exact same moment, only one can match status: 'available' and available: true
    const updatedSlot = await Slot.findOneAndUpdate(
      {
        _id: slot._id,
        status: 'available',
        available: true,
      },
      {
        $set: {
          status: 'booked',
          available: false,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedSlot) {
      const error = new Error('Slot is already booked or unavailable');
      error.statusCode = 409;
      throw error;
    }

    // 4. Create confirmed booking record
    const bookingId = new mongoose.Types.ObjectId().toString();
    const booking = new Booking({
      _id: bookingId,
      id: bookingId,
      slot_id: slot._id,
      slotId: slot._id,
      name,
      patientName: name,
      email,
      patientEmail: email,
      status: 'confirmed',
    });

    try {
      await booking.save();
    } catch (dbError) {
      // In case of any database conflict, roll back slot availability
      await Slot.updateOne(
        { _id: slot._id },
        { $set: { status: 'available', available: true } }
      );
      if (dbError.code === 11000) {
        const error = new Error('Slot is already booked or unavailable');
        error.statusCode = 409;
        throw error;
      }
      throw dbError;
    }

    return booking;
  }

  /**
   * Cancel a booking and re-open the slot (Level 3)
   */
  async cancelBooking(bookingId) {
    const booking = await Booking.findOne({
      $or: [{ _id: bookingId }, { id: bookingId }],
    });

    if (!booking) {
      const error = new Error('Booking not found');
      error.statusCode = 404;
      throw error;
    }

    if (booking.status === 'cancelled') {
      const error = new Error('Booking is already cancelled');
      error.statusCode = 400;
      throw error;
    }

    booking.status = 'cancelled';
    await booking.save();

    // Re-open the slot
    await Slot.updateOne(
      { _id: booking.slot_id },
      { $set: { status: 'available', available: true } }
    );

    return booking;
  }

  /**
   * Look up a booking by ID
   */
  async getBookingById(bookingId) {
    return await Booking.findOne({
      $or: [{ _id: bookingId }, { id: bookingId }],
    }).populate('slotId');
  }

  /**
   * List bookings with optional filtering
   */
  async listBookings(filters = {}) {
    const query = {};
    if (filters.email) query.email = filters.email.toLowerCase();
    if (filters.status) query.status = filters.status;

    return await Booking.find(query).sort({ createdAt: -1 });
  }
}

module.exports = new BookingService();
