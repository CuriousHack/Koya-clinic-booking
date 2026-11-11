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
    doctorName: {
      type: String,
      trim: true,
      default: 'General Practitioner',
    },
    start: {
      type: String,
    },
    end: {
      type: String,
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
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
slotSchema.index({ status: 1, startTime: 1 });

const Slot = mongoose.model('Slot', slotSchema);

module.exports = Slot;
