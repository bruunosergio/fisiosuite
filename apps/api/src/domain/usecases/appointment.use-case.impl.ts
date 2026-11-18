import { Result } from '../core/result';
import type { Failure } from '../failures';
import {
  ConflictFailure,
  NotFoundFailure,
  ValidationFailure,
} from '../failures';
import {
  AbsenceKind,
  AppointmentStatus,
  PackageStatus,
  type Appointment,
} from '../entities';
import {
  isJustifiedByNotice,
  shouldDebitPackage,
} from '../services/package-debit.policy';
import type {
  AppointmentUseCase,
  CreateSeriesCommand,
  ListAppointmentsQuery,
  TransitionAppointmentCommand,
} from '../ports/input/appointment.use-case';
import type {
  AppointmentRepository,
  ClinicRepository,
  IdGeneratorPort,
  PackageRepository,
  PatientRepository,
  RoomRepository,
  UserRepository,
  WhatsAppGateway,
} from '../ports/output';

function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  return { hours: h, minutes: m ?? 0 };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export class AppointmentUseCaseImpl implements AppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clinics: ClinicRepository,
    private readonly patients: PatientRepository,
    private readonly users: UserRepository,
    private readonly rooms: RoomRepository,
    private readonly packages: PackageRepository,
    private readonly whatsapp: WhatsAppGateway,
    private readonly ids: IdGeneratorPort,
  ) {}

  async createSeries(cmd: CreateSeriesCommand): Promise<Result<Appointment[], Failure>> {
    if (!cmd.weekdays?.length || cmd.occurrences < 1) {
      return Result.error(
        new ValidationFailure('Informe dias da semana e quantidade de ocorrências.'),
      );
    }
    if (cmd.durationMinutes < 15) {
      return Result.error(new ValidationFailure('Duração mínima de 15 minutos.'));
    }

    const patient = await this.patients.findById(cmd.clinicId, cmd.patientId);
    if (!patient) return Result.error(new NotFoundFailure('Paciente', cmd.patientId));

    const professional = await this.users.findById(cmd.clinicId, cmd.professionalId);
    if (!professional) {
      return Result.error(new NotFoundFailure('Profissional', cmd.professionalId));
    }

    if (cmd.roomId) {
      const room = await this.rooms.findById(cmd.clinicId, cmd.roomId);
      if (!room) return Result.error(new NotFoundFailure('Sala', cmd.roomId));
    }

    if (cmd.packageId) {
      const pkg = await this.packages.findPatientPackage(cmd.clinicId, cmd.packageId);
      if (!pkg || pkg.status !== PackageStatus.ACTIVE) {
        return Result.error(new ValidationFailure('Pacote inválido ou inativo.'));
      }
    }

    const { hours, minutes } = parseTime(cmd.startTime);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return Result.error(new ValidationFailure('Horário inválido. Use HH:mm.'));
    }

    const firstDate = new Date(`${cmd.firstDate}T00:00:00`);
    if (Number.isNaN(firstDate.getTime())) {
      return Result.error(new ValidationFailure('Data inicial inválida.'));
    }

    const seriesId = this.ids.generate();
    const weekdaySet = new Set(cmd.weekdays);
    const created: Appointment[] = [];
    let cursor = firstDate;
    let guard = 0;

    while (created.length < cmd.occurrences && guard < 800) {
      guard += 1;
      if (weekdaySet.has(cursor.getDay())) {
        const startsAt = new Date(cursor);
        startsAt.setHours(hours, minutes, 0, 0);
        const endsAt = new Date(startsAt.getTime() + cmd.durationMinutes * 60_000);

        const conflicts = await this.appointments.findConflicts({
          clinicId: cmd.clinicId,
          professionalId: cmd.professionalId,
          roomId: cmd.roomId ?? null,
          startsAt,
          endsAt,
        });
        if (conflicts.length > 0) {
          return Result.error(
            new ConflictFailure(
              `Conflito de agenda em ${startsAt.toISOString()} (profissional ou sala ocupados).`,
            ),
          );
        }

        const now = new Date();
        created.push({
          id: this.ids.generate(),
          clinicId: cmd.clinicId,
          patientId: cmd.patientId,
          professionalId: cmd.professionalId,
          roomId: cmd.roomId ?? null,
          packageId: cmd.packageId ?? null,
          startsAt,
          endsAt,
          status: AppointmentStatus.SCHEDULED,
          seriesId,
          makeupOfId: null,
          absenceKind: null,
          absenceNotes: null,
          packageDebited: false,
          confirmationSentAt: null,
          confirmedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      }
      cursor = addDays(cursor, 1);
    }

    if (created.length === 0) {
      return Result.error(
        new ValidationFailure('Nenhuma sessão gerada. Verifique dias da semana e data inicial.'),
      );
    }

    return Result.ok(await this.appointments.createMany(created));
  }

  async list(query: ListAppointmentsQuery): Promise<Result<Appointment[], Failure>> {
    const items = await this.appointments.list({
      clinicId: query.clinicId,
      from: query.from,
      to: query.to,
      professionalId: query.professionalId,
      patientId: query.patientId,
    });
    return Result.ok(items);
  }

  async transition(cmd: TransitionAppointmentCommand): Promise<Result<Appointment, Failure>> {
    const clinic = await this.clinics.findById(cmd.clinicId);
    if (!clinic) return Result.error(new NotFoundFailure('Clínica', cmd.clinicId));

    const appt = await this.appointments.findById(cmd.clinicId, cmd.appointmentId);
    if (!appt) return Result.error(new NotFoundFailure('Agendamento', cmd.appointmentId));

    if (
      appt.status === AppointmentStatus.CANCELLED ||
      appt.status === AppointmentStatus.COMPLETED
    ) {
      if (cmd.status !== appt.status) {
        return Result.error(
          new ValidationFailure(`Agendamento já está ${appt.status} e não pode mudar.`),
        );
      }
    }

    let absenceKind = cmd.absenceKind ?? null;
    if (cmd.status === AppointmentStatus.NO_SHOW && !absenceKind) {
      const justified = isJustifiedByNotice({
        startsAt: appt.startsAt,
        cancelledAt: new Date(),
        noticeHours: clinic.absenceNoticeHours,
      });
      absenceKind = justified ? AbsenceKind.JUSTIFIED : AbsenceKind.UNJUSTIFIED;
    }

    const debit = shouldDebitPackage({
      clinic,
      previousStatus: appt.status,
      nextStatus: cmd.status,
      absenceKind,
      alreadyDebited: appt.packageDebited,
      isMakeup: Boolean(appt.makeupOfId),
    });

    if (debit && appt.packageId) {
      const pkg = await this.packages.findPatientPackage(cmd.clinicId, appt.packageId);
      if (!pkg) {
        return Result.error(new NotFoundFailure('Pacote', appt.packageId));
      }
      if (pkg.usedSessions >= pkg.totalSessions) {
        return Result.error(new ValidationFailure('Pacote sem saldo de sessões.'));
      }
      const usedSessions = pkg.usedSessions + 1;
      await this.packages.updatePatientPackage({
        ...pkg,
        usedSessions,
        status:
          usedSessions >= pkg.totalSessions ? PackageStatus.EXHAUSTED : PackageStatus.ACTIVE,
        updatedAt: new Date(),
      });
    }

    const updated: Appointment = {
      ...appt,
      status: cmd.status,
      absenceKind: cmd.status === AppointmentStatus.NO_SHOW ? absenceKind : appt.absenceKind,
      absenceNotes: cmd.absenceNotes ?? appt.absenceNotes,
      packageDebited: debit ? true : appt.packageDebited,
      confirmedAt:
        cmd.status === AppointmentStatus.CONFIRMED ? new Date() : appt.confirmedAt,
      updatedAt: new Date(),
    };

    const saved = await this.appointments.update(updated);

    if (cmd.status === AppointmentStatus.NO_SHOW && cmd.scheduleMakeupAt) {
      const duration = appt.endsAt.getTime() - appt.startsAt.getTime();
      const makeupStarts = cmd.scheduleMakeupAt;
      const makeupEnds = new Date(makeupStarts.getTime() + duration);
      const now = new Date();
      await this.appointments.createMany([
        {
          id: this.ids.generate(),
          clinicId: appt.clinicId,
          patientId: appt.patientId,
          professionalId: appt.professionalId,
          roomId: appt.roomId,
          packageId: appt.packageId,
          startsAt: makeupStarts,
          endsAt: makeupEnds,
          status: AppointmentStatus.SCHEDULED,
          seriesId: appt.seriesId,
          makeupOfId: appt.id,
          absenceKind: null,
          absenceNotes: null,
          packageDebited: false,
          confirmationSentAt: null,
          confirmedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    return Result.ok(saved);
  }

  async sendConfirmationReminders(
    clinicId: string,
    withinHours: number,
  ): Promise<Result<number, Failure>> {
    const now = new Date();
    const to = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    const list = await this.appointments.list({ clinicId, from: now, to });
    let sent = 0;

    for (const appt of list) {
      if (
        appt.status !== AppointmentStatus.SCHEDULED &&
        appt.status !== AppointmentStatus.CONFIRMED
      ) {
        continue;
      }
      if (appt.confirmationSentAt) continue;

      const patient = await this.patients.findById(clinicId, appt.patientId);
      const toPhone = patient?.whatsapp || patient?.phone;
      if (!toPhone) continue;

      const when = appt.startsAt.toLocaleString('pt-BR');
      await this.whatsapp.send({
        to: toPhone,
        appointmentId: appt.id,
        body: `Olá ${patient?.name ?? ''}! Lembrete FisioSuite: sua sessão é em ${when}. Responda CONFIRMAR ou REMARCAR.`,
      });

      await this.appointments.update({
        ...appt,
        confirmationSentAt: new Date(),
        updatedAt: new Date(),
      });
      sent += 1;
    }

    return Result.ok(sent);
  }
}
