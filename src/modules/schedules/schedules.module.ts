import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [TypeOrmModule.forFeature([PerfilPrestador])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}