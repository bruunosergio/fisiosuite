import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@fisiosuite.demo';
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log('Seed já aplicado (admin@fisiosuite.demo existe).');
    return;
  }

  const clinicId = randomUUID();
  const adminId = randomUUID();
  const physioId = randomUUID();
  const roomId = randomUUID();
  const patientId = randomUUID();
  const planId = randomUUID();
  const packageId = randomUUID();
  const now = new Date();

  await prisma.clinic.create({
    data: {
      id: clinicId,
      name: 'Clínica Movimento Demo',
      phone: '11999990000',
      absenceNoticeHours: 24,
      justifiedDebitsPackage: false,
      unjustifiedDebitsPackage: true,
      commissionOnNoShow: false,
      commissionOnMakeup: false,
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  await prisma.user.createMany({
    data: [
      {
        id: adminId,
        clinicId,
        name: 'Ana Admin',
        email,
        passwordHash,
        role: Role.ADMIN,
      },
      {
        id: physioId,
        clinicId,
        name: 'Paula Fisioterapeuta',
        email: 'paula@fisiosuite.demo',
        passwordHash: await bcrypt.hash('Fisio@123', 10),
        role: Role.PROFESSIONAL,
        commissionPct: 40,
      },
    ],
  });

  await prisma.room.create({
    data: { id: roomId, clinicId, name: 'Sala 1', capacity: 1 },
  });

  await prisma.patient.create({
    data: {
      id: patientId,
      clinicId,
      name: 'João Paciente',
      phone: '11988887777',
      whatsapp: '11988887777',
    },
  });

  await prisma.packagePlan.create({
    data: {
      id: planId,
      clinicId,
      name: 'Pacote 10 sessões',
      sessionCount: 10,
      priceCents: 120000,
      validityDays: 90,
    },
  });

  await prisma.patientPackage.create({
    data: {
      id: packageId,
      clinicId,
      patientId,
      planId,
      totalSessions: 10,
      usedSessions: 0,
      priceCents: 120000,
      expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.create({
    data: {
      id: randomUUID(),
      clinicId,
      patientId,
      packageId,
      amountCents: 120000,
      method: 'PIX',
      status: 'PAID',
      paidAt: now,
      notes: 'Seed — pacote inicial',
    },
  });

  // Série: próximas 4 segundas às 09:00
  const seriesId = randomUUID();
  const appointments = [];
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  while (appointments.length < 4) {
    if (d.getDay() === 1) {
      const startsAt = new Date(d);
      startsAt.setHours(9, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 50 * 60_000);
      appointments.push({
        id: randomUUID(),
        clinicId,
        patientId,
        professionalId: physioId,
        roomId,
        packageId,
        startsAt,
        endsAt,
        status: 'SCHEDULED' as const,
        seriesId,
      });
    }
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  await prisma.appointment.createMany({ data: appointments });

  console.log('Seed OK');
  console.log('  Login: admin@fisiosuite.demo / Admin@123');
  console.log('  Fisio: paula@fisiosuite.demo / Fisio@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
