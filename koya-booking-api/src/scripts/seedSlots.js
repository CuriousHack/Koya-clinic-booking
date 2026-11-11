const { connectDB, disconnectDB } = require('../config/db');
const Slot = require('../modules/slots/slot.model');

async function seed() {
  try {
    await connectDB();
    console.log('[Seed] Connected to database, clearing existing slots...');
    await Slot.deleteMany({});

    const now = new Date();
    const slots = [];
    const clinicDoctors = [
      { name: 'Dr. Sarah Smith', service: 'General Consultation' },
      { name: 'Dr. Michael Chen', service: 'Pediatric Care' },
      { name: 'Dr. Emily Taylor', service: 'Cardiology Review' },
    ];

    // Seed slots for the next 5 days
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const slotDate = new Date(now);
      slotDate.setDate(slotDate.getDate() + dayOffset);

      // Skip Sundays
      if (slotDate.getDay() === 0) continue;

      // 4 slots per day (9:00, 10:30, 13:00, 14:30)
      const hours = [
        { h: 9, m: 0, dur: 45 },
        { h: 10, m: 30, dur: 45 },
        { h: 13, m: 0, dur: 45 },
        { h: 14, m: 30, dur: 45 },
      ];

      for (let i = 0; i < hours.length; i++) {
        const { h, m, dur } = hours[i];
        const startTime = new Date(slotDate);
        startTime.setHours(h, m, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + dur);

        const doctor = clinicDoctors[i % clinicDoctors.length];

        slots.push({
          startTime,
          endTime,
          doctorName: doctor.name,
          serviceType: doctor.service,
          status: 'available',
        });
      }
    }

    const created = await Slot.insertMany(slots);
    console.log(`[Seed] Successfully seeded ${created.length} clinic appointment slots!`);
  } catch (error) {
    console.error('[Seed] Error seeding slots:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
