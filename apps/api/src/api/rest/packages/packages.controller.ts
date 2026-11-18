import {
  Body,
  Controller,
  Delete,
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
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PACKAGE_USE_CASE, type PackageUseCase } from '../../../domain/ports/input';
import { PaymentMethod } from '../../../domain/entities';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(1)
  sessionCount!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;
}

class UpdatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(1)
  sessionCount!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class SellPackageDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsIn(['PAID_NOW', 'ON_ACCOUNT', 'INSTALLMENTS'])
  paymentMode?: 'PAID_NOW' | 'ON_ACCOUNT' | 'INSTALLMENTS';

  @IsOptional()
  @IsBoolean()
  markAsPaid?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(24)
  installments?: number;

  @IsOptional()
  @IsDateString()
  firstDueDate?: string;
}

@Controller('packages')
@UseGuards(JwtAuthGuard)
export class PackagesController {
  constructor(@Inject(PACKAGE_USE_CASE) private readonly packages: PackageUseCase) {}

  @Get('plans')
  async listPlans(@Req() req: AuthenticatedRequest) {
    const result = await this.packages.listPlans(req.user.clinicId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('plans')
  async createPlan(@Req() req: AuthenticatedRequest, @Body() body: CreatePlanDto) {
    const result = await this.packages.createPlan({
      clinicId: req.user.clinicId,
      ...body,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Patch('plans/:id')
  async updatePlan(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdatePlanDto,
  ) {
    const result = await this.packages.updatePlan({
      id,
      clinicId: req.user.clinicId,
      name: body.name,
      sessionCount: body.sessionCount,
      priceCents: body.priceCents,
      validityDays: body.validityDays,
      active: body.active,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Delete('plans/:id')
  async deactivatePlan(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const result = await this.packages.deactivatePlan(req.user.clinicId, id);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('sell')
  async sell(@Req() req: AuthenticatedRequest, @Body() body: SellPackageDto) {
    const result = await this.packages.sell({
      clinicId: req.user.clinicId,
      ...body,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Get('patient-packages')
  async listPatientPackages(
    @Req() req: AuthenticatedRequest,
    @Query('patientId') patientId?: string,
  ) {
    const result = await this.packages.listPatientPackages(req.user.clinicId, patientId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Get('renewal-alerts')
  async renewalAlerts(@Req() req: AuthenticatedRequest) {
    const result = await this.packages.renewalAlerts(req.user.clinicId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
