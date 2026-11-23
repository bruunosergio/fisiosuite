import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AUTH_USE_CASE, type AuthUseCase } from '../../../domain/ports/input';
import { CouncilType, Role, Specialty } from '../../../domain/entities';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class RegisterClinicDto {
  @IsString()
  @MinLength(2)
  clinicName!: string;

  @IsString()
  @MinLength(2)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Specialty, { each: true })
  enabledModules?: Specialty[];
}

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsNumber()
  commissionPct?: number;

  @IsOptional()
  @IsEnum(Specialty)
  specialty?: Specialty;

  @IsOptional()
  @IsEnum(CouncilType)
  councilType?: CouncilType;

  @IsOptional()
  @IsString()
  councilNumber?: string;

  @IsOptional()
  @IsString()
  councilState?: string;
}

class UpdateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsNumber()
  commissionPct?: number | null;

  @IsOptional()
  @IsEnum(Specialty)
  specialty?: Specialty | null;

  @IsOptional()
  @IsEnum(CouncilType)
  councilType?: CouncilType | null;

  @IsOptional()
  @IsString()
  councilNumber?: string | null;

  @IsOptional()
  @IsString()
  councilState?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

@Controller()
export class AuthController {
  constructor(@Inject(AUTH_USE_CASE) private readonly auth: AuthUseCase) {}

  @Post('auth/login')
  async login(@Body() body: LoginDto) {
    const result = await this.auth.login(body);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post('auth/register-clinic')
  async registerClinic(@Body() body: RegisterClinicDto) {
    const result = await this.auth.registerClinic(body);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async listUsers(@Req() req: AuthenticatedRequest) {
    const result = await this.auth.listUsers(req.user.clinicId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Post('users')
  async createUser(@Req() req: AuthenticatedRequest, @Body() body: CreateUserDto) {
    const result = await this.auth.createUser({
      clinicId: req.user.clinicId,
      ...body,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:id')
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    const result = await this.auth.updateUser({
      clinicId: req.user.clinicId,
      id,
      name: body.name,
      email: body.email,
      role: body.role,
      commissionPct: body.commissionPct,
      specialty: body.specialty,
      councilType: body.councilType,
      councilNumber: body.councilNumber,
      councilState: body.councilState,
      active: body.active,
      password: body.password,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
