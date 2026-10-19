import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';
import { Horario } from './entities/horario.entity';
import { Servico } from '../services/entities/servico.entity';
import { Agendamento } from '../appointments/entities/agendamento.entity';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [TypeOrmModule.forFeature([PerfilPrestador, Horario, Servico, Agendamento])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
