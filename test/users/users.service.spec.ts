import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';

describe('UsersService', () => {
  it('searches non-deleted providers and returns public service data', async () => {
    const query = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_usuario: 4,
          nome_completo: 'Ana Prestadora',
          foto_perfil: null,
          perfil_prestador: { bio: 'Profissional' },
          servicos: [
            {
              id_servico: 2,
              titulo: 'Manicure',
              descricao: 'Serviço',
              preco: 40,
              duracao_padrao: 60,
              categoria: { id_categoria: 1, nome: 'Beleza' },
            },
          ],
        },
      ]),
    };
    const repository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new UsersService(repository as any, {} as any);

    await expect(service.searchProviders({ nome: 'Ana' })).resolves.toEqual([
      {
        id_prestador: 4,
        nome_completo: 'Ana Prestadora',
        distancia_km: null,
        perfil: { bio: 'Profissional', foto_perfil: null },
        servicos: [
          {
            id_servico: 2,
            titulo: 'Manicure',
            descricao: 'Serviço',
            imagem_url: undefined,
            preco: 40,
            duracao_padrao: 60,
            categoria: { id_categoria: 1, nome: 'Beleza' },
          },
        ],
      },
    ]);
    expect(query.andWhere).toHaveBeenCalledWith('usuario.nome_completo ILIKE :name', {
      name: '%Ana%',
    });
    expect(query.select).toHaveBeenCalled();
  });

  it('requires latitude and longitude together', async () => {
    const service = new UsersService({} as any, {} as any);

    await expect(service.searchProviders({ latitude: -23.5 })).rejects.toThrow(
      'Latitude e longitude devem ser informadas juntas',
    );
  });

  it('does not allow a user to inspect another account', async () => {
    const service = new UsersService({} as any, {} as any);

    await expect(service.findOne(10, 11, 'CLIENTE')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not allow a user to anonymize another account', async () => {
    const service = new UsersService({} as any, {} as any);

    await expect(service.remove(10, 11, 'CLIENTE')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sanitizes masked phone numbers on user creation', async () => {
    const savedUser = {
      id_usuario: 7,
      nome_completo: 'Client',
      email: 'client@example.com',
      telefone: '11999998888',
      tipo_conta: 'CLIENTE',
      senha_hash: 'hash',
      ativo: true,
    };
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockResolvedValue(savedUser),
    };
    const perfilRepository = { save: jest.fn(), create: jest.fn() };
    const service = new UsersService(usuarioRepository as any, perfilRepository as any);

    await service.create({
      nome_completo: 'Client',
      email: 'client@example.com',
      telefone: '(11) 99999 - 8888',
      tipo_conta: 'CLIENTE',
      senha: 'password123',
    });

    expect(usuarioRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: '11999998888', tipo_conta: 'CLIENTE' }),
    );
  });

  it('creates regular users from email when signup omits a name and account type', async () => {
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation(async (value) => ({ id_usuario: 7, ...value })),
    };
    const perfilRepository = { save: jest.fn(), create: jest.fn() };
    const service = new UsersService(usuarioRepository as any, perfilRepository as any);

    await service.create({
      email: 'new.client@example.com',
      telefone: '11999998888',
      senha: 'password123',
    });

    expect(usuarioRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nome_completo: 'new client',
        tipo_conta: 'CLIENTE',
      }),
    );
    expect(perfilRepository.save).not.toHaveBeenCalled();
  });

  it('rejects invalid phone numbers on user creation', async () => {
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new UsersService(usuarioRepository as any, {} as any);

    await expect(
      service.create({
        nome_completo: 'Client',
        email: 'client@example.com',
        telefone: '1199999',
        tipo_conta: 'CLIENTE',
        senha: 'password123',
      }),
    ).rejects.toThrow('Telefone deve conter 11 dígitos');
  });

  it('sanitizes masked phone numbers on user update', async () => {
    const usuario = {
      id_usuario: 7,
      nome_completo: 'Client',
      email: 'client@example.com',
      telefone: '11911112222',
      data_nascimento: null,
      tipo_conta: 'CLIENTE',
      senha_hash: 'hash',
      ativo: true,
    };
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(usuario),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const service = new UsersService(usuarioRepository as any, {} as any);

    const result = await service.update(7, { telefone: '(11) 98888 - 7777' }, 7, 'CLIENTE');

    expect(usuarioRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ telefone: '11988887777' }),
    );
    expect(result).toEqual(expect.objectContaining({ telefone: '11988887777' }));
  });

  it('soft deletes the user and deactivates provider services', async () => {
    const usuario = {
      id_usuario: 10,
      nome_completo: 'Maria Silva',
      email: 'maria@example.com',
      telefone: '11999999999',
      data_cadastro: new Date('2026-09-30T12:00:00.000Z'),
      tipo_conta: 'PRESTADOR',
      senha_hash: 'hash',
      deleted_at: null,
    };
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(usuario),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const servicoRepository = { update: jest.fn().mockResolvedValue({}) };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === 'servico') return servicoRepository;
        if (entity.name === 'Usuario') return usuarioRepository;
        return {};
      }),
    };
    const repository = {
      manager: {
        transaction: jest.fn((callback) => callback(manager)),
      },
    };
    const service = new UsersService(repository as any, {} as any);

    await expect(service.remove(10, 10, 'PRESTADOR')).resolves.toEqual({
      message: 'Dados pessoais removidos com sucesso',
    });
    expect(usuario.nome_completo).toBe('Maria Silva');
    expect(usuario.email).toBe('maria@example.com');
    expect(usuario.deleted_at).toBeInstanceOf(Date);
    expect(servicoRepository.update).toHaveBeenCalledWith({ id_prestador: 10 }, { ativo: false });
  });

  it('promotes a client and creates a provider profile during onboarding', async () => {
    const usuario = {
      id_usuario: 12,
      nome_completo: 'Joana Cliente',
      email: 'joana@example.com',
      tipo_conta: 'CLIENTE',
      senha_hash: 'hash',
      deleted_at: null,
    };
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(usuario),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const perfil = {
      id_usuario: 12,
      bio: 'Especialista em beleza',
      latitude: -21.2,
      longitude: -50.3,
    };
    const perfilRepository = {
      create: jest.fn().mockReturnValue(perfil),
      save: jest.fn().mockResolvedValue(perfil),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity.name === 'Usuario' ? usuarioRepository : perfilRepository,
      ),
    };
    const repository = {
      manager: {
        transaction: jest.fn((callback) => callback(manager)),
      },
    };
    const service = new UsersService(repository as any, {} as any);

    await expect(
      service.becomeProvider(
        12,
        { bio: perfil.bio, latitude: perfil.latitude, longitude: perfil.longitude },
        12,
        'CLIENTE',
      ),
    ).resolves.toEqual({
      usuario: expect.objectContaining({ id_usuario: 12, tipo_conta: 'PRESTADOR' }),
      perfil_prestador: perfil,
    });
    expect(perfilRepository.save).toHaveBeenCalledWith(perfil);
    expect(usuarioRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_conta: 'PRESTADOR' }),
    );
  });
});
