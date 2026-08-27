import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppointmentsController } from '../../src/modules/appointments/appointments.controller';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { JwtAuthGuard } from '../../src/modules/auth/strategies/jwt-auth.guard';
import { AdminGuard } from '../../src/modules/auth/strategies/admin.guard';
import { ServicesController } from '../../src/modules/services/services.controller';
import { ServicesService } from '../../src/modules/services/services.service';
import { SchedulesController } from '../../src/modules/schedules/schedules.controller';
import { SchedulesService } from '../../src/modules/schedules/schedules.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';

export type TestUser = { sub: number; tipo_conta: string };

export async function createTestApp() {
  let authenticated = true;
  let currentUser: TestUser = { sub: 7, tipo_conta: 'CLIENTE' };
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

  const moduleRef = await Test.createTestingModule({
    controllers: [UsersController, ServicesController, SchedulesController, AppointmentsController],
    providers: [
      { provide: UsersService, useValue: usersService },
      { provide: ServicesService, useValue: servicesService },
      { provide: SchedulesService, useValue: schedulesService },
      { provide: AppointmentsService, useValue: appointmentsService },
      {
        provide: AdminGuard,
        useValue: {
          canActivate: (context: any) =>
            context.switchToHttp().getRequest().user?.tipo_conta === 'ADMIN',
        },
      },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        if (!authenticated) throw new UnauthorizedException();
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
    setUser(user: TestUser) {
      currentUser = user;
    },
    setAuthenticated(value: boolean) {
      authenticated = value;
    },
    reset() {
      authenticated = true;
      currentUser = { sub: 7, tipo_conta: 'CLIENTE' };
      jest.clearAllMocks();
    },
  };
}
