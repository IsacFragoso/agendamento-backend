import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { PerfilPrestador } from './entities/perfil-prestador.entity';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { UpsertPerfilPrestadorDto } from './dto/upsert-perfil-prestador.dto';
import { SearchPrestadoresDto } from './dto/search-prestadores.dto';
import { isValidPhoneNumber, sanitizePhoneNumber } from '../../common/utils/phone.util';
import { CloudinaryService, UploadedImageFile } from '../../common/storage/cloudinary.service';
import { DistanceUtilService } from '../../common/utils/distance.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(PerfilPrestador)
    private readonly perfisRepository: Repository<PerfilPrestador>,
    @Optional() private readonly distanceUtil?: DistanceUtilService,
    @Optional() private readonly cloudinaryService?: CloudinaryService,
  ) {}

  async create(dto: CreateUsuarioDto) {
    const existing = await this.usuariosRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const telefone = this.normalizePhoneOrThrow(dto.telefone);
    const nomeCompleto =
      dto.nome_completo?.trim() ||
      dto.email
        .split('@')[0]
        .replace(/[._+-]+/g, ' ')
        .trim() ||
      'Cliente';

    const usuario = this.usuariosRepository.create({
      nome_completo: nomeCompleto.length >= 2 ? nomeCompleto : 'Cliente',
      email: dto.email,
      telefone,
      foto_perfil: dto.foto_perfil ?? null,
      tipo_conta: 'CLIENTE',
      senha_hash: await bcryptjs.hash(dto.senha, 10),
    });
    const saved = await this.usuariosRepository.save(usuario);

    return this.withoutPassword(saved);
  }

  async findAll() {
    const usuarios = await this.usuariosRepository.find({
      where: { deleted_at: IsNull() },
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
      .where('usuario.deleted_at IS NULL')
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
        'usuario.foto_perfil',
        'perfil.id_usuario',
        'perfil.latitude',
        'perfil.longitude',
        'perfil.bio',
        'perfil.imagem_banner',
        'servico.id_servico',
        'servico.titulo',
        'servico.descricao',
        'servico.preco',
        'servico.duracao_padrao',
        'categoria.id_categoria',
        'categoria.nome',
      ])
      .getMany();

    return providers.map((provider) => {
      const services = (provider.servicos ?? provider.perfil_prestador?.servicos) ?? [];
      return ({
      id_prestador: provider.id_usuario,
      nome_completo: provider.nome_completo,
      distancia_km:
        hasLatitude && hasLongitude
          ? this.distanceUtil?.calcularDistanciaKm(
              dto.latitude!,
              dto.longitude!,
              Number(provider.perfil_prestador?.latitude),
              Number(provider.perfil_prestador?.longitude),
            )
          : null,
      perfil: provider.perfil_prestador
        ? {
            foto_perfil: provider.foto_perfil,
            bio: provider.perfil_prestador.bio,
            imagem_banner: provider.perfil_prestador.imagem_banner,
          }
        : null,
      servicos: services.map((service) => ({
        id_servico: service.id_servico,
        titulo: service.titulo,
        descricao: service.descricao,
        preco: service.preco == null ? null : Number(service.preco),
        duracao_padrao: service.duracao_padrao,
        categoria: service.categoria,
      })),
    });
    });
  }

  async findOne(id: number, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode consultar a própria conta');
    }
    const usuario = await this.usuariosRepository.findOne({
      where: { id_usuario: id, deleted_at: IsNull() },
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
    const telefone =
      dto.telefone === undefined ? usuario.telefone : this.normalizePhoneOrThrow(dto.telefone);

    Object.assign(usuario, {
      ...dto,
      telefone,
    });
    return this.withoutPassword(await this.usuariosRepository.save(usuario));
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
    requesterId: number,
    requesterType: string,
  ) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode alterar a própria senha');
    }
    if (dto.nova_senha !== dto.confirmar_senha) {
      throw new BadRequestException('A confirmação da nova senha não confere');
    }

    const usuario = await this.findEntity(id);
    const currentPasswordMatches = await bcryptjs.compare(dto.senha_atual, usuario.senha_hash);
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('A senha atual está incorreta');
    }
    if (dto.senha_atual === dto.nova_senha) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual');
    }

    usuario.senha_hash = await bcryptjs.hash(dto.nova_senha, 10);
    await this.usuariosRepository.save(usuario);
    return { message: 'Senha alterada com sucesso' };
  }

  async becomeProvider(
    id: number,
    dto: BecomeProviderDto,
    requesterId: number,
    requesterType: string,
  ) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode solicitar o próprio perfil de prestador');
    }
    if (requesterType !== 'ADMIN' && requesterType !== 'CLIENTE') {
      throw new ForbiddenException('Apenas clientes podem iniciar este onboarding');
    }

    return this.usuariosRepository.manager.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(Usuario);
      const perfilRepository = manager.getRepository(PerfilPrestador);
      const usuario = await usuarioRepository.findOne({
        where: { id_usuario: id, deleted_at: IsNull() },
      });

      if (!usuario) throw new NotFoundException('Usuário não encontrado');
      if (usuario.tipo_conta === 'PRESTADOR') {
        throw new ConflictException('Este usuário já é prestador');
      }
      if (usuario.tipo_conta !== 'CLIENTE' && requesterType !== 'ADMIN') {
        throw new ForbiddenException('Apenas clientes podem iniciar este onboarding');
      }

      const perfil = perfilRepository.create({
        id_usuario: id,
        bio: dto.bio,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      });
      await perfilRepository.save(perfil);

      usuario.tipo_conta = 'PRESTADOR';
      const savedUser = await usuarioRepository.save(usuario);

      return {
        usuario: this.withoutPassword(savedUser),
        perfil_prestador: perfil,
      };
    });
  }

  async remove(id: number, requesterId: number, requesterType: string) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode remover a própria conta');
    }

    return this.usuariosRepository.manager.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(Usuario);
      const servicoRepository = manager.getRepository('servico');
      const usuario = await usuarioRepository.findOne({ where: { id_usuario: id } });

      if (!usuario) throw new NotFoundException('Usuário não encontrado');
      if (usuario.deleted_at) return { message: 'Usuário já foi removido' };

      usuario.deleted_at = new Date();
      await usuarioRepository.save(usuario);

      await servicoRepository.update({ id_prestador: id }, { ativo: false });

      return { message: 'Dados pessoais removidos com sucesso' };
    });
  }

  async uploadProfilePhoto(
    id: number,
    file: UploadedImageFile,
    requesterId: number,
    requesterType: string,
  ) {
    if (requesterType !== 'ADMIN' && id !== requesterId) {
      throw new ForbiddenException('Você só pode alterar a própria foto de perfil');
    }

    const cloudinaryService = this.cloudinaryService;
    if (!cloudinaryService) {
      throw new BadRequestException('Upload de imagens não está configurado');
    }

    const usuario = await this.findEntity(id);
    const image = await cloudinaryService.uploadImage(file, `agendamento/users/${id}`);
    usuario.foto_perfil = image.url;
    return this.withoutPassword(await this.usuariosRepository.save(usuario));
  }

  async uploadProviderBanner(
    id: number,
    file: UploadedImageFile,
    requesterId: number,
    requesterType: string,
  ) {
    if (requesterType !== 'ADMIN' && (requesterType !== 'PRESTADOR' || id !== requesterId)) {
      throw new ForbiddenException('Você só pode alterar o próprio banner profissional');
    }

    const cloudinaryService = this.cloudinaryService;
    if (!cloudinaryService) {
      throw new BadRequestException('Upload de imagens não está configurado');
    }

    const usuario = await this.findEntity(id);
    if (usuario.tipo_conta !== 'PRESTADOR' && requesterType !== 'ADMIN') {
      throw new ForbiddenException('Apenas prestadores podem alterar o banner profissional');
    }
    const perfil = await this.perfisRepository.findOne({ where: { id_usuario: id } });
    if (!perfil) throw new NotFoundException('Perfil de prestador não encontrado');

    const image = await cloudinaryService.uploadImage(file, `agendamento/providers/${id}`);
    perfil.imagem_banner = image.url;
    return this.perfisRepository.save(perfil);
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
    const perfil = await this.perfisRepository.findOne({ where: { id_usuario: id } });
    const saved = await this.perfisRepository.save(
      this.perfisRepository.create({ ...(perfil ?? {}), id_usuario: id, ...dto }),
    );
    return saved;
  }

  private async findEntity(id: number) {
    const usuario = await this.usuariosRepository.findOne({
      where: { id_usuario: id, deleted_at: IsNull() },
    });
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

  private normalizePhoneOrThrow(value: string | undefined | null) {
    const telefone = sanitizePhoneNumber(value);

    if (telefone === null) {
      return null;
    }

    if (!isValidPhoneNumber(telefone)) {
      throw new BadRequestException('Telefone deve conter 11 dígitos');
    }

    return telefone;
  }
}
