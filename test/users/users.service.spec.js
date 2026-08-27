"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const users_service_1 = require("../../src/modules/users/users.service");
describe('UsersService', () => {
    it('searches only active providers and returns public service data', async () => {
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
                    perfil_prestador: { bio: 'Profissional', foto_perfil: null },
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
        const service = new users_service_1.UsersService(repository, {});
        await expect(service.searchProviders({ nome: 'Ana' })).resolves.toEqual([
            {
                id_prestador: 4,
                nome_completo: 'Ana Prestadora',
                perfil: { bio: 'Profissional', foto_perfil: null },
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
        ]);
        expect(query.andWhere).toHaveBeenCalledWith('usuario.nome_completo ILIKE :name', {
            name: '%Ana%',
        });
        expect(query.select).toHaveBeenCalled();
    });
    it('requires latitude and longitude together', async () => {
        const service = new users_service_1.UsersService({}, {});
        await expect(service.searchProviders({ latitude: -23.5 })).rejects.toThrow('Latitude e longitude devem ser informadas juntas');
    });
    it('does not allow a user to inspect another account', async () => {
        const service = new users_service_1.UsersService({}, {});
        await expect(service.findOne(10, 11, 'CLIENTE')).rejects.toBeInstanceOf(common_1.ForbiddenException);
    });
    it('does not allow a user to anonymize another account', async () => {
        const service = new users_service_1.UsersService({}, {});
        await expect(service.remove(10, 11, 'CLIENTE')).rejects.toBeInstanceOf(common_1.ForbiddenException);
    });
    it('anonymizes the user and deactivates provider services', async () => {
        const usuario = {
            id_usuario: 10,
            nome_completo: 'Maria Silva',
            email: 'maria@example.com',
            telefone: '11999999999',
            data_nascimento: new Date('1990-01-01'),
            tipo_conta: 'PRESTADOR',
            senha_hash: 'hash',
            ativo: true,
        };
        const perfil = {
            id_prestador: 10,
            latitude: -23.5,
            longitude: -46.6,
            foto_perfil: 'photo.jpg',
            bio: 'Bio',
            dias_atendimento: 'SEGUNDA',
            horario_inicio: '08:00',
            horario_fim: '18:00',
        };
        const usuarioRepository = {
            findOne: jest.fn().mockResolvedValue(usuario),
            save: jest.fn().mockImplementation(async (value) => value),
        };
        const perfilRepository = {
            findOne: jest.fn().mockResolvedValue(perfil),
            save: jest.fn().mockImplementation(async (value) => value),
        };
        const servicoRepository = { update: jest.fn().mockResolvedValue({}) };
        const manager = {
            getRepository: jest.fn((entity) => {
                if (entity === 'servico')
                    return servicoRepository;
                if (entity.name === 'Usuario')
                    return usuarioRepository;
                return perfilRepository;
            }),
        };
        const repository = {
            manager: {
                transaction: jest.fn((callback) => callback(manager)),
            },
        };
        const service = new users_service_1.UsersService(repository, {});
        await expect(service.remove(10, 10, 'PRESTADOR')).resolves.toEqual({
            message: 'Dados pessoais removidos com sucesso',
        });
        expect(usuario.nome_completo).toBe('Usuário removido');
        expect(usuario.ativo).toBe(false);
        expect(usuario.email).toContain('@example.invalid');
        expect(perfil.foto_perfil).toBeNull();
        expect(servicoRepository.update).toHaveBeenCalledWith({ id_prestador: 10 }, { ativo: false });
    });
});
//# sourceMappingURL=users.service.spec.js.map