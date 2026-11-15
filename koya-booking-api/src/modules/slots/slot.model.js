const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    provider: {
      type: String,
      required: [true, 'provider is required'],
      trim: true,
    },
    start: {
      type: String,
      required: [true, 'start is required'],
    },
    end: {
      type: String,
      required: [true, 'end is required'],
    },
    available: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'cancelled'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

// Keep available and status in sync before saving
slotSchema.pre('validate', function () {
  if (this.status === 'booked' || this.status === 'cancelled') {
    this.available = false;
  } else if (this.available === false) {
    this.status = 'booked';
  }
});

// Indexes for filtering and sorting
slotSchema.index({ status: 1 });
slotSchema.index({ available: 1 });
slotSchema.index({ start: 1 });

// Output only the five public fields (+ optional status)
slotSchema.set('toJSON', {
  transform(doc, ret) {
    return {
      id:        ret._id,
      provider:  ret.provider,
      start:     ret.start,
      end:       ret.end,
      available: ret.available,
      status:    ret.status,
    };
  },
});

slotSchema.set('toObject', {
  transform(doc, ret) {
    return {
      id:        ret._id,
      provider:  ret.provider,
      start:     ret.start,
      end:       ret.end,
      available: ret.available,
      status:    ret.status,
    };
  },
});

const Slot = mongoose.model('Slot', slotSchema);

module.exports = Slot;
