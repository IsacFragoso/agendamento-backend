import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
        relations: { cliente: true, prestador: true, servico: true, avaliacao: true },
        order: { data_hora_inicio: 'ASC' },
      });
    }
    if (requesterType === 'CLIENTE') return this.findByClient(requesterId);
    if (requesterType === 'PRESTADOR') {
      return this.agendamentosRepository.find({
        where: { id_prestador: requesterId },
        relations: { cliente: true, prestador: true, servico: true, avaliacao: true },
        order: { data_hora_inicio: 'ASC' },
      });
    }
    throw new ForbiddenException('Tipo de conta sem acesso a agendamentos');
  }

  async findOneForUser(id: number, requesterId: number, requesterType: string) {
    const appointment = await this.agendamentosRepository.findOne({
      where: { id_agendamento: id },
      relations: { cliente: true, prestador: true, servico: true, avaliacao: true },
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
      relations: { prestador: true, servico: true, avaliacao: true },
      order: { data_hora_inicio: 'ASC' },
    });
  }

  findByProvider(id_prestador: number) {
    return this.agendamentosRepository.find({
      where: { id_prestador },
      relations: { cliente: true, servico: true, avaliacao: true },
      order: { data_hora_inicio: 'ASC' },
    });
  }

  async updateStatus(id: number, dto: UpdateStatusDto, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && requesterType !== 'PRESTADOR') {
      throw new ForbiddenException('Apenas prestadores podem alterar o status');
    }
    const appointment = await this.requireAppointment(id);
    if (requesterType !== 'ADMIN' && appointment.id_prestador !== requesterId) {
      throw new ForbiddenException('Você não pode alterar este agendamento');
    }
    appointment.status = dto.status;
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
    if (requesterType !== 'ADMIN' && requesterType !== 'CLIENTE' && requesterType !== 'PRESTADOR')
      throw new ForbiddenException('Tipo de conta não pode avaliar');
    const appointment = await this.requireAppointment(id_agendamento);
    if (requesterType !== 'ADMIN' && appointment.id_cliente !== requesterId)
      throw new ForbiddenException('Você só pode avaliar seus agendamentos');
    if (appointment.status !== 'CONCLUIDO') {
      throw new ConflictException('Só é possível avaliar agendamentos concluídos');
    }
    const existing = await this.avaliacoesRepository.findOne({ where: { id_agendamento } });
    if (existing) throw new ConflictException('Este agendamento já foi avaliado');
    return this.avaliacoesRepository.save(
      this.avaliacoesRepository.create({ ...dto, id_agendamento }),
    );
  }

  async findReview(id_agendamento: number, requesterId: number, requesterType: string) {
    const appointment = await this.requireAppointment(id_agendamento);
    this.requireReviewOwner(appointment, requesterId, requesterType);
    const review = await this.avaliacoesRepository.findOne({ where: { id_agendamento } });
    if (!review) throw new NotFoundException('Avaliação não encontrada');
    return review;
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

  private requireReviewOwner(appointment: Agendamento, requesterId: number, requesterType: string) {
    if (
      requesterType !== 'ADMIN' &&
      (appointment.id_cliente !== requesterId ||
        (requesterType !== 'CLIENTE' && requesterType !== 'PRESTADOR'))
    ) {
      throw new ForbiddenException('Apenas o cliente do agendamento pode gerenciar a avaliação');
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
