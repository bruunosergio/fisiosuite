import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PLATFORM_USE_CASE, type PlatformUseCase } from '../../../domain/ports/input';
import { httpStatusFor } from '../failure-http.mapper';
import { PlatformAuthGuard } from '../../guards/platform-auth.guard';

class PlatformLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class UpdateClinicDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  document?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('platform')
export class PlatformController {
  constructor(@Inject(PLATFORM_USE_CASE) private readonly platform: PlatformUseCase) {}

  @Post('auth/login')
  async login(@Body() body: PlatformLoginDto) {
    const result = await this.platform.login(body);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @UseGuards(PlatformAuthGuard)
  @Get('overview')
  async overview() {
    const result = await this.platform.overview();
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @UseGuards(PlatformAuthGuard)
  @Get('clinics')
  async listClinics() {
    const result = await this.platform.listClinics();
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value.map((item) => ({
      id: item.clinic.id,
      name: item.clinic.name,
      document: item.clinic.document,
      phone: item.clinic.phone,
      active: item.clinic.active,
      createdAt: item.clinic.createdAt,
      updatedAt: item.clinic.updatedAt,
      userCount: item.userCount,
      patientCount: item.patientCount,
      appointmentCount: item.appointmentCount,
      adminEmail: item.adminEmail,
    }));
  }

  @UseGuards(PlatformAuthGuard)
  @Get('clinics/:id')
  async getClinic(@Param('id') id: string) {
    const result = await this.platform.getClinic(id);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    const { summary, users } = result.value;
    return {
      id: summary.clinic.id,
      name: summary.clinic.name,
      document: summary.clinic.document,
      phone: summary.clinic.phone,
      timezone: summary.clinic.timezone,
      active: summary.clinic.active,
      createdAt: summary.clinic.createdAt,
      updatedAt: summary.clinic.updatedAt,
      userCount: summary.userCount,
      patientCount: summary.patientCount,
      appointmentCount: summary.appointmentCount,
      adminEmail: summary.adminEmail,
      users,
    };
  }

  @UseGuards(PlatformAuthGuard)
  @Patch('clinics/:id')
  async updateClinic(@Param('id') id: string, @Body() body: UpdateClinicDto) {
    const result = await this.platform.updateClinic({
      id,
      name: body.name,
      phone: body.phone,
      document: body.document,
      active: body.active,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
