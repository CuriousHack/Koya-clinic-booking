const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const app = require('../src/app');
const Slot = require('../src/modules/slots/slot.model');
const Booking = require('../src/modules/bookings/booking.model');
const Idempotency = require('../src/modules/idempotency/idempotency.model');
const { clearAttempts } = require('../src/middleware/rateLimiter');
const { API_KEY } = require('../src/config/env');

let mongod;

test.before(async () => {
  mongod = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 60000,
    },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

test.beforeEach(async () => {
  await Slot.deleteMany({});
  await Booking.deleteMany({});
  await Idempotency.deleteMany({});
  clearAttempts();
});

// Helper to create future slot
async function createFutureSlot(id = 'slot-1') {
  const futureStart = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours in future
  const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);
  return await Slot.create({
    _id: id,
    id: id,
    doctorName: 'Dr Ade',
    provider: 'Dr Ade',
    start: futureStart.toISOString(),
    startTime: futureStart,
    end: futureEnd.toISOString(),
    endTime: futureEnd,
    status: 'available',
    available: true,
  });
}

// -----------------------------------------------------------------------------
// LEVEL 1 TESTS
// -----------------------------------------------------------------------------
test('Level 1: returns 201 with the booking, status confirmed, changes slot status to booked and available to false', async () => {
  const slot = await createFutureSlot('s1');

  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slot_id: 's1',
      name: 'John Doe',
      email: 'john@example.com',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'confirmed');
  assert.equal(res.body.slot_id, 's1');
  assert.equal(res.body.name, 'John Doe');
  assert.equal(res.body.email, 'john@example.com');
  assert.ok(res.body.id);

  // Check updated slot in database
  const updatedSlot = await Slot.findById('s1');
  assert.equal(updatedSlot.status, 'booked');
  assert.equal(updatedSlot.available, false);
});

// -----------------------------------------------------------------------------
// LEVEL 2 TESTS
// -----------------------------------------------------------------------------
test('Level 2: 400 if slot_id is missing or empty', async () => {
  // Missing slot_id
  const res1 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ name: 'John Doe', email: 'john@example.com' });
  assert.equal(res1.status, 400);
  assert.equal(typeof res1.body.error, 'string');

  // Empty slot_id
  const res2 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: '   ', name: 'John Doe', email: 'john@example.com' });
  assert.equal(res2.status, 400);
  assert.equal(typeof res2.body.error, 'string');
});

test('Level 2: 400 if name is missing or empty', async () => {
  const slot = await createFutureSlot('s2');

  // Missing name
  const res1 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 's2', email: 'john@example.com' });
  assert.equal(res1.status, 400);
  assert.equal(typeof res1.body.error, 'string');

  // Empty name
  const res2 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 's2', name: '   ', email: 'john@example.com' });
  assert.equal(res2.status, 400);
  assert.equal(typeof res2.body.error, 'string');
});

test('Level 2: 400 if email is missing or empty', async () => {
  const slot = await createFutureSlot('s3');

  // Missing email
  const res1 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 's3', name: 'John Doe' });
  assert.equal(res1.status, 400);
  assert.equal(typeof res1.body.error, 'string');

  // Empty email
  const res2 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 's3', name: 'John Doe', email: '  ' });
  assert.equal(res2.status, 400);
  assert.equal(typeof res2.body.error, 'string');
});

test('Level 2: 400 if the email is not valid', async () => {
  const slot = await createFutureSlot('s4');

  const invalidEmails = ['invalid', 'john@', 'john@com', 'john@.com', '@domain.com', 'john doe@example.com'];
  for (const email of invalidEmails) {
    const res = await request(app)
      .post('/bookings')
      .set('X-API-Key', API_KEY)
      .send({ slot_id: 's4', name: 'John Doe', email });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid email/i);
  }
});

test('Level 2: 404 if the slot does not exist', async () => {
  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 'non-existent-slot-id', name: 'John Doe', email: 'john@example.com' });
  assert.equal(res.status, 404);
  assert.match(res.body.error, /slot not found/i);
});

test('Level 2: 400 if the slot has already started', async () => {
  const pastStart = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  const pastEnd = new Date(pastStart.getTime() + 30 * 60 * 1000);
  await Slot.create({
    _id: 'past-slot',
    id: 'past-slot',
    doctorName: 'Dr Past',
    provider: 'Dr Past',
    start: pastStart.toISOString(),
    startTime: pastStart,
    end: pastEnd.toISOString(),
    endTime: pastEnd,
    status: 'available',
    available: true,
  });

  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 'past-slot', name: 'John Doe', email: 'john@example.com' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /already started/i);
});

test('Level 2: trims spaces from name and email, and stores email in lower case', async () => {
  const slot = await createFutureSlot('s5');

  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slot_id: 's5',
      name: '   Jane Alice Doe   ',
      email: '   JANE.DOE@EXAMPLE.COM   ',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.name, 'Jane Alice Doe');
  assert.equal(res.body.email, 'jane.doe@example.com');

  const dbBooking = await Booking.findById(res.body.id);
  assert.equal(dbBooking.name, 'Jane Alice Doe');
  assert.equal(dbBooking.email, 'jane.doe@example.com');
});

// -----------------------------------------------------------------------------
// LEVEL 3 TESTS
// -----------------------------------------------------------------------------
test('Level 3: a slot that already has a confirmed booking returns 409', async () => {
  const slot = await createFutureSlot('s6');

  // First booking succeeds
  const firstRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 's6', name: 'First User', email: 'first@example.com' });
  assert.equal(firstRes.status, 201);

  // Second booking for the same slot returns 409
  const secondRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 's6', name: 'Second User', email: 'second@example.com' });
  assert.equal(secondRes.status, 409);
  assert.match(secondRes.body.error, /already has a confirmed booking|already booked/i);
});

