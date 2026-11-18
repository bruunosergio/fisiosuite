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
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { FINANCE_USE_CASE, type FinanceUseCase } from '../../../domain/ports/input';
import { PaymentMethod, PaymentStatus } from '../../../domain/entities';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class CreatePaymentDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class SettlePaymentDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(@Inject(FINANCE_USE_CASE) private readonly finance: FinanceUseCase) {}

  @Get('summary')
  async summary(@Req() req: AuthenticatedRequest) {
    const result = await this.finance.summary(req.user.clinicId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Get('payments')
  async listPayments(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    const result = await this.finance.listPayments(req.user.clinicId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('payments')
  async createPayment(@Req() req: AuthenticatedRequest, @Body() body: CreatePaymentDto) {
    const result = await this.finance.registerPayment({
      clinicId: req.user.clinicId,
      patientId: body.patientId,
      packageId: body.packageId,
      amountCents: body.amountCents,
      method: body.method,
      status: body.status,
      dueDate: body.dueDate ? new Date(`${body.dueDate}T12:00:00`) : null,
      notes: body.notes,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Patch('payments/:id/settle')
  async settle(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: SettlePaymentDto,
  ) {
    const result = await this.finance.settlePayment({
      clinicId: req.user.clinicId,
      paymentId: id,
      method: body.method,
      paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
      notes: body.notes,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Get('commission')
  async commission(
    @Req() req: AuthenticatedRequest,
    @Query('professionalId') professionalId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!professionalId || !from || !to) {
      throw new HttpException({ message: 'Informe professionalId, from e to.' }, 400);
    }
    const result = await this.finance.commissionReport({
      clinicId: req.user.clinicId,
      professionalId,
      from: new Date(from),
      to: new Date(to),
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
