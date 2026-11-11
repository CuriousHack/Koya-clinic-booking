const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const app = require('../src/app');
const Slot = require('../src/modules/slots/slot.model');
const Booking = require('../src/modules/bookings/booking.model');
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
});

test('Endpoint /reset: rejects request with missing X-API-Key header (401)', async () => {
  const res = await request(app)
    .post('/reset')
    .send({
      slots: [
        {
          id: 's1',
          provider: 'Dr Ade',
          start: '2026-12-10T09:00:00Z',
          end: '2026-12-10T09:30:00Z',
        },
      ],
    });

  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, 'string');
  assert.match(res.body.error, /Missing X-API-Key/i);
});

test('Endpoint /reset: rejects request with incorrect X-API-Key header (401)', async () => {
  const res = await request(app)
    .post('/reset')
    .set('X-API-Key', 'wrong-key-value')
    .send({
      slots: [
        {
          id: 's1',
          provider: 'Dr Ade',
          start: '2026-12-10T09:00:00Z',
          end: '2026-12-10T09:30:00Z',
        },
      ],
    });

  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, 'string');
  assert.match(res.body.error, /Invalid X-API-Key/i);
});

test('Endpoint /reset: wipes existing data and inserts new slots (allowing past dates)', async () => {
  // 1. Pre-seed some dummy slots and bookings
  const dummySlot = await Slot.create({
    _id: 'old-slot',
    id: 'old-slot',
    startTime: new Date('2025-01-01T10:00:00Z'),
    endTime: new Date('2025-01-01T10:30:00Z'),
    doctorName: 'Dr Old',
    status: 'booked',
  });

  await Booking.create({
    _id: 'old-booking',
    slotId: dummySlot._id,
    patientName: 'Old Patient',
    patientEmail: 'old@example.com',
    patientPhone: '111',
  });

  assert.equal(await Slot.countDocuments(), 1);
  assert.equal(await Booking.countDocuments(), 1);

  // 2. Call /reset with valid X-API-Key and payload containing past date
  const pastStart = '2020-05-10T09:00:00Z';
  const pastEnd = '2020-05-10T09:30:00Z';

  const res = await request(app)
    .post('/reset')
    .set('X-API-Key', API_KEY)
    .send({
      slots: [
        {
          id: 's1',
          provider: 'Dr Ade',
          start: pastStart,
          end: pastEnd,
        },
        {
          id: 's2',
          provider: 'Dr Ade',
          start: '2026-12-10T10:00:00Z',
          end: '2026-12-10T10:30:00Z',
        },
      ],
    });

  assert.equal(res.status, 200);
  assert.match(res.body.message, /Reset successful/i);

  // Old bookings and slots must be wiped
  assert.equal(await Booking.countDocuments(), 0);

  // New slots must be inserted
  assert.equal(await Slot.countDocuments(), 2);

  const insertedS1 = await Slot.findById('s1');
  assert.ok(insertedS1);
  assert.equal(insertedS1.id, 's1');
  assert.equal(insertedS1.provider, 'Dr Ade');
  assert.equal(insertedS1.start, pastStart);

  // 3. Test listing and booking the newly reset slot
  const slotsRes = await request(app)
    .get('/slots')
    .set('X-API-Key', API_KEY);
  assert.equal(slotsRes.status, 200);
  assert.equal(slotsRes.body.length, 2);

  // 3. Test booking past slot s1 fails with 400 (already started)
  const pastBookRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slot_id: 's1',
      name: 'Tunde Bakare',
      email: 'tunde@example.com',
    });
  assert.equal(pastBookRes.status, 400);
  assert.match(pastBookRes.body.error, /already started/i);

  // 4. Test booking future slot s2 succeeds with 201
  const bookRes = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slot_id: 's2',
      name: 'Tunde Bakare',
      email: 'tunde@example.com',
    });

  assert.equal(bookRes.status, 201);
  assert.equal(bookRes.body.name, 'Tunde Bakare');

  // Verify s2 is now booked and available is false
  const updatedS2 = await Slot.findById('s2');
  assert.equal(updatedS2.status, 'booked');
  assert.equal(updatedS2.available, false);
});
