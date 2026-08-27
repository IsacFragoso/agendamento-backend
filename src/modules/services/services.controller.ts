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
import { AdminGuard } from '../auth/strategies/admin.guard';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { CreateServicoDto } from './dto/create-servico.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';
import { ServicesService } from './services.service';

@Controller()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post('categorias')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createCategory(@Body() dto: CreateCategoriaDto) {
    return this.servicesService.createCategory(dto);
  }

  @Get('categorias')
  findCategories() {
    return this.servicesService.findCategories();
  }

  @Patch('categorias/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoriaDto) {
    return this.servicesService.updateCategory(id, dto);
  }

  @Delete('categorias/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.removeCategory(id);
  }

  @Post('servicos')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateServicoDto, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.servicesService.create(dto, user.sub, user.tipo_conta);
  }

  @Get('servicos')
  findAll() {
    return this.servicesService.findAll();
  }

  @Get('servicos/prestador/:id')
  findByProvider(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findByProvider(id);
  }

  @Patch('servicos/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicoDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.servicesService.update(id, dto, user.sub, user.tipo_conta);
  }

  @Delete('servicos/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.servicesService.remove(id, user.sub, user.tipo_conta);
  }
}
