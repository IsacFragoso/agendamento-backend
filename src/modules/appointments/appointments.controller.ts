import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateAvaliacaoDto } from './dto/update-avaliacao.dto';

@Controller('agendamentos')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAgendamentoDto, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.create(dto, user.sub, user.tipo_conta);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.findAllForUser(user.sub, user.tipo_conta);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.findOneForUser(id, user.sub, user.tipo_conta);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.updateStatus(id, dto, user.sub, user.tipo_conta);
  }

  @Post(':id/avaliacao')
  @UseGuards(JwtAuthGuard)
  createReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAvaliacaoDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.createReview(id, dto, user.sub, user.tipo_conta);
  }

  @Get(':id/avaliacao')
  @UseGuards(JwtAuthGuard)
  findReview(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.findReview(id, user.sub, user.tipo_conta);
  }

  @Patch(':id/avaliacao')
  @UseGuards(JwtAuthGuard)
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvaliacaoDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.updateReview(id, dto, user.sub, user.tipo_conta);
  }

  @Delete(':id/avaliacao')
  @UseGuards(JwtAuthGuard)
  removeReview(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.appointmentsService.removeReview(id, user.sub, user.tipo_conta);
  }
}
