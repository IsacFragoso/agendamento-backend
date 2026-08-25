import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';
import { Usuario } from '../users/entities/usuario.entity';
import { Servico } from '../services/entities/servico.entity';
import { Agendamento } from './entities/agendamento.entity';
import { Avaliacao } from './entities/avaliacao.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agendamento, Avaliacao, Usuario, PerfilPrestador, Servico])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}