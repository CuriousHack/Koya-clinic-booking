const mongoose = require('mongoose');

const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bodyHash: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge records after 24 hours
idempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Idempotency = mongoose.model('Idempotency', idempotencySchema);

module.exports = Idempotency;
