import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminGuard } from '../auth/strategies/admin.guard';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpsertPerfilPrestadorDto } from './dto/upsert-perfil-prestador.dto';
import { UsersService } from './users.service';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.findOne(id, user.sub, user.tipo_conta);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.update(id, dto, user.sub, user.tipo_conta);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.remove(id, user.sub, user.tipo_conta);
  }

  @Put(':id/perfil-prestador')
  @UseGuards(JwtAuthGuard)
  upsertProfile(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertPerfilPrestadorDto, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.upsertProfile(id, dto, user.sub, user.tipo_conta);
  }
}