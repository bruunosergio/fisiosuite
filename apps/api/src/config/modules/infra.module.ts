import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../infra/database/prisma.module';
import {
  PrismaAppointmentRepository,
  PrismaClinicRepository,
  PrismaClinicalRepository,
  PrismaPackageRepository,
  PrismaPatientRepository,
  PrismaPaymentRepository,
  PrismaRoomRepository,
  PrismaUserRepository,
} from '../../infra/repositories';
import {
  BcryptPasswordHasher,
  JwtTokenProvider,
  UuidIdGenerator,
} from '../../infra/security';
import { StubWhatsAppGateway } from '../../infra/whatsapp/stub-whatsapp.gateway';
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
} from '../../domain/ports/output';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '12h') },
      }),
    }),
  ],
  providers: [
    { provide: CLINIC_REPOSITORY, useClass: PrismaClinicRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PATIENT_REPOSITORY, useClass: PrismaPatientRepository },
    { provide: ROOM_REPOSITORY, useClass: PrismaRoomRepository },
    { provide: PACKAGE_REPOSITORY, useClass: PrismaPackageRepository },
    { provide: APPOINTMENT_REPOSITORY, useClass: PrismaAppointmentRepository },
    { provide: CLINICAL_REPOSITORY, useClass: PrismaClinicalRepository },
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_PROVIDER, useClass: JwtTokenProvider },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    { provide: WHATSAPP_GATEWAY, useClass: StubWhatsAppGateway },
  ],
  exports: [
    JwtModule,
    CLINIC_REPOSITORY,
    USER_REPOSITORY,
    PATIENT_REPOSITORY,
    ROOM_REPOSITORY,
    PACKAGE_REPOSITORY,
    APPOINTMENT_REPOSITORY,
    CLINICAL_REPOSITORY,
    PAYMENT_REPOSITORY,
    PASSWORD_HASHER,
    TOKEN_PROVIDER,
    ID_GENERATOR,
    WHATSAPP_GATEWAY,
  ],
})
export class InfraModule {}
