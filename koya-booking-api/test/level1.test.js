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

test('Level 2 Global Auth: rejects requests without X-API-Key header (401)', async () => {
  const res = await request(app).get('/slots');
  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, 'string');
  assert.match(res.body.error, /Missing X-API-Key/i);
});

test('Level 2 Global Auth: rejects requests with invalid X-API-Key header (401)', async () => {
  const res = await request(app)
    .get('/slots')
    .set('X-API-Key', 'invalid-token-123');
  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, 'string');
  assert.match(res.body.error, /Invalid X-API-Key/i);
});

test('Level 1: Health check endpoint (with API Key)', async () => {
  const res = await request(app)
    .get('/health')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('Level 1: List slots - returns empty list when no slots exist', async () => {
  const res = await request(app)
    .get('/slots')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 0);
});

test('Level 1: List slots - returns available slots', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const slot1 = await Slot.create({
    _id: 's1',
    id: 's1',
    startTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
    endTime: new Date(tomorrow.setHours(9, 45, 0, 0)),
    doctorName: 'Dr. Sarah Smith',
    provider: 'Dr. Sarah Smith',
    serviceType: 'Consultation',
    status: 'available',
  });

  const slot2 = await Slot.create({
    _id: 's2',
    id: 's2',
    startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
    endTime: new Date(tomorrow.setHours(10, 45, 0, 0)),
    doctorName: 'Dr. Michael Chen',
    provider: 'Dr. Michael Chen',
    serviceType: 'Pediatric Care',
    status: 'booked',
  });

  // Default GET /slots returns available slots
  const res = await request(app)
    .get('/slots')
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, slot1.id);

  // GET /slots?status=all returns all slots
  const allRes = await request(app)
    .get('/slots?status=all')
    .set('X-API-Key', API_KEY);
  assert.equal(allRes.status, 200);
  assert.equal(allRes.body.length, 2);
});

test('Level 1: Book a slot - rejects request with missing fields', async () => {
  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({ patientName: 'Jane Doe' });

  assert.equal(res.status, 400);
  assert.equal(typeof res.body.error, 'string');
});

test('Level 1: Book a slot - rejects non-existent slot', async () => {
  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slotId: 'non-existent-slot',
      patientName: 'Jane Doe',
      patientEmail: 'jane@example.com',
      patientPhone: '1234567890',
    });

  assert.equal(res.status, 404);
  assert.match(res.body.error, /Slot not found/i);
});

test('Level 1: Book a slot - successful booking updates slot to booked', async () => {
  const now = new Date();
  const slot = await Slot.create({
    _id: 'slot-101',
    id: 'slot-101',
    startTime: new Date(now.getTime() + 3600000),
    endTime: new Date(now.getTime() + 7200000),
    doctorName: 'Dr. Emily Taylor',
    serviceType: 'Cardiology',
    status: 'available',
  });

  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slotId: slot.id,
      patientName: 'John Patient',
      patientEmail: 'john@example.com',
      patientPhone: '+1-555-0199',
      reason: 'Routine checkup',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.patientName, 'John Patient');
  assert.equal(res.body.patientEmail, 'john@example.com');
  assert.equal(res.body.status, 'confirmed');
  assert.ok(res.body.slotId);

  // Verify slot in DB is marked as booked
  const updatedSlot = await Slot.findById(slot.id);
  assert.equal(updatedSlot.status, 'booked');
});

test('Level 1: Book a slot - rejects booking already booked slot', async () => {
  const now = new Date();
  const slot = await Slot.create({
    _id: 'slot-102',
    id: 'slot-102',
    startTime: new Date(now.getTime() + 3600000),
    endTime: new Date(now.getTime() + 7200000),
    doctorName: 'Dr. Emily Taylor',
    serviceType: 'Cardiology',
    status: 'booked',
  });

  const res = await request(app)
    .post('/bookings')
    .set('X-API-Key', API_KEY)
    .send({
      slotId: slot.id,
      patientName: 'Another Patient',
      patientEmail: 'patient2@example.com',
      patientPhone: '+1-555-0200',
    });

  assert.equal(res.status, 409);
  assert.match(res.body.error, /already booked or unavailable/i);
});

test('Level 1: Look up a booking by ID', async () => {
  const now = new Date();
  const slot = await Slot.create({
    _id: 'slot-103',
    id: 'slot-103',
    startTime: new Date(now.getTime() + 3600000),
    endTime: new Date(now.getTime() + 7200000),
    doctorName: 'Dr. Sarah Smith',
    serviceType: 'Consultation',
    status: 'booked',
  });

  const booking = await Booking.create({
    _id: 'b-103',
    id: 'b-103',
    slotId: slot._id,
    patientName: 'Alice Johnson',
    patientEmail: 'alice@example.com',
    patientPhone: '+1-555-0300',
    reason: 'Follow-up appointment',
    status: 'confirmed',
  });

  // Valid lookup
  const res = await request(app)
    .get(`/bookings/${booking.id}`)
    .set('X-API-Key', API_KEY);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, booking.id);
  assert.equal(res.body.patientName, 'Alice Johnson');
  assert.equal(res.body.slotId.doctorName, 'Dr. Sarah Smith');

  // Non-existent ID lookup
  const notFoundRes = await request(app)
    .get('/bookings/non-existent-booking')
    .set('X-API-Key', API_KEY);
  assert.equal(notFoundRes.status, 404);
  assert.equal(typeof notFoundRes.body.error, 'string');
});
