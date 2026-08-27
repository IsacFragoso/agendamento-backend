"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = createTestApp;
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const appointments_controller_1 = require("../../src/modules/appointments/appointments.controller");
const appointments_service_1 = require("../../src/modules/appointments/appointments.service");
const jwt_auth_guard_1 = require("../../src/modules/auth/strategies/jwt-auth.guard");
const admin_guard_1 = require("../../src/modules/auth/strategies/admin.guard");
const services_controller_1 = require("../../src/modules/services/services.controller");
const services_service_1 = require("../../src/modules/services/services.service");
const schedules_controller_1 = require("../../src/modules/schedules/schedules.controller");
const schedules_service_1 = require("../../src/modules/schedules/schedules.service");
const users_controller_1 = require("../../src/modules/users/users.controller");
const users_service_1 = require("../../src/modules/users/users.service");
async function createTestApp() {
    let authenticated = true;
    let currentUser = { sub: 7, tipo_conta: 'CLIENTE' };
    const usersService = {
        create: jest.fn().mockResolvedValue({ id_usuario: 7, email: 'client@example.com' }),
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id_usuario: 7 }),
        update: jest.fn().mockResolvedValue({ id_usuario: 7 }),
        remove: jest.fn().mockResolvedValue({ message: 'Dados pessoais removidos com sucesso' }),
        upsertProfile: jest.fn().mockResolvedValue({ id_prestador: 7 }),
    };
    const servicesService = {
        createCategory: jest.fn().mockResolvedValue({ id_categoria: 1 }),
        findCategories: jest.fn().mockResolvedValue([]),
        updateCategory: jest.fn().mockResolvedValue({ id_categoria: 1 }),
        removeCategory: jest.fn().mockResolvedValue({ message: 'Categoria removida com sucesso' }),
        create: jest.fn().mockResolvedValue({ id_servico: 1 }),
        findAll: jest.fn().mockResolvedValue([]),
        findByProvider: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id_servico: 1 }),
        remove: jest.fn().mockResolvedValue({ message: 'Serviço removido com sucesso' }),
    };
    const schedulesService = {
        findByProvider: jest.fn().mockResolvedValue({ id_prestador: 7 }),
        update: jest.fn().mockResolvedValue({ id_prestador: 7 }),
        clear: jest.fn().mockResolvedValue({ id_prestador: 7 }),
    };
    const appointmentsService = {
        create: jest.fn().mockResolvedValue({ id_agendamento: 1 }),
        findAllForUser: jest.fn().mockResolvedValue([]),
        findOneForUser: jest.fn().mockResolvedValue({ id_agendamento: 1 }),
        findByClient: jest.fn().mockResolvedValue([]),
        findByProvider: jest.fn().mockResolvedValue([]),
        updateStatus: jest.fn().mockResolvedValue({ status: 'CONFIRMADO' }),
        createReview: jest.fn().mockResolvedValue({ id_avaliacao: 1 }),
        findReview: jest.fn().mockResolvedValue({ id_avaliacao: 1 }),
        updateReview: jest.fn().mockResolvedValue({ id_avaliacao: 1 }),
        removeReview: jest.fn().mockResolvedValue({ message: 'Avaliação removida com sucesso' }),
    };
    const moduleRef = await testing_1.Test.createTestingModule({
        controllers: [users_controller_1.UsersController, services_controller_1.ServicesController, schedules_controller_1.SchedulesController, appointments_controller_1.AppointmentsController],
        providers: [
            { provide: users_service_1.UsersService, useValue: usersService },
            { provide: services_service_1.ServicesService, useValue: servicesService },
            { provide: schedules_service_1.SchedulesService, useValue: schedulesService },
            { provide: appointments_service_1.AppointmentsService, useValue: appointmentsService },
            {
                provide: admin_guard_1.AdminGuard,
                useValue: {
                    canActivate: (context) => context.switchToHttp().getRequest().user?.tipo_conta === 'ADMIN',
                },
            },
        ],
    })
        .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
        .useValue({
        canActivate: (context) => {
            if (!authenticated)
                throw new common_1.UnauthorizedException();
            context.switchToHttp().getRequest().user = currentUser;
            return true;
        },
    })
        .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    return {
        app,
        usersService,
        servicesService,
        schedulesService,
        appointmentsService,
        setUser(user) {
            currentUser = user;
        },
        setAuthenticated(value) {
            authenticated = value;
        },
        reset() {
            authenticated = true;
            currentUser = { sub: 7, tipo_conta: 'CLIENTE' };
            jest.clearAllMocks();
        },
    };
}
//# sourceMappingURL=test-app.js.map