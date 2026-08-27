import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { SchedulesService } from './schedules.service';

@Controller('prestadores/:id/horario')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  find(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.findByProvider(id);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHorarioDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.schedulesService.update(id, dto, user.sub, user.tipo_conta);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  clear(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.schedulesService.clear(id, user.sub, user.tipo_conta);
  }
}
