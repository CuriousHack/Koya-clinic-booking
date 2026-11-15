const mongoose = require('mongoose');
const Slot    = require('../slots/slot.model');
const Booking = require('../bookings/booking.model');

class ResetService {
  /**
   * Wipes all existing bookings, slots, and idempotency records,
   * then inserts the new slots supplied in the payload.
   * Past-dated slots are accepted without restriction.
   */
  async resetDatabase(slots = []) {
    await Booking.deleteMany({});
    await Slot.deleteMany({});

    try {
      const Idempotency = mongoose.model('Idempotency');
      await Idempotency.deleteMany({});
    } catch (_) {
      // model not yet registered — safe to ignore
    }

    try {
      const { clearAttempts } = require('../../middleware/rateLimiter');
      clearAttempts();
    } catch (_) {
      // safe to ignore
    }

    const toInsert = (Array.isArray(slots) ? slots : []).map((s) => {
      const slotId = s.id || s._id || new mongoose.Types.ObjectId().toString();
      const start  = s.start;
      const end    = s.end || new Date(new Date(start).getTime() + 30 * 60000).toISOString();
      const status = s.status || 'available';
      const available = s.available !== undefined ? s.available : (status === 'available');

      return {
        _id: slotId,
        provider: s.provider,
        start,
        end,
        status,
        available,
      };
    });

    if (toInsert.length === 0) return [];

    return await Slot.insertMany(toInsert);
  }
}

module.exports = new ResetService();
