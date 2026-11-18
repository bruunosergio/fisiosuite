import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ROOM_USE_CASE, type RoomUseCase } from '../../../domain/ports/input';
import { httpStatusFor } from '../failure-http.mapper';
import { AuthenticatedRequest, JwtAuthGuard } from '../../guards/jwt-auth.guard';

class CreateRoomDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(@Inject(ROOM_USE_CASE) private readonly rooms: RoomUseCase) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const result = await this.rooms.list(req.user.clinicId);
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateRoomDto) {
    const result = await this.rooms.create({
      clinicId: req.user.clinicId,
      name: body.name,
      capacity: body.capacity,
    });
    if (result.isErr) {
      throw new HttpException({ message: result.error.message }, httpStatusFor(result.error));
    }
    return result.value;
  }
}
