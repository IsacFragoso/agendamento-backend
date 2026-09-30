import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';
import { Horario } from './entities/horario.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
    @InjectRepository(Horario)
    private readonly horariosRepository: Repository<Horario>,
  ) {}

  async findByProvider(id_prestador: number) {
    const perfil = await this.perfisRepository.findOne({ where: { id_usuario: id_prestador } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');
    const horarios = await this.horariosRepository.find({
      where: { id_prestador },
      order: { dia_semana: 'ASC', hora_inicio: 'ASC' },
    });
    return horarios.map((horario) => ({
      id_horario: horario.id_horario,
      dia_semana: horario.dia_semana,
      dia: this.dayName(horario.dia_semana),
      hora_inicio: horario.hora_inicio,
      hora_fim: horario.hora_fim,
    }));
  }

  async update(
    id_prestador: number,
    dto: UpdateHorarioDto,
    requesterId: number,
    requesterType: string,
  ) {
    this.requireProvider(id_prestador, requesterId, requesterType);
    const perfil = await this.perfisRepository.findOne({ where: { id_usuario: id_prestador } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');
    const dia_semana = dto.dia_semana ?? this.dayNumber(dto.dias_atendimento);
    if (dia_semana === undefined) throw new BadRequestException('Dia da semana não informado');
    if (!dto.horario_inicio || !dto.horario_fim || dto.horario_inicio >= dto.horario_fim) {
      throw new BadRequestException('Intervalo de horário inválido');
    }
    return this.horariosRepository.save(
      this.horariosRepository.create({
        dia_semana,
        hora_inicio: dto.horario_inicio,
        hora_fim: dto.horario_fim,
        id_prestador,
      }),
    );
  }

  async clear(
    id_prestador: number,
    dto: UpdateHorarioDto,
    requesterId: number,
    requesterType: string,
  ) {
    this.requireProvider(id_prestador, requesterId, requesterType);
    const perfil = await this.perfisRepository.findOne({ where: { id_usuario: id_prestador } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');
    const dia_semana = dto.dia_semana ?? this.dayNumber(dto.dias_atendimento);
    if (dia_semana === undefined) throw new BadRequestException('Dia da semana não informado');
    await this.horariosRepository.delete({ id_prestador, dia_semana });
    return { message: 'Horários removidos com sucesso' };
  }

  private requireProvider(id: number, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && (requesterType !== 'PRESTADOR' || id !== requesterId)) {
      throw new ForbiddenException('Você só pode gerenciar o próprio horário de prestador');
    }
  }

  private dayNumber(day: string | undefined) {
    if (!day) return undefined;
    const normalized = day
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const days = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    const index = days.indexOf(normalized);
    return index >= 0 ? index : undefined;
  }

  private dayName(day: number) {
    return ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'][day];
  }
}
