import { Controller, Get, Query } from '@nestjs/common';
import { SearchPrestadoresDto } from './dto/search-prestadores.dto';
import { UsersService } from './users.service';

@Controller('prestadores')
export class ProvidersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  search(@Query() dto: SearchPrestadoresDto) {
    return this.usersService.searchProviders(dto);
  }
}
