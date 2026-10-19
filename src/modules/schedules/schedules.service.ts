import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';
import { Horario } from './entities/horario.entity';
import { Servico } from '../services/entities/servico.entity';
import { Agendamento } from '../appointments/entities/agendamento.entity';
import { ProviderAvailabilityQueryDto } from './dto/provider-availability-query.dto';
import { getPostgresErrorCode } from '../../common/utils/database-error.util';

// Provider schedules are wall-clock times in São Paulo. Brazil has no DST since 2019, so the offset is fixed.
const SAO_PAULO_OFFSET = '-03:00';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
    @InjectRepository(Horario)
    private readonly horariosRepository: Repository<Horario>,
    @InjectRepository(Servico)
    private readonly servicosRepository: Repository<Servico>,
    @InjectRepository(Agendamento)
    private readonly agendamentosRepository: Repository<Agendamento>,
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

  async getAvailableSlots(id_prestador: number, query: ProviderAvailabilityQueryDto) {
    const service = await this.servicosRepository.findOne({
      where: { id_servico: query.servico_id, id_prestador, ativo: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado para este prestador');

    const date = new Date(`${query.data}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inválida');
    // The weekday is the calendar day of the requested date, independent of time zone.
    const weekday = date.getUTCDay();
    const dayStart = new Date(`${query.data}T00:00:00${SAO_PAULO_OFFSET}`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const schedule = await this.horariosRepository.find({
      where: { id_prestador, dia_semana: weekday },
      order: { hora_inicio: 'ASC' },
    });
    const bookings = await this.agendamentosRepository
      .createQueryBuilder('agendamento')
      .where('agendamento.id_prestador = :provider', { provider: id_prestador })
      .andWhere('agendamento.status != :cancelled', { cancelled: 'CANCELADO' })
      .andWhere('agendamento.data_hora_inicio < :dayEnd', { dayEnd })
      .andWhere('agendamento.data_hora_fim > :dayStart', { dayStart })
      .getMany();

    const now = Date.now();
    const slots = new Map<
      string,
      { hora: string; inicio: string; fim: string; disponivel: boolean }
    >();
    const duration = Number(service.duracao_padrao);

    schedule.forEach((interval) => {
      const [startHour, startMinute] = interval.hora_inicio.split(':').map(Number);
      const [endHour, endMinute] = interval.hora_fim.split(':').map(Number);
      const intervalStart = startHour * 60 + startMinute;
      const intervalEnd = endHour * 60 + endMinute;

      for (let minute = intervalStart; minute + duration <= intervalEnd; minute += 30) {
        const start = new Date(dayStart.getTime() + minute * 60_000);
        const end = new Date(start.getTime() + duration * 60_000);
        if (start.getTime() <= now) continue;

        const hora = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const taken = bookings.some(
          (booking) =>
            new Date(booking.data_hora_inicio).getTime() < end.getTime() &&
            new Date(booking.data_hora_fim).getTime() > start.getTime(),
        );
        slots.set(hora, {
          hora,
          inicio: start.toISOString(),
          fim: end.toISOString(),
          disponivel: !taken,
        });
      }
    });

    return [...slots.values()].sort((a, b) => a.hora.localeCompare(b.hora));
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
    const interval = {
      dia_semana,
      hora_inicio: dto.horario_inicio,
      hora_fim: dto.horario_fim,
      id_prestador,
    };
    const existing = await this.horariosRepository.findOne({ where: interval });
    if (existing) return existing;

    try {
      return await this.horariosRepository.save(this.horariosRepository.create(interval));
    } catch (error) {
      if (getPostgresErrorCode(error) === '23505') {
        const concurrentDuplicate = await this.horariosRepository.findOne({ where: interval });
        if (concurrentDuplicate) return concurrentDuplicate;
        throw new ConflictException('Este intervalo já está cadastrado');
      }
      throw error;
    }
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
