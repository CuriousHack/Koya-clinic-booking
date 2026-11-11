const resetService = require('./reset.service');

class ResetController {
  async reset(req, res, next) {
    try {
      const slots = req.body && Array.isArray(req.body.slots) ? req.body.slots : [];
      const insertedSlots = await resetService.resetDatabase(slots);

      return res.status(200).json({
        message: 'Reset successful',
        count: insertedSlots.length,
        slots: insertedSlots,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ResetController();
