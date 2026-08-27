import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { PerfilPrestador } from './entities/perfil-prestador.entity';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpsertPerfilPrestadorDto } from './dto/upsert-perfil-prestador.dto';
import { SearchPrestadoresDto } from './dto/search-prestadores.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
  ) {}

  async create(dto: CreateUsuarioDto) {
    const existing = await this.usuariosRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const usuario = this.usuariosRepository.create({
      nome_completo: dto.nome_completo,
      email: dto.email,
      telefone: dto.telefone ?? null,
      data_nascimento: dto.data_nascimento ? new Date(dto.data_nascimento) : null,
      tipo_conta: dto.tipo_conta,
      senha_hash: await bcryptjs.hash(dto.senha, 10),
    });
    const saved = await this.usuariosRepository.save(usuario);

    if (dto.tipo_conta === 'PRESTADOR') {
      await this.perfisRepository.save(
        this.perfisRepository.create({ id_prestador: saved.id_usuario }),
      );
    }

    return this.withoutPassword(saved);
  }

  async findAll() {
    const usuarios = await this.usuariosRepository.find({
      where: { ativo: true },
      relations: { perfil_prestador: true },
    });
    return usuarios.map((usuario) => this.withoutPassword(usuario));
  }

  async searchProviders(dto: SearchPrestadoresDto) {
    const hasLatitude = dto.latitude !== undefined;
    const hasLongitude = dto.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException('Latitude e longitude devem ser informadas juntas');
    }

    const query = this.usuariosRepository
      .createQueryBuilder('usuario')
      .innerJoinAndSelect('usuario.perfil_prestador', 'perfil')
      .leftJoinAndSelect('perfil.servicos', 'servico', 'servico.ativo = :serviceActive', {
        serviceActive: true,
      })
      .leftJoinAndSelect('servico.categoria', 'categoria')
      .where('usuario.ativo = :userActive', { userActive: true })
      .andWhere('usuario.tipo_conta = :providerType', { providerType: 'PRESTADOR' });

    if (dto.nome) {
      query.andWhere('usuario.nome_completo ILIKE :name', { name: `%${dto.nome}%` });
    }
    if (dto.categoria) {
      query.andWhere('categoria.nome ILIKE :category', { category: `%${dto.categoria}%` });
    }
    if (dto.servico) {
      query.andWhere('servico.titulo ILIKE :service', { service: `%${dto.servico}%` });
    }
    if (hasLatitude && hasLongitude) {
      const radius = dto.raio_km ?? 25;
      query.andWhere(
        `(6371 * acos(least(1, cos(radians(:latitude)) * cos(radians(perfil.latitude)) * cos(radians(perfil.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(perfil.latitude))))) <= :radius`,
        { latitude: dto.latitude, longitude: dto.longitude, radius },
      );
    }

    const providers = await query
      .select([
        'usuario.id_usuario',
        'usuario.nome_completo',
        'perfil.id_prestador',
        'perfil.latitude',
        'perfil.longitude',
        'perfil.foto_perfil',
        'perfil.bio',
        'servico.id_servico',
        'servico.titulo',
        'servico.descricao',
        'servico.preco',
        'servico.duracao_padrao',
        'categoria.id_categoria',
        'categoria.nome',
      ])
      .getMany();

    return providers.map((provider) => ({
      id_prestador: provider.id_usuario,
      nome_completo: provider.nome_completo,
      perfil: provider.perfil_prestador
        ? {
            latitude: provider.perfil_prestador.latitude,
            longitude: provider.perfil_prestador.longitude,
            foto_perfil: provider.perfil_prestador.foto_perfil,
            bio: provider.perfil_prestador.bio,
          }
        : null,
      servicos: (provider.servicos ?? []).map((service) => ({
        id_servico: service.id_servico,
        titulo: service.titulo,
        descricao: service.descricao,
        preco: service.preco,
        duracao_padrao: service.duracao_padrao,
        categoria: service.categoria,
      })),
    }));
  }

  async findOne(id: number, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode consultar a própria conta');
    }
    const usuario = await this.usuariosRepository.findOne({
      where: { id_usuario: id },
      relations: { perfil_prestador: true },
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.withoutPassword(usuario);
  }

  async update(id: number, dto: UpdateUsuarioDto, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode alterar a própria conta');
    }
    const usuario = await this.findEntity(id);
    Object.assign(usuario, {
      ...dto,
      data_nascimento: dto.data_nascimento
        ? new Date(dto.data_nascimento)
        : usuario.data_nascimento,
    });
    return this.withoutPassword(await this.usuariosRepository.save(usuario));
  }

  async remove(id: number, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode remover a própria conta');
    }

    return this.usuariosRepository.manager.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(Usuario);
      const perfilRepository = manager.getRepository(PerfilPrestador);
      const servicoRepository = manager.getRepository('servico');
      const usuario = await usuarioRepository.findOne({ where: { id_usuario: id } });

      if (!usuario) throw new NotFoundException('Usuário não encontrado');
      if (!usuario.ativo) return { message: 'Usuário já foi anonimizado' };

      usuario.nome_completo = 'Usuário removido';
      usuario.email = `deleted-user-${usuario.id_usuario}-${randomUUID()}@example.invalid`;
      usuario.telefone = null;
      usuario.data_nascimento = null;
      usuario.tipo_conta = 'REMOVIDO';
      usuario.senha_hash = await bcryptjs.hash(randomUUID(), 10);
      usuario.ativo = false;
      await usuarioRepository.save(usuario);

      const perfil = await perfilRepository.findOne({ where: { id_prestador: id } });
      if (perfil) {
        perfil.latitude = null;
        perfil.longitude = null;
        perfil.foto_perfil = null;
        perfil.bio = null;
        perfil.dias_atendimento = null;
        perfil.horario_inicio = null;
        perfil.horario_fim = null;
        await perfilRepository.save(perfil);
        await servicoRepository.update({ id_prestador: id }, { ativo: false });
      }

      return { message: 'Dados pessoais removidos com sucesso' };
    });
  }

  async upsertProfile(
    id: number,
    dto: UpsertPerfilPrestadorDto,
    requesterId: number,
    requesterType: string,
  ) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode alterar o próprio perfil');
    }
    await this.findEntity(id);
    const perfil = await this.perfisRepository.findOne({ where: { id_prestador: id } });
    const saved = await this.perfisRepository.save(
      this.perfisRepository.create({ ...(perfil ?? {}), id_prestador: id, ...dto }),
    );
    return saved;
  }

  private async findEntity(id: number) {
    const usuario = await this.usuariosRepository.findOne({ where: { id_usuario: id } });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return usuario;
  }

  private withoutPassword(usuario: Usuario) {
    const safeUser = Object.fromEntries(
      Object.entries(usuario).filter(([key]) => key !== 'senha_hash'),
    ) as Partial<Usuario>;
    return safeUser;
  }
}
