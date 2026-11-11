const bookingService = require('./booking.service');

class BookingController {
  async createBooking(req, res, next) {
    try {
      const slotId = req.body.slotId || req.body.slot_id || req.body.slot || req.body.id;
      const patientName = req.body.patientName || req.body.name || req.body.patient;
      const patientEmail = req.body.patientEmail || req.body.email;
      const patientPhone = req.body.patientPhone || req.body.phone || req.body.phoneNumber;
      const reason = req.body.reason || '';

      if (!slotId || !patientName || !patientEmail || !patientPhone) {
        return res.status(400).json({
          error: 'slotId, patientName, patientEmail, and patientPhone are required',
        });
      }

      const booking = await bookingService.createBooking({
        slotId,
        patientName,
        patientEmail,
        patientPhone,
        reason,
      });

      return res.status(201).json(booking);
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

  async getBookings(req, res, next) {
    try {
      const { patientEmail, email, status } = req.query;
      const bookings = await bookingService.listBookings({
        patientEmail: patientEmail || email,
        status,
      });

      return res.status(200).json(bookings);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new BookingController();
