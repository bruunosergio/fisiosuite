import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  APPOINTMENT_USE_CASE,
  type AppointmentUseCase,
} from '../../../domain/ports/input';
import { AbsenceKind, AppointmentStatus } from '../../../domain/entities';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class CreateSeriesDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  professionalId!: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  weekdays!: number[];

  @IsString()
  startTime!: string;

  @IsInt()
  @Min(15)
  durationMinutes!: number;

  @IsDateString()
  firstDate!: string;

  @IsInt()
  @Min(1)
  occurrences!: number;
}

class TransitionDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @IsOptional()
  @IsEnum(AbsenceKind)
  absenceKind?: AbsenceKind;

  @IsOptional()
  @IsString()
  absenceNotes?: string;

  @IsOptional()
  @IsDateString()
  scheduleMakeupAt?: string;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(
    @Inject(APPOINTMENT_USE_CASE) private readonly appointments: AppointmentUseCase,
  ) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('professionalId') professionalId?: string,
    @Query('patientId') patientId?: string,
  ) {
    if (!from || !to) {
      throw new HttpException({ message: 'Informe from e to (ISO).' }, 400);
    }
    const result = await this.appointments.list({
      clinicId: req.user.clinicId,
      from: new Date(from),
      to: new Date(to),
      professionalId,
      patientId,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('series')
  async createSeries(@Req() req: AuthenticatedRequest, @Body() body: CreateSeriesDto) {
    const result = await this.appointments.createSeries({
      clinicId: req.user.clinicId,
      ...body,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Patch(':id/status')
  async transition(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: TransitionDto,
  ) {
    const result = await this.appointments.transition({
      clinicId: req.user.clinicId,
      appointmentId: id,
      status: body.status,
      absenceKind: body.absenceKind,
      absenceNotes: body.absenceNotes,
      scheduleMakeupAt: body.scheduleMakeupAt ? new Date(body.scheduleMakeupAt) : null,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('reminders')
  async reminders(
    @Req() req: AuthenticatedRequest,
    @Body() body: { withinHours?: number },
  ) {
    const result = await this.appointments.sendConfirmationReminders(
      req.user.clinicId,
      body.withinHours ?? 24,
    );
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return { sent: result.value };
  }
}
