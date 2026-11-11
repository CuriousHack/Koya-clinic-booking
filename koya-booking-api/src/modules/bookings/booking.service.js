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
   * List a user's bookings with cursor-based pagination.
   *
   * - Requires email (case-insensitive match).
   * - Results are ordered oldest first (createdAt ASC, then _id ASC for stability).
   * - Cursor is base64(createdAt_ISO|_id), encoding the position of the last seen item.
   * - Returns { bookings, next_cursor } where next_cursor is null on the last page.
   *
   * @param {string} email - Required. The patient's email address.
   * @param {number} limit - Page size, 1–50, default 10.
   * @param {string|null} cursor - Opaque cursor string from a previous response.
   */
  async listBookingsByEmail({ email, limit = 10, cursor = null }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Build the base query
    const query = { email: normalizedEmail };

    // Apply cursor: fetch records after the cursor position (createdAt ASC, _id ASC)
    if (cursor) {
      let cursorCreatedAt, cursorId;
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const separatorIndex = decoded.lastIndexOf('|');
        if (separatorIndex === -1) throw new Error('bad format');
        cursorCreatedAt = decoded.substring(0, separatorIndex);
        cursorId = decoded.substring(separatorIndex + 1);
        if (!cursorCreatedAt || !cursorId) throw new Error('empty parts');
        new Date(cursorCreatedAt); // validate it's a parseable date
      } catch {
        const error = new Error('Invalid cursor');
        error.statusCode = 400;
        throw error;
      }

      // "After" condition: (createdAt > cursor.createdAt)
      //                 OR (createdAt = cursor.createdAt AND _id > cursor._id)
      query.$or = [
        { createdAt: { $gt: new Date(cursorCreatedAt) } },
        {
          createdAt: { $eq: new Date(cursorCreatedAt) },
          _id: { $gt: cursorId },
        },
      ];
    }

    // Fetch limit + 1 to determine whether a next page exists
    const rows = await Booking.find(query)
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasNextPage = rows.length > limit;
    const bookings = hasNextPage ? rows.slice(0, limit) : rows;

    // Build next_cursor from the last item returned
    let next_cursor = null;
    if (hasNextPage) {
      const last = bookings[bookings.length - 1];
      const raw = `${new Date(last.createdAt).toISOString()}|${last._id}`;
      next_cursor = Buffer.from(raw).toString('base64');
    }

    // Shape the response objects
    const formatted = bookings.map((b) => ({
      id: b._id,
      slot_id: b.slot_id || b.slotId,
      name: b.name || b.patientName,
      email: b.email || b.patientEmail,
      status: b.status,
      created_at: new Date(b.createdAt).toISOString(),
    }));

    return { bookings: formatted, next_cursor };
  }

  /**
   * @deprecated Use listBookingsByEmail for the public endpoint.
   * List bookings with optional filtering (internal / admin use)
   */
  async listBookings(filters = {}) {
    const query = {};
    if (filters.email) query.email = filters.email.toLowerCase();
    if (filters.status) query.status = filters.status;

    return await Booking.find(query).sort({ createdAt: -1 });
  }
}

module.exports = new BookingService();
