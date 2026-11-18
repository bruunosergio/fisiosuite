import { Module } from '@nestjs/common';
import { DomainModule } from './domain.module';
import { InfraModule } from './infra.module';
import { AuthController } from '../../api/rest/auth/auth.controller';
import { PatientsController } from '../../api/rest/patients/patients.controller';
import { RoomsController } from '../../api/rest/rooms/rooms.controller';
import { PackagesController } from '../../api/rest/packages/packages.controller';
import { AppointmentsController } from '../../api/rest/appointments/appointments.controller';
import { ClinicalController } from '../../api/rest/clinical/clinical.controller';
import { FinanceController } from '../../api/rest/finance/finance.controller';
import { PlatformController } from '../../api/rest/platform/platform.controller';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { PlatformAuthGuard } from '../../api/guards/platform-auth.guard';
import { HealthController } from '../../api/rest/health.controller';

@Module({
  imports: [DomainModule, InfraModule],
  controllers: [
    HealthController,
    AuthController,
    PatientsController,
    RoomsController,
    PackagesController,
    AppointmentsController,
    ClinicalController,
    FinanceController,
    PlatformController,
  ],
  providers: [JwtAuthGuard, PlatformAuthGuard],
})
export class ApiModule {}
