const mongoose = require('mongoose');
const Slot = require('../slots/slot.model');
const Booking = require('../bookings/booking.model');

class ResetService {
  /**
   * Wipes/deletes all existing bookings and slots,
   * then inserts the new slots provided in the payload (allowing past dates).
   */
  async resetDatabase(slots = []) {
    // 1. Wipe/delete all existing bookings and slots from database
    await Booking.deleteMany({});
    await Slot.deleteMany({});

    // 2. Prepare slots to insert
    const slotsToInsert = (Array.isArray(slots) ? slots : []).map((s) => {
      const slotId = s.id || s._id || new mongoose.Types.ObjectId().toString();
      const provider = s.provider || s.doctorName || 'General Practitioner';
      const startTime = s.start
        ? new Date(s.start)
        : s.startTime
        ? new Date(s.startTime)
        : new Date();
      const endTime = s.end
        ? new Date(s.end)
        : s.endTime
        ? new Date(s.endTime)
        : new Date(startTime.getTime() + 30 * 60000);

      return {
        _id: slotId,
        id: slotId,
        doctorName: provider,
        start: s.start || startTime.toISOString(),
        end: s.end || endTime.toISOString(),
        available: true,
      };
    });

    let insertedSlots = [];
    if (slotsToInsert.length > 0) {
      insertedSlots = await Slot.insertMany(slotsToInsert);
    }

    return insertedSlots;
  }
}

module.exports = new ResetService();
