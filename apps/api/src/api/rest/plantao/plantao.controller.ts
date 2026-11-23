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
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PLANTAO_USE_CASE, type PlantaoUseCase } from '../../../domain/ports/input';
import {
  CensusItemStatus,
  CensusPriority,
  DischargeDestination,
} from '../../../domain/entities';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class CreateHospitalDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  city?: string;
}

class CreateWardDto {
  @IsUUID()
  hospitalSiteId!: string;

  @IsString()
  @MinLength(1)
  name!: string;
}

class CreateBedDto {
  @IsUUID()
  wardId!: string;

  @IsString()
  @MinLength(1)
  code!: string;
}

class AdmitDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  hospitalSiteId!: string;

  @IsUUID()
  bedId!: string;

  @IsOptional()
  @IsString()
  hospitalMrn?: string;

  @IsOptional()
  @IsString()
  insuranceName?: string;

  @IsOptional()
  @IsDateString()
  admittedAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  responsiblePhysician?: string;

  @IsOptional()
  @IsDateString()
  expectedDischargeAt?: string;

  @IsOptional()
  @IsObject()
  precautions?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  mobilityLevel?: string;

  @IsOptional()
  @IsString()
  assistanceNeeded?: string;

  @IsOptional()
  @IsString()
  initialGoals?: string;
}

class TransferDto {
  @IsUUID()
  bedId!: string;
}

class UpdateAdmissionDto {
  @IsOptional()
  @IsString()
  hospitalMrn?: string | null;

  @IsOptional()
  @IsString()
  insuranceName?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsString()
  diagnosis?: string | null;

  @IsOptional()
  @IsString()
  responsiblePhysician?: string | null;

  @IsOptional()
  @IsDateString()
  expectedDischargeAt?: string | null;

  @IsOptional()
  @IsObject()
  precautions?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  mobilityLevel?: string | null;

  @IsOptional()
  @IsString()
  assistanceNeeded?: string | null;

  @IsOptional()
  @IsString()
  initialGoals?: string | null;

  @IsOptional()
  @IsString()
  openPending?: string | null;
}

class DischargeDto {
  @IsIn(Object.values(DischargeDestination))
  dischargeDestination!: DischargeDestination;

  @IsOptional()
  @IsDateString()
  dischargedAt?: string;

  @IsOptional()
  @IsString()
  dischargeSummary?: string;
}

class OpenShiftDto {
  @IsUUID()
  hospitalSiteId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  wardIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamUserIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateCensusDto {
  @IsOptional()
  @IsIn(['CRITICAL', 'WATCH', 'STABLE'])
  priority?: 'CRITICAL' | 'WATCH' | 'STABLE';

  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'DONE', 'CONTRAINDICATED', 'DISCHARGED_TODAY'])
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CONTRAINDICATED' | 'DISCHARGED_TODAY';

  @IsOptional()
  @IsString()
  notes?: string | null;
}

class CreateEncounterDto {
  @IsUUID()
  shiftId!: string;

  @IsUUID()
  admissionId!: string;

  @IsString()
  @MinLength(1)
  conduct!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsString()
  intercurrence?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScale?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  dyspneaScale?: number;

  @IsOptional()
  @IsString()
  mobilityAssist?: string;

  @IsOptional()
  @IsObject()
  precautionsUpdate?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  pendingForNext?: string;

  @IsOptional()
  @IsBoolean()
  markCensusDone?: boolean;
}

class HandoffDto {
  @IsOptional()
  @IsUUID()
  toUserId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('plantao')
@UseGuards(JwtAuthGuard)
export class PlantaoController {
  constructor(@Inject(PLANTAO_USE_CASE) private readonly plantao: PlantaoUseCase) {}

  @Get('hospitals')
  async listHospitals(@Req() req: AuthenticatedRequest) {
    return this.unwrap(await this.plantao.listHospitalSites(req.user.clinicId));
  }

  @Post('hospitals')
  async createHospital(@Req() req: AuthenticatedRequest, @Body() body: CreateHospitalDto) {
    return this.unwrap(
      await this.plantao.createHospitalSite({
        clinicId: req.user.clinicId,
        name: body.name,
        city: body.city,
      }),
    );
  }

  @Post('wards')
  async createWard(@Req() req: AuthenticatedRequest, @Body() body: CreateWardDto) {
    return this.unwrap(
      await this.plantao.createWard({
        clinicId: req.user.clinicId,
        hospitalSiteId: body.hospitalSiteId,
        name: body.name,
      }),
    );
  }

  @Post('beds')
  async createBed(@Req() req: AuthenticatedRequest, @Body() body: CreateBedDto) {
    return this.unwrap(
      await this.plantao.createBed({
        clinicId: req.user.clinicId,
        wardId: body.wardId,
        code: body.code,
      }),
    );
  }

  @Get('beds/free')
  async freeBeds(
    @Req() req: AuthenticatedRequest,
    @Query('hospitalSiteId') hospitalSiteId: string,
    @Query('wardId') wardId?: string,
  ) {
    return this.unwrap(
      await this.plantao.listFreeBeds(req.user.clinicId, hospitalSiteId, wardId || undefined),
    );
  }

  @Get('admissions')
  async listAdmissions(
    @Req() req: AuthenticatedRequest,
    @Query('hospitalSiteId') hospitalSiteId?: string,
    @Query('status') status?: 'ACTIVE' | 'DISCHARGED',
  ) {
    return this.unwrap(
      await this.plantao.listAdmissions(req.user.clinicId, hospitalSiteId, status),
    );
  }

