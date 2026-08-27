import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfilPrestador } from './entities/perfil-prestador.entity';
import { Usuario } from './entities/usuario.entity';
import { UsersController } from './users.controller';
import { ProvidersController } from './providers.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, PerfilPrestador])],
  controllers: [UsersController, ProvidersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
