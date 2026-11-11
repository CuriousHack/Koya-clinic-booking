const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    id: {
      type: String,
      index: true,
    },
    provider: {
      type: String,
      trim: true,
      default: 'General Practitioner',
    },
    doctorName: {
      type: String,
      trim: true,
      default: 'General Practitioner',
    },
    start: {
      type: String,
    },
    startTime: {
      type: Date,
      required: [true, 'Slot start time is required'],
    },
    end: {
      type: String,
    },
    endTime: {
      type: Date,
      required: [true, 'Slot end time is required'],
    },
    serviceType: {
      type: String,
      trim: true,
      default: 'Consultation',
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'cancelled'],
      default: 'available',
      index: true,
    },
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id || ret.id;
        ret.provider = ret.provider || ret.doctorName;
        ret.doctorName = ret.doctorName || ret.provider;
        ret.start = ret.start || (ret.startTime ? new Date(ret.startTime).toISOString() : undefined);
        ret.end = ret.end || (ret.endTime ? new Date(ret.endTime).toISOString() : undefined);
        ret.available = ret.available !== undefined ? ret.available : (ret.status === 'available');
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id || ret.id;
        ret.provider = ret.provider || ret.doctorName;
        ret.doctorName = ret.doctorName || ret.provider;
        ret.start = ret.start || (ret.startTime ? new Date(ret.startTime).toISOString() : undefined);
        ret.end = ret.end || (ret.endTime ? new Date(ret.endTime).toISOString() : undefined);
        ret.available = ret.available !== undefined ? ret.available : (ret.status === 'available');
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Synchronize status and available before validation
slotSchema.pre('validate', function () {
  if (this.status === 'booked' || this.status === 'cancelled') {
    this.available = false;
  } else if (this.available === false && this.status === 'available') {
    this.status = 'booked';
  }
});

// Indexes
slotSchema.index({ status: 1, startTime: 1 });

const Slot = mongoose.model('Slot', slotSchema);

module.exports = Slot;
