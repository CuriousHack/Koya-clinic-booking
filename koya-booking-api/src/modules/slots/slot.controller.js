const slotService = require('./slot.service');

class SlotController {
  async getSlots(req, res, next) {
    try {
      const { status, doctorName, provider, from, to } = req.query;
      const slots = await slotService.listSlots({
        status,
        doctorName: doctorName || provider,
        from,
        to,
      });

      return res.status(200).json(slots);
    } catch (error) {
      return next(error);
    }
  }

  async getSlotById(req, res, next) {
    try {
      const { id } = req.params;
      const slot = await slotService.getSlotById(id);

      if (!slot) {
        return res.status(404).json({
          error: 'Slot not found',
        });
      }

      return res.status(200).json(slot);
    } catch (error) {
      return next(error);
    }
  }

  async createSlot(req, res, next) {
    try {
      const { id, start, end, startTime, endTime, doctorName, provider, serviceType } = req.body;
      const slot = await slotService.createSlot({
        id,
        start,
        end,
        startTime,
        endTime,
        doctorName: doctorName || provider,
        provider: provider || doctorName,
        serviceType,
      });

      return res.status(201).json(slot);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SlotController();
