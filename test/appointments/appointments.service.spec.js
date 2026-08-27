"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const appointments_service_1 = require("../../src/modules/appointments/appointments.service");
describe('AppointmentsService', () => {
    const repositories = () => ({
        appointments: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            create: jest.fn((value) => value),
            save: jest.fn((value) => Promise.resolve(value)),
        },
        reviews: { findOne: jest.fn(), create: jest.fn((value) => value), save: jest.fn() },
        users: { findOne: jest.fn().mockResolvedValue({ id_usuario: 7 }) },
        profiles: { findOne: jest.fn().mockResolvedValue({ id_prestador: 12 }) },
        services: {
            findOne: jest.fn().mockResolvedValue({ id_servico: 3, id_prestador: 12, ativo: true }),
        },
    });
    it('allows a client to list only their appointments', async () => {
        const mocks = repositories();
        mocks.appointments.find = jest.fn().mockResolvedValue([]);
        const service = new appointments_service_1.AppointmentsService(mocks.appointments, mocks.reviews, mocks.users, mocks.profiles, mocks.services);
        await service.findAllForUser(7, 'CLIENTE');
        expect(mocks.appointments.find).toHaveBeenCalledWith({
            where: { id_cliente: 7 },
            relations: { prestador: true, servico: true, avaliacao: true },
            order: { data_hora_inicio: 'ASC' },
        });
    });
    it('rejects a provider creating an appointment', async () => {
        const mocks = repositories();
        const service = new appointments_service_1.AppointmentsService(mocks.appointments, mocks.reviews, mocks.users, mocks.profiles, mocks.services);
        await expect(service.create({ id_servico: 3 }, 12, 'PRESTADOR')).rejects.toBeInstanceOf(common_1.ForbiddenException);
    });
    it('rejects a provider changing another provider appointment status', async () => {
        const mocks = repositories();
        mocks.appointments.findOne.mockResolvedValue({ id_agendamento: 1, id_prestador: 12 });
        const service = new appointments_service_1.AppointmentsService(mocks.appointments, mocks.reviews, mocks.users, mocks.profiles, mocks.services);
        await expect(service.updateStatus(1, { status: 'CONFIRMADO' }, 99, 'PRESTADOR')).rejects.toBeInstanceOf(common_1.ForbiddenException);
    });
    it('rejects a client reviewing another client appointment', async () => {
        const mocks = repositories();
        mocks.appointments.findOne.mockResolvedValue({ id_agendamento: 1, id_cliente: 8 });
        const service = new appointments_service_1.AppointmentsService(mocks.appointments, mocks.reviews, mocks.users, mocks.profiles, mocks.services);
        await expect(service.createReview(1, { nota_estrelas: 5 }, 7, 'CLIENTE')).rejects.toBeInstanceOf(common_1.ForbiddenException);
    });
    it('rejects an overlapping appointment', async () => {
        const mocks = repositories();
        const queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ id_agendamento: 2 }),
        };
        mocks.appointments.createQueryBuilder.mockReturnValue(queryBuilder);
        const service = new appointments_service_1.AppointmentsService(mocks.appointments, mocks.reviews, mocks.users, mocks.profiles, mocks.services);
        await expect(service.create({
            id_servico: 3,
            data_hora_inicio: '2026-09-01T10:00:00Z',
            data_hora_fim: '2026-09-01T11:00:00Z',
        }, 7, 'CLIENTE')).rejects.toBeInstanceOf(common_1.ConflictException);
    });
    it('derives the provider from the selected service', async () => {
        const mocks = repositories();
        const queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
        };
        mocks.appointments.createQueryBuilder.mockReturnValue(queryBuilder);
        const service = new appointments_service_1.AppointmentsService(mocks.appointments, mocks.reviews, mocks.users, mocks.profiles, mocks.services);
        await service.create({
            id_servico: 3,
            id_prestador: 99,
            data_hora_inicio: '2026-09-01T10:00:00Z',
            data_hora_fim: '2026-09-01T11:00:00Z',
        }, 7, 'CLIENTE');
        expect(mocks.appointments.create).toHaveBeenCalledWith({
            id_cliente: 7,
            id_prestador: 12,
            id_servico: 3,
            data_hora_inicio: new Date('2026-09-01T10:00:00Z'),
            data_hora_fim: new Date('2026-09-01T11:00:00Z'),
        });
    });
});
//# sourceMappingURL=appointments.service.spec.js.map