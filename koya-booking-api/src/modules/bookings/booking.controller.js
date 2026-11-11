const bookingService = require('./booking.service');
const idempotencyService = require('../idempotency/idempotency.service');

class BookingController {
  async createBooking(req, res, next) {
    try {
      const rawSlotId = req.body?.slot_id !== undefined ? req.body.slot_id : req.body?.slotId;
      const rawName = req.body?.name !== undefined ? req.body.name : req.body?.patientName;
      const rawEmail = req.body?.email !== undefined ? req.body.email : req.body?.patientEmail;

      // Level 2: 400 if slot_id, name or email is missing or empty
      if (
        rawSlotId === undefined ||
        rawSlotId === null ||
        typeof rawSlotId !== 'string' ||
        rawSlotId.trim() === '' ||
        rawName === undefined ||
        rawName === null ||
        typeof rawName !== 'string' ||
        rawName.trim() === '' ||
        rawEmail === undefined ||
        rawEmail === null ||
        typeof rawEmail !== 'string' ||
        rawEmail.trim() === ''
      ) {
        return res.status(400).json({
          error: 'slot_id, name, and email are required and cannot be empty',
        });
      }

      // Level 2: Trim spaces from name and email, and store email in lower case
      const slot_id = rawSlotId.trim();
      const name = rawName.trim();
      const email = rawEmail.trim().toLowerCase();

      // Level 2: 400 if the email isn't valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email address',
        });
      }

      // Level 4: Optional Idempotency-Key header check
      const idempotencyKey = req.headers['idempotency-key'] || req.header('idempotency-key');
      if (idempotencyKey) {
        const existingRecord = await idempotencyService.getRecord(idempotencyKey);
        if (existingRecord) {
          // If body is different, return 422
          if (!idempotencyService.isSameBody(existingRecord, req.body)) {
            return res.status(422).json({
              error: 'Idempotency key already used with different request body',
            });
          }
          // Same key with same body: returns same response (same status code, same booking id)
          return res.status(existingRecord.statusCode).json(existingRecord.responseBody);
        }
      }

      // Create booking
      const booking = await bookingService.createBooking({
        slot_id,
        name,
        email,
        reason: req.body?.reason,
      });

      const responseData = booking.toJSON ? booking.toJSON() : booking;

      // Save idempotency record if key was provided
      if (idempotencyKey) {
        await idempotencyService.saveRecord(idempotencyKey, req.body, 201, responseData);
      }

      // Level 1: returns 201 with the booking, status confirmed
      return res.status(201).json(responseData);
    } catch (error) {
      return next(error);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await bookingService.getBookingById(id);

      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found',
        });
      }

      return res.status(200).json(booking);
    } catch (error) {
      return next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await bookingService.cancelBooking(id);

      return res.status(200).json({
        message: 'Booking cancelled successfully',
        booking,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getBookings(req, res, next) {
    try {
      const { email, limit: rawLimit, cursor } = req.query;

      // email is required
      if (!email || typeof email !== 'string' || email.trim() === '') {
        return res.status(400).json({
          error: 'email query parameter is required',
        });
      }

      // Parse and validate limit (default 10, range 1–50)
      let limit = 10;
      if (rawLimit !== undefined) {
        limit = parseInt(rawLimit, 10);
        if (!Number.isInteger(limit) || isNaN(limit) || limit < 1 || limit > 50) {
          return res.status(400).json({
            error: 'limit must be an integer between 1 and 50',
          });
        }
      }

      const result = await bookingService.listBookingsByEmail({
        email: email.trim(),
        limit,
        cursor: cursor || null,
      });

      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new BookingController();
