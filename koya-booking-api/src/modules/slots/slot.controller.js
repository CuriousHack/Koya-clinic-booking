const slotService = require('./slot.service');

class SlotController {
  async getSlots(req, res, next) {
    try {
      const { status, provider } = req.query;
      const slots = await slotService.listSlots({ status, provider });
      return res.status(200).json(slots);
    } catch (error) {
      return next(error);
    }
  }

  async getSlotById(req, res, next) {
    try {
      const slot = await slotService.getSlotById(req.params.id);
      if (!slot) {
        return res.status(404).json({ error: 'Slot not found' });
      }
      return res.status(200).json(slot);
    } catch (error) {
      return next(error);
    }
  }

  async createSlot(req, res, next) {
    try {
      const { id, provider, start, end, available, status } = req.body;
      const slot = await slotService.createSlot({ id, provider, start, end, available, status });
      return res.status(201).json(slot);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SlotController();
