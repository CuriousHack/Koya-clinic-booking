const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const app = require('../src/app');
const Slot = require('../src/modules/slots/slot.model');
const Booking = require('../src/modules/bookings/booking.model');
const { clearAttempts } = require('../src/middleware/rateLimiter');
const { API_KEY } = require('../src/config/env');

let mongod;

test.before(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test.beforeEach(async () => {
  await Slot.deleteMany({});
  await Booking.deleteMany({});
  clearAttempts();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a slot that starts N hours from now */
async function makeSlot(id, hoursFromNow = 2) {
  const start = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const end   = new Date(start.getTime() + 30 * 60 * 1000);
  return Slot.create({
    _id: id, id,
    doctorName: 'Dr Test', provider: 'Dr Test',
    startTime: start, start: start.toISOString(),
    endTime: end,   end: end.toISOString(),
    status: 'available', available: true,
  });
}

/** Directly insert a booking record (bypasses slot checks) */
async function insertBooking({ id, slot_id, name, email, createdAt }) {
  const doc = new Booking({
    _id: id, id,
    slot_id, slotId: slot_id,
    name, patientName: name,
    email: email.toLowerCase(), patientEmail: email.toLowerCase(),
    status: 'confirmed',
  });
  if (createdAt) {
    doc.createdAt = createdAt;
    doc.updatedAt = createdAt;
  }
  return doc.save();
}

// ---------------------------------------------------------------------------
// GET /bookings - basic requirements
// ---------------------------------------------------------------------------

test('GET /bookings: 400 when email is missing', async () => {
  const res = await request(app)
    .get('/bookings')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /email/i);
});

test('GET /bookings: 400 when email is blank string', async () => {
  const res = await request(app)
    .get('/bookings?email=   ')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /email/i);
});

test('GET /bookings: 400 when limit is 0', async () => {
  const res = await request(app)
    .get('/bookings?email=x@x.com&limit=0')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /limit/i);
});

test('GET /bookings: 400 when limit is 51', async () => {
  const res = await request(app)
    .get('/bookings?email=x@x.com&limit=51')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /limit/i);
});

test('GET /bookings: 400 when limit is not a number', async () => {
  const res = await request(app)
    .get('/bookings?email=x@x.com&limit=abc')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /limit/i);
});

test('GET /bookings: returns empty list with correct shape when no bookings', async () => {
  const res = await request(app)
    .get('/bookings?email=nobody@example.com')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.bookings));
  assert.equal(res.body.bookings.length, 0);
  assert.equal(res.body.next_cursor, null);
});

// ---------------------------------------------------------------------------
// GET /bookings - response shape
// ---------------------------------------------------------------------------

test('GET /bookings: returns correct booking shape (id, slot_id, name, email, status, created_at)', async () => {
  await insertBooking({ id: 'b1', slot_id: 's1', name: 'Ada Obi', email: 'ada@example.com' });

  const res = await request(app)
    .get('/bookings?email=ada@example.com')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 200);
  assert.equal(res.body.bookings.length, 1);

  const b = res.body.bookings[0];
  assert.equal(typeof b.id, 'string');
  assert.equal(b.slot_id, 's1');
  assert.equal(b.name, 'Ada Obi');
  assert.equal(b.email, 'ada@example.com');
  assert.equal(b.status, 'confirmed');
  assert.match(b.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // ISO 8601
});

// ---------------------------------------------------------------------------
// GET /bookings - email matching
// ---------------------------------------------------------------------------

test('GET /bookings: email match ignores case', async () => {
  await insertBooking({ id: 'b2', slot_id: 's2', name: 'Ada Obi', email: 'ada@example.com' });

  // Query with uppercase version of the email
  const res = await request(app)
    .get('/bookings?email=ADA@EXAMPLE.COM')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 200);
  assert.equal(res.body.bookings.length, 1);
  assert.equal(res.body.bookings[0].email, 'ada@example.com');
});

test('GET /bookings: does not return bookings belonging to other emails', async () => {
  await insertBooking({ id: 'b3', slot_id: 's3', name: 'Ada Obi',   email: 'ada@example.com' });
  await insertBooking({ id: 'b4', slot_id: 's4', name: 'Other User', email: 'other@example.com' });

  const res = await request(app)
    .get('/bookings?email=ada@example.com')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 200);
  assert.equal(res.body.bookings.length, 1);
  assert.equal(res.body.bookings[0].id, 'b3');
});

