import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateAvaliacaoDto } from './dto/update-avaliacao.dto';
import { Agendamento } from './entities/agendamento.entity';
import { Avaliacao } from './entities/avaliacao.entity';
import { Usuario } from '../users/entities/usuario.entity';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';
import { Servico } from '../services/entities/servico.entity';
import { getPostgresErrorCode } from '../../common/utils/database-error.util';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Agendamento)
    private readonly agendamentosRepository: Repository<Agendamento>,
    @InjectRepository(Avaliacao)
    private readonly avaliacoesRepository: Repository<Avaliacao>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
    @InjectRepository(Servico)
    private readonly servicosRepository: Repository<Servico>,
  ) {}

  async create(dto: CreateAgendamentoDto, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && requesterType !== 'CLIENTE' && requesterType !== 'PRESTADOR') {
      throw new ForbiddenException('Tipo de conta não pode criar agendamentos');
    }
    if (requesterType === 'ADMIN' && !dto.id_cliente) {
      throw new ForbiddenException('Administradores devem informar o cliente do agendamento');
    }
    const clientId = requesterType === 'ADMIN' ? dto.id_cliente! : requesterId;
    if (new Date(dto.data_hora_fim) <= new Date(dto.data_hora_inicio)) {
      throw new ConflictException('O horário final deve ser posterior ao inicial');
    }
    await this.requireUser(clientId);
    const service = await this.requireService(dto.id_servico);
    if (!service.ativo) throw new ConflictException('O serviço está inativo');
    await this.requireProfile(service.id_prestador);
    if (clientId === service.id_prestador) {
      throw new ForbiddenException('Você não pode agendar um serviço seu');
    }
    // Date objects are serialized the same way as the saved values; raw ISO strings are not.
    const start = new Date(dto.data_hora_inicio);
    const end = new Date(dto.data_hora_fim);
    const providerBusy = await this.findOverlapping(
      'id_prestador',
      service.id_prestador,
      start,
      end,
    );
    if (providerBusy) throw new ConflictException('Prestador não disponível nesse horário');
    const clientBusy = await this.findOverlapping('id_cliente', clientId, start, end);
    if (clientBusy) {
      throw new ConflictException('Você já possui um agendamento nesse horário');
    }

    try {
      return await this.agendamentosRepository.save(
        this.agendamentosRepository.create({
          id_cliente: clientId,
          id_prestador: service.id_prestador,
          id_servico: dto.id_servico,
          data_hora_inicio: start,
          data_hora_fim: end,
        }),
      );
    } catch (error) {
      this.rethrowAppointmentConflict(error);
      throw error;
    }
  }

  // The column is chosen from a fixed pair, never from input.
  private findOverlapping(
    column: 'id_prestador' | 'id_cliente',
    id: number,
    start: Date,
    end: Date,
  ) {
    return this.agendamentosRepository
      .createQueryBuilder('agendamento')
      .where(`agendamento.${column} = :id`, { id })
      .andWhere('agendamento.status NOT IN (:...statuses)', { statuses: ['CANCELADO'] })
      .andWhere('agendamento.data_hora_inicio < :end', { end })
      .andWhere('agendamento.data_hora_fim > :start', { start })
      .getOne();
  }

  // 23P01: exclusion constraint hit by a concurrent request that passed the checks above.
  private rethrowAppointmentConflict(error: unknown) {
    const code = getPostgresErrorCode(error);
    if (code === '23P01') {
      const constraint = (error as { driverError?: { constraint?: string } }).driverError
        ?.constraint;
      throw new ConflictException(
        constraint === 'EX_agendamento_cliente_sem_sobreposicao'
          ? 'Você já possui um agendamento nesse horário'
          : 'Prestador não disponível nesse horário',
      );
    }
    if (code === '23503') {
      throw new ConflictException('O serviço ou prestador não está mais disponível');
    }
  }

  findAllForUser(requesterId: number, requesterType: string) {
    if (requesterType === 'ADMIN') {
      return this.agendamentosRepository.find({
        relations: { cliente: true, prestador: true, servico: true, avaliacoes: true },
        order: { data_hora_inicio: 'ASC' },
      });
    }
    if (requesterType === 'CLIENTE') return this.findByClient(requesterId);
    if (requesterType === 'PRESTADOR') {
      return this.agendamentosRepository.find({
        where: [{ id_prestador: requesterId }, { id_cliente: requesterId }],
        relations: {
          cliente: true,
          prestador: { usuario: true },
          servico: true,
          avaliacoes: true,
        },
        order: { data_hora_inicio: 'ASC' },
      });
    }
    throw new ForbiddenException('Tipo de conta sem acesso a agendamentos');
  }

  async findOneForUser(id: number, requesterId: number, requesterType: string) {
    const appointment = await this.agendamentosRepository.findOne({
      where: { id_agendamento: id },
      relations: { cliente: true, prestador: true, servico: true, avaliacoes: true },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    if (
      requesterType !== 'ADMIN' &&
      appointment.id_cliente !== requesterId &&
      appointment.id_prestador !== requesterId
    ) {
      throw new ForbiddenException('Você não pode visualizar este agendamento');
    }
    return appointment;
  }

  findByClient(id_cliente: number) {
    return this.agendamentosRepository.find({
      where: { id_cliente },
      relations: { prestador: { usuario: true }, servico: true, avaliacoes: true },
      order: { data_hora_inicio: 'ASC' },
    });
  }

  findByProvider(id_prestador: number) {
    return this.agendamentosRepository.find({
      where: { id_prestador },
      relations: { cliente: true, servico: true, avaliacoes: true },
      order: { data_hora_inicio: 'ASC' },
    });
  }

  async updateStatus(id: number, dto: UpdateStatusDto, requesterId: number, requesterType: string) {
    if (!['ADMIN', 'PRESTADOR', 'CLIENTE'].includes(requesterType)) {
      throw new ForbiddenException('Tipo de conta sem acesso a agendamentos');
    }
    const appointment = await this.requireAppointment(id);
    if (dto.status === 'CANCELADO' && !dto.motivo_cancelamento?.trim()) {
      throw new ConflictException('Informe o motivo do cancelamento');
    }
    if (requesterType === 'CLIENTE') {
      if (dto.status !== 'CANCELADO' || appointment.id_cliente !== requesterId) {
        throw new ForbiddenException('Clientes só podem cancelar os próprios agendamentos');
      }
    } else if (requesterType === 'PRESTADOR') {
      const isProvider = appointment.id_prestador === requesterId;
      const isBookingClient = appointment.id_cliente === requesterId;
      if ((!isProvider && !isBookingClient) || (dto.status !== 'CANCELADO' && !isProvider)) {
        throw new ForbiddenException('Você não pode alterar este agendamento');
      }
    }
    if (dto.status === 'CANCELADO' && !['PENDENTE', 'CONFIRMADO'].includes(appointment.status)) {
      throw new ConflictException('Este agendamento não pode mais ser cancelado');
    }
    appointment.status = dto.status;
    appointment.motivo_cancelamento =
      dto.status === 'CANCELADO' ? dto.motivo_cancelamento!.trim() : null;
    appointment.cancelado_por =
      dto.status === 'CANCELADO' ? (requesterType === 'ADMIN' ? 'SISTEMA' : requesterType) : null;
    try {
      return await this.agendamentosRepository.save(appointment);
    } catch (error) {
      // Reactivating a cancelled appointment can collide with a newer booking.
      this.rethrowAppointmentConflict(error);
      throw error;
    }
  }

  async createReview(
    id_agendamento: number,
    dto: CreateAvaliacaoDto,
    requesterId: number,
    requesterType: string,
  ) {
    if (requesterType !== 'CLIENTE' && requesterType !== 'PRESTADOR')
      throw new ForbiddenException('Tipo de conta não pode avaliar');
    const appointment = await this.requireAppointment(id_agendamento);
    const evaluatorType = this.getEvaluatorType(appointment, requesterId, requesterType);
    if (!evaluatorType) {
      throw new ForbiddenException('Você só pode avaliar agendamentos dos quais participa');
    }
    if (appointment.status !== 'CONCLUIDO') {
      throw new ConflictException('Só é possível avaliar agendamentos concluídos');
    }
    const existing = await this.avaliacoesRepository.findOne({
      where: { id_agendamento, avaliador_tipo: evaluatorType },
    });
    if (existing) throw new ConflictException('Este agendamento já foi avaliado');
    return this.avaliacoesRepository.save(
      this.avaliacoesRepository.create({
        ...dto,
        id_agendamento,
        avaliador_tipo: evaluatorType,
      }),
    );
  }

  async findReview(id_agendamento: number, requesterId: number, requesterType: string) {
    const appointment = await this.requireAppointment(id_agendamento);
    const evaluatorType = this.requireReviewOwner(appointment, requesterId, requesterType);
    const review = await this.avaliacoesRepository.findOne({
      where: { id_agendamento, avaliador_tipo: evaluatorType },
    });
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    return review;
  }

  async findReviews(id_agendamento: number, requesterId: number, requesterType: string) {
    const appointment = await this.requireAppointment(id_agendamento);
    this.requireReviewOwner(appointment, requesterId, requesterType);
    return this.avaliacoesRepository.find({
      where: { id_agendamento },
      order: { data: 'ASC', id_avaliacao: 'ASC' },
    });
  }

  async updateReview(
    id_agendamento: number,
    dto: UpdateAvaliacaoDto,
    requesterId: number,
    requesterType: string,
  ) {
    const review = await this.findReview(id_agendamento, requesterId, requesterType);
    Object.assign(review, dto);
    return this.avaliacoesRepository.save(review);
  }

  async removeReview(id_agendamento: number, requesterId: number, requesterType: string) {
    const review = await this.findReview(id_agendamento, requesterId, requesterType);
    await this.avaliacoesRepository.remove(review);
    return { message: 'Avaliação removida com sucesso' };
  }

  private async requireAppointment(id: number) {
    const appointment = await this.agendamentosRepository.findOne({
      where: { id_agendamento: id },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  private getEvaluatorType(
    appointment: Agendamento,
    requesterId: number,
    requesterType: string,
  ): 'CLIENTE' | 'PRESTADOR' | null {
    if (requesterType === 'CLIENTE' && appointment.id_cliente === requesterId) return 'CLIENTE';
    if (requesterType === 'PRESTADOR' && appointment.id_prestador === requesterId)
      return 'PRESTADOR';
    if (requesterType === 'PRESTADOR' && appointment.id_cliente === requesterId) return 'CLIENTE';
    return null;
  }

  private requireReviewOwner(
    appointment: Agendamento,
    requesterId: number,
    requesterType: string,
  ): 'CLIENTE' | 'PRESTADOR' {
    if (requesterType === 'ADMIN') return 'CLIENTE';
    const evaluatorType = this.getEvaluatorType(appointment, requesterId, requesterType);
    if (!evaluatorType) {
      throw new ForbiddenException(
        'Apenas participantes do agendamento podem visualizar avaliações',
      );
    }
    return evaluatorType;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredPendingAppointments() {
    const result = await this.agendamentosRepository
      .createQueryBuilder()
      .update(Agendamento)
      .set({
        status: 'CANCELADO',
        motivo_cancelamento: 'Agendamento pendente vencido automaticamente.',
        cancelado_por: 'SISTEMA',
      })
      .where('"status" = :status', { status: 'PENDENTE' })
      .andWhere('"data_hora_inicio" < :now', { now: new Date() })
      .execute();
    if (result.affected) {
      this.logger.log(`${result.affected} agendamento(s) pendente(s) expirado(s).`);
    }
  }

  private async requireUser(id: number) {
    const user = await this.usuariosRepository.findOne({ where: { id_usuario: id } });
    if (!user) throw new NotFoundException('Cliente não encontrado');
    return user;
  }

  private async requireProfile(id: number) {
    const profile = await this.perfisRepository.findOne({ where: { id_usuario: id } });
    if (!profile) throw new NotFoundException('Prestador não encontrado');
    return profile;
  }

  private async requireService(id: number) {
    const service = await this.servicosRepository.findOne({ where: { id_servico: id } });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return service;
  }
}
