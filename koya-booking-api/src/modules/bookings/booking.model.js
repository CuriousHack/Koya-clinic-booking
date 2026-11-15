const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    id: {
      type: String,
      index: true,
    },
    slotId: {
      type: String,
      ref: 'Slot',
    },
    // Persist the API's snake_case alias because the unique booking constraint
    // is defined on this field. Keep it in sync with slotId before validation.
    slot_id: {
      type: String,
      ref: 'Slot',
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id || ret.id;
        ret.slot_id = ret.slot_id || ret.slotId;
        ret.slotId = ret.slotId || ret.slot_id;
        ret.name = ret.name || ret.patientName;
        ret.patientName = ret.patientName || ret.name;
        ret.email = ret.email || ret.patientEmail;
        ret.patientEmail = ret.patientEmail || ret.email;
        ret.status = ret.status || 'confirmed';
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id || ret.id;
        ret.slot_id = ret.slot_id || ret.slotId;
        ret.slotId = ret.slotId || ret.slot_id;
        ret.name = ret.name || ret.patientName;
        ret.patientName = ret.patientName || ret.name;
        ret.email = ret.email || ret.patientEmail;
        ret.patientEmail = ret.patientEmail || ret.email;
        ret.status = ret.status || 'confirmed';
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Map and sync aliases before validation
bookingSchema.pre('validate', function () {
  this.slot_id = this.slot_id || this.slotId;
  this.slotId = this.slotId || this.slot_id;
  this.name = this.name || this.patientName;
  this.patientName = this.patientName || this.name;
  this.email = this.email || this.patientEmail;
  this.patientEmail = this.patientEmail || this.email;
});

// Level 3 concurrency database constraint:
// No two confirmed bookings can ever share the same slot_id
bookingSchema.index(
  { slot_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
