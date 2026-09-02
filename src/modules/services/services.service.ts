import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';
import { Servico } from './entities/servico.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { CreateServicoDto } from './dto/create-servico.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { PerfilPrestador } from '../users/entities/perfil-prestador.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Servico)
    private readonly servicosRepository: Repository<Servico>,
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
  ) {}

  async createCategory(dto: CreateCategoriaDto) {
    const existing = await this.categoriasRepository.findOne({ where: { nome: dto.nome } });
    if (existing) throw new ConflictException('Categoria já cadastrada');
    return this.categoriasRepository.save(this.categoriasRepository.create(dto));
  }

  findCategories() {
    return this.categoriasRepository.find({ order: { nome: 'ASC' } });
  }

  async updateCategory(id: number, dto: UpdateCategoriaDto) {
    const category = await this.requireCategory(id);
    const duplicate = await this.categoriasRepository.findOne({ where: { nome: dto.nome } });
    if (duplicate && duplicate.id_categoria !== id)
      throw new ConflictException('Categoria já cadastrada');
    category.nome = dto.nome;
    return this.categoriasRepository.save(category);
  }

  async removeCategory(id: number) {
    const category = await this.requireCategory(id);
    const servicesCount = await this.servicosRepository.count({ where: { id_categoria: id } });
    if (servicesCount > 0) throw new ConflictException('Categoria possui serviços vinculados');
    await this.categoriasRepository.remove(category);
    return { message: 'Categoria removida com sucesso' };
  }

  async create(dto: CreateServicoDto, requesterId: number, requesterType: string) {
    this.requireProvider(requesterType);
    const ownerId = requesterType === 'ADMIN' ? dto.id_prestador : requesterId;

    if (ownerId !== requesterId && requesterType !== 'ADMIN') {
      throw new ForbiddenException('Você só pode criar serviços para o próprio perfil');
    }

    const profile = await this.requireProfile(ownerId);
    const category = await this.requireCategory(dto.id_categoria);
    const servico = this.servicosRepository.create({
      titulo: dto.titulo,
      descricao: dto.descricao ?? null,
      preco: Number(dto.preco),
      duracao_padrao: Number(dto.duracao_padrao),
      ativo: dto.ativo ?? true,
      id_prestador: ownerId,
      id_categoria: dto.id_categoria,
      prestador: profile,
      categoria: category,
    });

    try {
      return await this.servicosRepository.save(servico);
    } catch (error) {
      throw new BadRequestException('Não foi possível cadastrar o serviço');
    }
  }

  findAll() {
    return this.servicosRepository.find({ relations: { categoria: true, prestador: true } });
  }

  findByProvider(id_prestador: number) {
    return this.servicosRepository.find({
      where: { id_prestador },
      relations: { categoria: true },
    });
  }

  async update(id: number, dto: UpdateServicoDto, requesterId: number, requesterType: string) {
    this.requireProvider(requesterType);
    const servico = await this.requireService(id);
    if (requesterType !== 'ADMIN') this.requireOwnership(servico.id_prestador, requesterId);
    if (dto.id_categoria) await this.requireCategory(dto.id_categoria);
    Object.assign(servico, {
      ...dto,
      preco: dto.preco !== undefined ? Number(dto.preco) : servico.preco,
      duracao_padrao:
        dto.duracao_padrao !== undefined ? Number(dto.duracao_padrao) : servico.duracao_padrao,
    });
    return this.servicosRepository.save(servico);
  }

  async remove(id: number, requesterId: number, requesterType: string) {
    this.requireProvider(requesterType);
    const servico = await this.requireService(id);
    if (requesterType !== 'ADMIN') this.requireOwnership(servico.id_prestador, requesterId);
    await this.servicosRepository.remove(servico);
    return { message: 'Serviço removido com sucesso' };
  }

  private async requireProfile(id: number) {
    const profile = await this.perfisRepository.findOne({ where: { id_prestador: id } });
    if (!profile) throw new NotFoundException('Perfil de prestador não encontrado');
    return profile;
  }

  private requireProvider(type: string) {
    if (type !== 'PRESTADOR' && type !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas prestadores ou administradores podem gerenciar serviços',
      );
    }
  }

  private requireOwnership(ownerId: number, requesterId: number) {
    if (ownerId !== requesterId) throw new ForbiddenException('Você não pode alterar este serviço');
  }

  private async requireCategory(id: number) {
    const category = await this.categoriasRepository.findOne({ where: { id_categoria: id } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  private async requireService(id: number) {
    const service = await this.servicosRepository.findOne({ where: { id_servico: id } });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return service;
  }
}
