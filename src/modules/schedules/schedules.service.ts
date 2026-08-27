import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
  ) {}

  async findByProvider(id_prestador: number) {
    const perfil = await this.perfisRepository.findOne({ where: { id_prestador } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');
    return {
      id_prestador: perfil.id_prestador,
      dias_atendimento: perfil.dias_atendimento,
      horario_inicio: perfil.horario_inicio,
      horario_fim: perfil.horario_fim,
    };
  }

  async update(
    id_prestador: number,
    dto: UpdateHorarioDto,
    requesterId: number,
    requesterType: string,
  ) {
    this.requireProvider(id_prestador, requesterId, requesterType);
    const perfil = await this.perfisRepository.findOne({ where: { id_prestador } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');
    Object.assign(perfil, dto);
    return this.perfisRepository.save(perfil);
  }

  async clear(id_prestador: number, requesterId: number, requesterType: string) {
    this.requireProvider(id_prestador, requesterId, requesterType);
    const perfil = await this.perfisRepository.findOne({ where: { id_prestador } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');
    perfil.dias_atendimento = null;
    perfil.horario_inicio = null;
    perfil.horario_fim = null;
    return this.perfisRepository.save(perfil);
  }

  private requireProvider(id: number, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && (requesterType !== 'PRESTADOR' || id !== requesterId)) {
      throw new ForbiddenException('Você só pode gerenciar o próprio horário de prestador');
    }
  }
}
