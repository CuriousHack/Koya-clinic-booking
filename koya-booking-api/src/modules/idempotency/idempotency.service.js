const crypto = require('crypto');
const Idempotency = require('./idempotency.model');

class IdempotencyService {
  hashBody(body) {
    if (!body || typeof body !== 'object') {
      return JSON.stringify(body || {});
    }
    const sortedKeys = Object.keys(body).sort();
    const sortedObj = {};
    for (const key of sortedKeys) {
      sortedObj[key] = body[key];
    }
    return JSON.stringify(sortedObj);
  }

  async getRecord(key) {
    return await Idempotency.findOne({ key });
  }

  async saveRecord(key, body, statusCode, responseBody) {
    const bodyHash = this.hashBody(body);
    try {
      await Idempotency.create({
        key,
        bodyHash,
        statusCode,
        responseBody,
      });
    } catch (error) {
      // If a concurrent request already inserted this key, it's fine
      console.warn(`[Idempotency] Record for key ${key} might already exist:`, error.message);
    }
  }

  isSameBody(record, incomingBody) {
    const incomingHash = this.hashBody(incomingBody);
    return record.bodyHash === incomingHash;
  }
}

module.exports = new IdempotencyService();
