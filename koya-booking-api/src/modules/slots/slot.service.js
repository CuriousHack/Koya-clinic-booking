const mongoose = require('mongoose');
const Slot = require('./slot.model');

class SlotService {
  /**
   * List slots.
   * Default: available slots sorted by start (ISO string) ascending.
   * Pass status=all to return every slot.
   */
  async listSlots(filters = {}) {
    const query = {};

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    } else if (!filters.status) {
      query.status = 'available';
    }

    if (filters.provider) {
      query.provider = new RegExp(filters.provider, 'i');
    }

    return await Slot.find(query).sort({ start: 1 });
  }

  /**
   * Get a single slot by its _id.
   */
  async getSlotById(slotId) {
    return await Slot.findById(slotId);
  }

  /**
   * Create a slot from a plain object.
   * Accepts: id, provider, start, end, available, status.
   */
  async createSlot(data) {
    const slotId = data.id || data._id || new mongoose.Types.ObjectId().toString();
    const start  = data.start;
    const end    = data.end || new Date(new Date(start).getTime() + 30 * 60000).toISOString();
    const status = data.status || 'available';
    const available = data.available !== undefined ? data.available : (status === 'available');

    const slot = new Slot({
      _id: slotId,
      provider: data.provider,
      start,
      end,
      status,
      available,
    });

    return await slot.save();
  }

  /**
   * Seed sample slots on first boot (collection empty).
   */
  async seedInitialSlotsIfEmpty() {
    const count = await Slot.countDocuments();
    if (count > 0) return [];

    const now = new Date();
    const base = new Date(now);
    base.setDate(base.getDate() + 1);
    base.setHours(9, 0, 0, 0);

    const providers = ['Dr. Sarah Connor', 'Dr. Marcus Vance'];
    const seeds = [];

    for (let day = 0; day < 3; day++) {
      for (let hour = 9; hour < 14; hour++) {
        const slotStart = new Date(base);
        slotStart.setDate(slotStart.getDate() + day);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + 45 * 60000);
        const slotId  = new mongoose.Types.ObjectId().toString();

        seeds.push({
          _id:       slotId,
          provider:  providers[hour % providers.length],
          start:     slotStart.toISOString(),
          end:       slotEnd.toISOString(),
          status:    'available',
          available: true,
        });
      }
    }

    return await Slot.insertMany(seeds);
  }
}

module.exports = new SlotService();
