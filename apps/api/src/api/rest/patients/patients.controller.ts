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
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PATIENT_USE_CASE, type PatientUseCase } from '../../../domain/ports/input';
import { BiologicalSex } from '../../../domain/entities';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class UpsertPatientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(BiologicalSex)
  biologicalSex?: BiologicalSex;

  @IsOptional()
  @IsString()
  allergiesSummary?: string;

  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(@Inject(PATIENT_USE_CASE) private readonly patients: PatientUseCase) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('q') q?: string) {
    const result = q
      ? await this.patients.search(req.user.clinicId, q)
      : await this.patients.list(req.user.clinicId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Get(':id')
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const result = await this.patients.getById(req.user.clinicId, id);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: UpsertPatientDto) {
    const result = await this.patients.create({
      clinicId: req.user.clinicId,
      name: body.name,
      phone: body.phone,
      whatsapp: body.whatsapp,
      email: body.email,
      cpf: body.cpf,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      biologicalSex: body.biologicalSex,
      allergiesSummary: body.allergiesSummary,
      dietaryRestrictions: body.dietaryRestrictions,
      notes: body.notes,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpsertPatientDto,
  ) {
    const result = await this.patients.update({
      id,
      clinicId: req.user.clinicId,
      name: body.name,
      phone: body.phone,
      whatsapp: body.whatsapp,
      email: body.email,
      cpf: body.cpf,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      biologicalSex: body.biologicalSex,
      allergiesSummary: body.allergiesSummary,
      dietaryRestrictions: body.dietaryRestrictions,
      notes: body.notes,
      active: body.active,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