// ---------------------------------------------------------------------------
// GET /bookings - ordering (oldest first)
// ---------------------------------------------------------------------------

test('GET /bookings: returns bookings oldest first', async () => {
  const t1 = new Date('2026-11-01T10:00:00.000Z');
  const t2 = new Date('2026-11-02T10:00:00.000Z');
  const t3 = new Date('2026-11-03T10:00:00.000Z');

  await insertBooking({ id: 'b-old',    slot_id: 'sa', name: 'Ada', email: 'ada@example.com', createdAt: t1 });
  await insertBooking({ id: 'b-middle', slot_id: 'sb', name: 'Ada', email: 'ada@example.com', createdAt: t2 });
  await insertBooking({ id: 'b-new',    slot_id: 'sc', name: 'Ada', email: 'ada@example.com', createdAt: t3 });

  const res = await request(app)
    .get('/bookings?email=ada@example.com')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 200);
  const ids = res.body.bookings.map(b => b.id);
  assert.deepEqual(ids, ['b-old', 'b-middle', 'b-new']);
});

// ---------------------------------------------------------------------------
// GET /bookings - default limit
// ---------------------------------------------------------------------------

test('GET /bookings: defaults to limit=10 when not specified', async () => {
  // Insert 15 bookings for the same user
  const base = new Date('2026-11-01T08:00:00.000Z');
  for (let i = 0; i < 15; i++) {
    await insertBooking({
      id: `bdef-${i}`,
      slot_id: `sdef-${i}`,
      name: 'Default User',
      email: 'default@example.com',
      createdAt: new Date(base.getTime() + i * 60000),
    });
  }

  const res = await request(app)
    .get('/bookings?email=default@example.com')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 200);
  assert.equal(res.body.bookings.length, 10);
  assert.notEqual(res.body.next_cursor, null);
});

// ---------------------------------------------------------------------------
// GET /bookings - cursor pagination
// ---------------------------------------------------------------------------

test('GET /bookings: cursor pagination walks all pages exactly', async () => {
  // Insert 7 bookings; with limit=3 we expect pages of 3, 3, 1
  const base = new Date('2026-11-01T09:00:00.000Z');
  const expectedIds = [];
  for (let i = 0; i < 7; i++) {
    const id = `bpag-${i}`;
    expectedIds.push(id);
    await insertBooking({
      id,
      slot_id: `spag-${i}`,
      name: 'Pager',
      email: 'pager@example.com',
      createdAt: new Date(base.getTime() + i * 60000),
    });
  }

  const collected = [];
  let cursor = undefined;

  for (let page = 0; page < 10; page++) {   // safety cap
    const url = cursor
      ? `/bookings?email=pager@example.com&limit=3&cursor=${encodeURIComponent(cursor)}`
      : '/bookings?email=pager@example.com&limit=3';

    const res = await request(app)
      .get(url)
      .set('X-API-Key', API_KEY);

    assert.equal(res.status, 200);
    collected.push(...res.body.bookings.map(b => b.id));
    cursor = res.body.next_cursor;
    if (cursor === null) break;
  }

  // All 7 bookings must be returned in insertion (oldest-first) order
  assert.deepEqual(collected, expectedIds);
});

test('GET /bookings: last page has next_cursor: null', async () => {
  await insertBooking({ id: 'blast-1', slot_id: 'sl1', name: 'Last', email: 'last@example.com' });
  await insertBooking({ id: 'blast-2', slot_id: 'sl2', name: 'Last', email: 'last@example.com' });

  // limit=5, only 2 records → last page
  const res = await request(app)
    .get('/bookings?email=last@example.com&limit=5')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 200);
  assert.equal(res.body.bookings.length, 2);
  assert.equal(res.body.next_cursor, null);
});

test('GET /bookings: 400 on malformed cursor string', async () => {
  const res = await request(app)
    .get('/bookings?email=x@x.com&cursor=not-valid-base64-cursor!!!')
    .set('X-API-Key', API_KEY);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /invalid cursor/i);
});
