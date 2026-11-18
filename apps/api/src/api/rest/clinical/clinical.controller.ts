import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { CLINICAL_USE_CASE, type ClinicalUseCase } from '../../../domain/ports/input';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class CreateRecordDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsString()
  @MinLength(2)
  chiefComplaint!: string;

  @IsOptional()
  @IsString()
  anamnesis?: string;

  @IsOptional()
  @IsObject()
  painMap?: { regions: Array<{ id: string; intensity: number; note?: string }> };

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScale?: number;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}

class SessionNoteDto {
  @IsUUID()
  appointmentId!: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsBoolean()
  markCompleted?: boolean;
}

@Controller('clinical')
@UseGuards(JwtAuthGuard)
export class ClinicalController {
  constructor(@Inject(CLINICAL_USE_CASE) private readonly clinical: ClinicalUseCase) {}

  @Get('patients/:patientId')
  async list(@Req() req: AuthenticatedRequest, @Param('patientId') patientId: string) {
    const result = await this.clinical.listRecords(req.user.clinicId, patientId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Get('patients/:patientId/session-notes')
  async listSessionNotes(
    @Req() req: AuthenticatedRequest,
    @Param('patientId') patientId: string,
  ) {
    const result = await this.clinical.listSessionNotes(req.user.clinicId, patientId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('records')
  async createRecord(@Req() req: AuthenticatedRequest, @Body() body: CreateRecordDto) {
    const result = await this.clinical.createRecord({
      clinicId: req.user.clinicId,
      patientId: body.patientId,
      professionalId: body.professionalId ?? req.user.sub,
      chiefComplaint: body.chiefComplaint,
      anamnesis: body.anamnesis,
      painMap: body.painMap,
      painScale: body.painScale,
      assessment: body.assessment,
      plan: body.plan,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('session-notes')
  async sessionNote(@Req() req: AuthenticatedRequest, @Body() body: SessionNoteDto) {
    const result = await this.clinical.upsertSessionNote({
      clinicId: req.user.clinicId,
      appointmentId: body.appointmentId,
      professionalId: body.professionalId ?? req.user.sub,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
      markCompleted: body.markCompleted,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