test('Level 3: concurrency - when many requests arrive at the same moment, only ONE succeeds (201) and all others get 409', async () => {
  const slot = await createFutureSlot('concurrent-slot');

  const concurrentRequests = 10;
  const promises = [];

  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      request(app)
        .post('/bookings')
        .set('X-API-Key', API_KEY)
        .send({
          slot_id: 'concurrent-slot',
          name: `User ${i}`,
          email: `user${i}@example.com`,
        })
    );
  }

  const responses = await Promise.all(promises);

  const successResponses = responses.filter((r) => r.status === 201);
  const conflictResponses = responses.filter((r) => r.status === 409);

  assert.equal(successResponses.length, 1, 'Exactly one concurrent request must succeed with 201');
  assert.equal(conflictResponses.length, concurrentRequests - 1, 'All other concurrent requests must receive 409');

  // Verify only 1 booking exists in DB
  const bookingCount = await Booking.countDocuments({ slot_id: 'concurrent-slot', status: 'confirmed' });
  assert.equal(bookingCount, 1);
});

test('Level 3: booking cancellation - allows a cancelled booking to be re-booked', async () => {
  const slot = await createFutureSlot('cancel-slot');

  const bookRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 'cancel-slot', name: 'Alice', email: 'alice@example.com' });
  assert.equal(bookRes.status, 201);

  // Cancel booking
  const cancelRes = await request(app)
    .delete(`/bookings/${bookRes.body.id}`)
    .set('X-API-Key', API_KEY);
  assert.equal(cancelRes.status, 200);

  // Slot should now be available again
  const refreshedSlot = await Slot.findById('cancel-slot');
  assert.equal(refreshedSlot.status, 'available');
  assert.equal(refreshedSlot.available, true);

  // Re-booking should succeed
  const rebookRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ slot_id: 'cancel-slot', name: 'Bob', email: 'bob@example.com' });
  assert.equal(rebookRes.status, 201);
});

// -----------------------------------------------------------------------------
// LEVEL 4 TESTS (Idempotency)
// -----------------------------------------------------------------------------
test('Level 4: Idempotency-Key - same key with same body returns identical response and creates only 1 booking', async () => {
  const slot = await createFutureSlot('idemp-slot');
  const idempotencyKey = 'unique-key-12345';

  const payload = {
    slot_id: 'idemp-slot',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
  };

  // First request
  const res1 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .set('Idempotency-Key', idempotencyKey)
    .send(payload);

  assert.equal(res1.status, 201);
  const originalBookingId = res1.body.id;
  assert.ok(originalBookingId);

  // Retried request with the same key and same body
  const res2 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .set('Idempotency-Key', idempotencyKey)
    .send(payload);

  assert.equal(res2.status, 201);
  assert.equal(res2.body.id, originalBookingId);
  assert.equal(res2.body.name, 'Charlie Brown');

  // Verify only 1 booking was created
  const totalBookings = await Booking.countDocuments();
  assert.equal(totalBookings, 1);
});

test('Level 4: Idempotency-Key - same key with different body returns 422', async () => {
  const slot = await createFutureSlot('idemp-slot-2');
  const idempotencyKey = 'unique-key-67890';

  // First request
  const res1 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .set('Idempotency-Key', idempotencyKey)
    .send({
      slot_id: 'idemp-slot-2',
      name: 'Original Name',
      email: 'original@example.com',
    });

  assert.equal(res1.status, 201);

  // Second request with SAME key but DIFFERENT body
  const res2 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .set('Idempotency-Key', idempotencyKey)
    .send({
      slot_id: 'idemp-slot-2',
      name: 'Different Name',
      email: 'different@example.com',
    });

  assert.equal(res2.status, 422);
  assert.match(res2.body.error, /different request body|idempotency/i);
});

// -----------------------------------------------------------------------------
// LEVEL 5 TESTS (Rate Limiting)
// -----------------------------------------------------------------------------
test('Level 5: at most 5 attempts per email per minute (failed attempts included), 6th returns 429 with Retry-After header', async () => {
  const testEmail = 'limited@example.com';
  const otherEmail = 'other@example.com';

  // Make 5 attempts (some can even fail, e.g. non-existent slot)
  for (let i = 1; i <= 5; i++) {
    const res = await request(app)
      .post('/bookings')
      .set('X-API-Key', API_KEY)
      .send({
        slot_id: 'non-existent',
        name: 'Spammer',
        email: testEmail,
      });

    // Fails with 404, but counts as an attempt!
    assert.equal(res.status, 404);
  }

  // 6th attempt with same email must return 429 with Retry-After header
  const res6 = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slot_id: 'non-existent',
      name: 'Spammer',
      email: testEmail,
    });

  assert.equal(res6.status, 429);
  assert.match(res6.body.error, /too many/i);

  const retryAfter = res6.headers['retry-after'];
  assert.ok(retryAfter, 'Retry-After header must be present');
  const retryAfterSec = parseInt(retryAfter, 10);
  assert.ok(Number.isInteger(retryAfterSec) && retryAfterSec > 0 && retryAfterSec <= 60, 'Retry-After must be a whole second number <= 60');

  // Verify other emails aren't affected
  const otherSlot = await createFutureSlot('other-slot');
  const otherRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slot_id: 'other-slot',
      name: 'Normal User',
      email: otherEmail,
    });

  assert.equal(otherRes.status, 201);
});
