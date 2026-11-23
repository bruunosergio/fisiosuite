/**
 * Zera dados operacionais da clínica demo, mantendo clínica e usuários.
 * Uso: railway run npx ts-node prisma/reset-demo-clinic-data.ts
 *   ou: DATABASE_URL=... npx ts-node prisma/reset-demo-clinic-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ADMIN_EMAIL = 'admin@fisiosuite.demo';

async function main() {
  const admin = await prisma.user.findFirst({
    where: { email: DEMO_ADMIN_EMAIL },
    select: { clinicId: true, clinic: { select: { name: true } } },
  });

  if (!admin) {
    throw new Error(`Clínica demo não encontrada (sem ${DEMO_ADMIN_EMAIL}).`);
  }

  const clinicId = admin.clinicId;
  console.log(`Limpando clínica: ${admin.clinic.name} (${clinicId})`);

  const notes = await prisma.sessionNote.deleteMany({
    where: { appointment: { clinicId } },
  });
  const appointments = await prisma.appointment.deleteMany({ where: { clinicId } });
  const clinical = await prisma.clinicalRecord.deleteMany({ where: { clinicId } });
  const payments = await prisma.payment.deleteMany({ where: { clinicId } });
  const patientPackages = await prisma.patientPackage.deleteMany({ where: { clinicId } });
  const patients = await prisma.patient.deleteMany({ where: { clinicId } });
  const plans = await prisma.packagePlan.deleteMany({ where: { clinicId } });
  const rooms = await prisma.room.deleteMany({ where: { clinicId } });
  const holidays = await prisma.holiday.deleteMany({ where: { clinicId } });

  const usersLeft = await prisma.user.count({ where: { clinicId } });

  console.log('Removido:');
  console.log(`  session_notes: ${notes.count}`);
  console.log(`  appointments: ${appointments.count}`);
  console.log(`  clinical_records: ${clinical.count}`);
  console.log(`  payments: ${payments.count}`);
  console.log(`  patient_packages: ${patientPackages.count}`);
  console.log(`  patients: ${patients.count}`);
  console.log(`  package_plans: ${plans.count}`);
  console.log(`  rooms: ${rooms.count}`);
  console.log(`  holidays: ${holidays.count}`);
  console.log(`Usuários preservados: ${usersLeft}`);
  console.log('OK — clínica e usuários intactos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
