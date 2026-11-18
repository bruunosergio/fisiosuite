import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfraModule } from './infra.module';
import {
  APPOINTMENT_USE_CASE,
  AUTH_USE_CASE,
  CLINICAL_USE_CASE,
  FINANCE_USE_CASE,
  PACKAGE_USE_CASE,
  PATIENT_USE_CASE,
  PLATFORM_USE_CASE,
  ROOM_USE_CASE,
} from '../../domain/ports/input';
import {
  APPOINTMENT_REPOSITORY,
  CLINIC_REPOSITORY,
  CLINICAL_REPOSITORY,
  ID_GENERATOR,
  PACKAGE_REPOSITORY,
  PASSWORD_HASHER,
  PATIENT_REPOSITORY,
  PAYMENT_REPOSITORY,
  ROOM_REPOSITORY,
  TOKEN_PROVIDER,
  USER_REPOSITORY,
  WHATSAPP_GATEWAY,
  type AppointmentRepository,
  type ClinicRepository,
  type ClinicalRepository,
  type IdGeneratorPort,
  type PackageRepository,
  type PasswordHasherPort,
  type PatientRepository,
  type PaymentRepository,
  type RoomRepository,
  type TokenPort,
  type UserRepository,
  type WhatsAppGateway,
} from '../../domain/ports/output';
import {
  AppointmentUseCaseImpl,
  AuthUseCaseImpl,
  ClinicalUseCaseImpl,
  FinanceUseCaseImpl,
  PackageUseCaseImpl,
  PatientUseCaseImpl,
  PlatformUseCaseImpl,
  RoomUseCaseImpl,
} from '../../domain/usecases';
import type { AppointmentUseCase } from '../../domain/ports/input';

@Module({
  imports: [InfraModule],
  providers: [
    {
      provide: AUTH_USE_CASE,
      useFactory: (
        users: UserRepository,
        clinics: ClinicRepository,
        hasher: PasswordHasherPort,
        tokens: TokenPort,
        ids: IdGeneratorPort,
      ) => new AuthUseCaseImpl(users, clinics, hasher, tokens, ids),
      inject: [USER_REPOSITORY, CLINIC_REPOSITORY, PASSWORD_HASHER, TOKEN_PROVIDER, ID_GENERATOR],
    },
    {
      provide: PATIENT_USE_CASE,
      useFactory: (patients: PatientRepository, ids: IdGeneratorPort) =>
        new PatientUseCaseImpl(patients, ids),
      inject: [PATIENT_REPOSITORY, ID_GENERATOR],
    },
    {
      provide: ROOM_USE_CASE,
      useFactory: (rooms: RoomRepository, ids: IdGeneratorPort) =>
        new RoomUseCaseImpl(rooms, ids),
      inject: [ROOM_REPOSITORY, ID_GENERATOR],
    },
    {
      provide: PACKAGE_USE_CASE,
      useFactory: (
        packages: PackageRepository,
        patients: PatientRepository,
        payments: PaymentRepository,
        ids: IdGeneratorPort,
      ) => new PackageUseCaseImpl(packages, patients, payments, ids),
      inject: [PACKAGE_REPOSITORY, PATIENT_REPOSITORY, PAYMENT_REPOSITORY, ID_GENERATOR],
    },
    {
      provide: APPOINTMENT_USE_CASE,
      useFactory: (
        appointments: AppointmentRepository,
        clinics: ClinicRepository,
        patients: PatientRepository,
        users: UserRepository,
        rooms: RoomRepository,
        packages: PackageRepository,
        whatsapp: WhatsAppGateway,
        ids: IdGeneratorPort,
      ) =>
        new AppointmentUseCaseImpl(
          appointments,
          clinics,
          patients,
          users,
          rooms,
          packages,
          whatsapp,
          ids,
        ),
      inject: [
        APPOINTMENT_REPOSITORY,
        CLINIC_REPOSITORY,
        PATIENT_REPOSITORY,
        USER_REPOSITORY,
        ROOM_REPOSITORY,
        PACKAGE_REPOSITORY,
        WHATSAPP_GATEWAY,
        ID_GENERATOR,
      ],
    },
    {
      provide: CLINICAL_USE_CASE,
      useFactory: (
        clinical: ClinicalRepository,
        patients: PatientRepository,
        appointments: AppointmentRepository,
        appointmentUseCase: AppointmentUseCase,
        ids: IdGeneratorPort,
      ) =>
        new ClinicalUseCaseImpl(clinical, patients, appointments, appointmentUseCase, ids),
      inject: [
        CLINICAL_REPOSITORY,
        PATIENT_REPOSITORY,
        APPOINTMENT_REPOSITORY,
        APPOINTMENT_USE_CASE,
        ID_GENERATOR,
      ],
    },
    {
      provide: FINANCE_USE_CASE,
      useFactory: (
        payments: PaymentRepository,
        appointments: AppointmentRepository,
        users: UserRepository,
        clinics: ClinicRepository,
        packages: PackageRepository,
        ids: IdGeneratorPort,
      ) =>
        new FinanceUseCaseImpl(payments, appointments, users, clinics, packages, ids),
      inject: [
        PAYMENT_REPOSITORY,
        APPOINTMENT_REPOSITORY,
        USER_REPOSITORY,
        CLINIC_REPOSITORY,
        PACKAGE_REPOSITORY,
        ID_GENERATOR,
      ],
    },
    {
      provide: PLATFORM_USE_CASE,
      useFactory: (
        clinics: ClinicRepository,
        users: UserRepository,
        tokens: TokenPort,
        config: ConfigService,
      ) => {
        const email = config.get<string>('PLATFORM_ADMIN_EMAIL');
        const password = config.get<string>('PLATFORM_ADMIN_PASSWORD');
        const name = config.get<string>('PLATFORM_ADMIN_NAME', 'Admin Plataforma');
        const credentials =
          email && password
            ? { email, password, name: name || 'Admin Plataforma' }
            : null;
        return new PlatformUseCaseImpl(clinics, users, tokens, credentials);
      },
      inject: [CLINIC_REPOSITORY, USER_REPOSITORY, TOKEN_PROVIDER, ConfigService],
    },
  ],
  exports: [
    AUTH_USE_CASE,
    PATIENT_USE_CASE,
    ROOM_USE_CASE,
    PACKAGE_USE_CASE,
    APPOINTMENT_USE_CASE,
    CLINICAL_USE_CASE,
    FINANCE_USE_CASE,
    PLATFORM_USE_CASE,
  ],
})
export class DomainModule {}
