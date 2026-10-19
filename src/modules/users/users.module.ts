import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../common/storage/cloudinary.module';
import { PerfilPrestador } from './entities/perfil-prestador.entity';
import { Usuario } from './entities/usuario.entity';
import { Agendamento } from '../appointments/entities/agendamento.entity';
import { Avaliacao } from '../appointments/entities/avaliacao.entity';
import { UsersController } from './users.controller';
import { ProvidersController } from './providers.controller';
import { UsersService } from './users.service';
import { DistanceUtilService } from '../../common/utils/distance.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, PerfilPrestador, Agendamento, Avaliacao]),
    CloudinaryModule,
  ],
  controllers: [UsersController, ProvidersController],
  providers: [UsersService, DistanceUtilService],
  exports: [UsersService],
})
export class UsersModule {}