  @Get('admissions/:id')
  async getAdmission(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.unwrap(await this.plantao.getAdmission(req.user.clinicId, id));
  }

  @Post('admissions')
  async admit(@Req() req: AuthenticatedRequest, @Body() body: AdmitDto) {
    return this.unwrap(
      await this.plantao.admit({
        clinicId: req.user.clinicId,
        patientId: body.patientId,
        hospitalSiteId: body.hospitalSiteId,
        bedId: body.bedId,
        hospitalMrn: body.hospitalMrn,
        insuranceName: body.insuranceName,
        admittedAt: body.admittedAt ? new Date(body.admittedAt) : undefined,
        reason: body.reason,
        diagnosis: body.diagnosis,
        responsiblePhysician: body.responsiblePhysician,
        expectedDischargeAt: body.expectedDischargeAt
          ? new Date(body.expectedDischargeAt)
          : undefined,
        precautions: body.precautions as never,
        mobilityLevel: body.mobilityLevel,
        assistanceNeeded: body.assistanceNeeded,
        initialGoals: body.initialGoals,
      }),
    );
  }

  @Patch('admissions/:id')
  async updateAdmission(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAdmissionDto,
  ) {
    return this.unwrap(
      await this.plantao.updateAdmission({
        clinicId: req.user.clinicId,
        admissionId: id,
        ...body,
        expectedDischargeAt:
          body.expectedDischargeAt === undefined
            ? undefined
            : body.expectedDischargeAt
              ? new Date(body.expectedDischargeAt)
              : null,
        precautions: body.precautions as never,
      }),
    );
  }

  @Post('admissions/:id/transfer')
  async transfer(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: TransferDto,
  ) {
    return this.unwrap(
      await this.plantao.transferBed({
        clinicId: req.user.clinicId,
        admissionId: id,
        bedId: body.bedId,
      }),
    );
  }

  @Post('admissions/:id/discharge')
  async discharge(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: DischargeDto,
  ) {
    return this.unwrap(
      await this.plantao.discharge({
        clinicId: req.user.clinicId,
        admissionId: id,
        dischargeDestination: body.dischargeDestination,
        dischargedAt: body.dischargedAt ? new Date(body.dischargedAt) : undefined,
        dischargeSummary: body.dischargeSummary,
      }),
    );
  }

  @Get('admissions/:id/encounters')
  async listEncounters(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.unwrap(await this.plantao.listEncountersByAdmission(req.user.clinicId, id));
  }

  @Get('shifts')
  async listShifts(
    @Req() req: AuthenticatedRequest,
    @Query('hospitalSiteId') hospitalSiteId?: string,
  ) {
    return this.unwrap(await this.plantao.listShifts(req.user.clinicId, hospitalSiteId));
  }

  @Get('shifts/open')
  async openShiftGet(
    @Req() req: AuthenticatedRequest,
    @Query('hospitalSiteId') hospitalSiteId?: string,
  ) {
    return this.unwrap(await this.plantao.getOpenShift(req.user.clinicId, hospitalSiteId));
  }

  @Get('shifts/:id')
  async getShift(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.unwrap(await this.plantao.getShift(req.user.clinicId, id));
  }

  @Post('shifts')
  async openShift(@Req() req: AuthenticatedRequest, @Body() body: OpenShiftDto) {
    return this.unwrap(
      await this.plantao.openShift({
        clinicId: req.user.clinicId,
        openedById: req.user.sub,
        hospitalSiteId: body.hospitalSiteId,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        wardIds: body.wardIds,
        teamUserIds: body.teamUserIds,
        notes: body.notes,
      }),
    );
  }

  @Patch('census/:id')
  async updateCensus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateCensusDto,
  ) {
    return this.unwrap(
      await this.plantao.updateCensusItem({
        clinicId: req.user.clinicId,
        itemId: id,
        priority: body.priority as CensusPriority | undefined,
        status: body.status as CensusItemStatus | undefined,
        notes: body.notes,
      }),
    );
  }

  @Post('encounters')
  async createEncounter(@Req() req: AuthenticatedRequest, @Body() body: CreateEncounterDto) {
    return this.unwrap(
      await this.plantao.createEncounter({
        clinicId: req.user.clinicId,
        shiftId: body.shiftId,
        admissionId: body.admissionId,
        professionalId: req.user.sub,
        conduct: body.conduct,
        tags: body.tags,
        response: body.response,
        intercurrence: body.intercurrence,
        painScale: body.painScale,
        dyspneaScale: body.dyspneaScale,
        mobilityAssist: body.mobilityAssist,
        precautionsUpdate: body.precautionsUpdate as never,
        pendingForNext: body.pendingForNext,
        markCensusDone: body.markCensusDone,
      }),
    );
  }

  @Post('shifts/:id/handoff')
  async handoff(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: HandoffDto,
  ) {
    return this.unwrap(
      await this.plantao.closeShiftWithHandoff({
        clinicId: req.user.clinicId,
        shiftId: id,
        fromUserId: req.user.sub,
        toUserId: body.toUserId,
        notes: body.notes,
      }),
    );
  }

  private unwrap<T>(result: { isErr: boolean; error?: { message: string }; value?: T }): T {
    if (result.isErr) {
      throw new HttpException(
        { message: result.error!.message },
        httpStatusFor(result.error as never),
      );
    }
    return result.value as T;
  }
}
