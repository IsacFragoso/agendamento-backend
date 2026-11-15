import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { ListProviderReviewsDto } from './dto/list-provider-reviews.dto';
import { SearchPrestadoresDto } from './dto/search-prestadores.dto';
import { UsersService } from './users.service';

@Controller('prestadores')
export class ProvidersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  search(@Query() dto: SearchPrestadoresDto) {
    return this.usersService.searchProviders(dto);
  }

  @Get(':id/avaliacoes')
  findReviews(@Param('id', ParseIntPipe) id: number, @Query() dto: ListProviderReviewsDto) {
    return this.usersService.findPublicProviderReviews(id, dto);
  }

  @Post(':id/sugestoes')
  @UseGuards(JwtAuthGuard)
  createSuggestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSuggestionDto,
    @Req() request: Request,
  ) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.createProviderSuggestion(id, dto, user.sub, user.tipo_conta);
  }

  @Get(':id/sugestoes')
  @UseGuards(JwtAuthGuard)
  findSuggestions(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    const user = request.user as { sub: number; tipo_conta: string };
    return this.usersService.findProviderSuggestions(id, user.sub, user.tipo_conta);
  }

  @Get(':id/contatos')
  findContacts(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findProviderContacts(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findPublicProvider(id);
  }
}
