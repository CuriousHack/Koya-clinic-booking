const mongoose = require('mongoose');
const Slot = require('./slot.model');

class SlotService {
  /**
   * List slots with optional filtering.
   * Default: returns available slots sorted by startTime ascending.
   */
  async listSlots(filters = {}) {
    const query = {};

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    } else if (!filters.status) {
      query.status = 'available';
    }

    if (filters.doctorName || filters.provider) {
      const search = filters.doctorName || filters.provider;
      query.$or = [
        { doctorName: new RegExp(search, 'i') },
        { provider: new RegExp(search, 'i') },
      ];
    }

    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) query.startTime.$gte = new Date(filters.from);
      if (filters.to) query.startTime.$lte = new Date(filters.to);
    }

    return await Slot.find(query).sort({ startTime: 1 });
  }

  /**
   * Get a single slot by ID (supports string ID, ObjectId, or custom id).
   */
  async getSlotById(slotId) {
    return await Slot.findOne({
      $or: [{ _id: slotId }, { id: slotId }],
    });
  }

  /**
   * Create a new slot.
   */
  async createSlot(slotData) {
    const slotId = slotData.id || slotData._id || new mongoose.Types.ObjectId().toString();
    const provider = slotData.provider || slotData.doctorName || 'General Practitioner';
    const startTime = slotData.start
      ? new Date(slotData.start)
      : slotData.startTime
      ? new Date(slotData.startTime)
      : new Date();
    const endTime = slotData.end
      ? new Date(slotData.end)
      : slotData.endTime
      ? new Date(slotData.endTime)
      : new Date(startTime.getTime() + 30 * 60000);

    const slot = new Slot({
      _id: slotId,
      id: slotId,
      provider,
      doctorName: provider,
      start: slotData.start || startTime.toISOString(),
      startTime,
      end: slotData.end || endTime.toISOString(),
      endTime,
      serviceType: slotData.serviceType || 'Consultation',
      status: slotData.status || 'available',
    });

    return await slot.save();
  }

  /**
   * Create multiple slots.
   */
  async createManySlots(slotsData) {
    return await Slot.insertMany(slotsData);
  }

  /**
   * Seed initial sample slots if none exist.
   */
  async seedInitialSlotsIfEmpty() {
    const count = await Slot.countDocuments();
    if (count > 0) return [];

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const sampleSlots = [];
    const doctors = [
      { name: 'Dr. Sarah Connor', service: 'General Consultation' },
      { name: 'Dr. Marcus Vance', service: 'Dental Checkup' },
    ];

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      for (let hour = 9; hour < 14; hour += 1) {
        const slotStart = new Date(tomorrow);
        slotStart.setDate(slotStart.getDate() + dayOffset);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 45);

        const doctor = doctors[hour % doctors.length];
        const slotId = new mongoose.Types.ObjectId().toString();

        sampleSlots.push({
          id: slotId,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          provider: doctor.name,
          doctorName: doctor.name,
          serviceType: doctor.service,
          available: true,
        });
      }
    }

    return await Slot.insertMany(sampleSlots);
  }
}

module.exports = new SlotService();
