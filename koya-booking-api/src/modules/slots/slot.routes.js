const express = require('express');
const slotController = require('./slot.controller');

const router = express.Router();

// GET /api/slots - list slots (supports ?status=available|booked|all)
router.get('/', slotController.getSlots.bind(slotController));

// GET /api/slots/:id - get single slot
router.get('/:id', slotController.getSlotById.bind(slotController));

// POST /api/slots - create slot (useful for seeding/admin)
router.post('/', slotController.createSlot.bind(slotController));

module.exports = router;
