import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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

  @Get(':id/contatos')
  findContacts(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findProviderContacts(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findPublicProvider(id);
  }
}
