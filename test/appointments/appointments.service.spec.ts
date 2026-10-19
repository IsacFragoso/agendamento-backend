import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';

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
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await service.findAllForUser(7, 'CLIENTE');
    expect(mocks.appointments.find).toHaveBeenCalledWith({
      where: { id_cliente: 7 },
      relations: { prestador: true, servico: true, avaliacao: true },
      order: { data_hora_inicio: 'ASC' },
    });
  });

  it('allows a provider to list only appointments assigned to them', async () => {
    const mocks = repositories();
    mocks.appointments.find = jest.fn().mockResolvedValue([]);
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await service.findAllForUser(12, 'PRESTADOR');
    expect(mocks.appointments.find).toHaveBeenCalledWith({
      where: { id_prestador: 12 },
      relations: { cliente: true, prestador: true, servico: true, avaliacao: true },
      order: { data_hora_inicio: 'ASC' },
    });
  });

  it('rejects a provider booking their own service', async () => {
    const mocks = repositories();
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.create(
        {
          id_servico: 3,
          data_hora_inicio: '2030-01-01T10:00:00Z',
          data_hora_fim: '2030-01-01T11:00:00Z',
        } as any,
        12,
        'PRESTADOR',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.appointments.save).not.toHaveBeenCalled();
  });

  it('allows a provider to book another provider service', async () => {
    const mocks = repositories();
    mocks.appointments.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await service.create(
      {
        id_servico: 3,
        data_hora_inicio: '2030-01-01T10:00:00Z',
        data_hora_fim: '2030-01-01T11:00:00Z',
      } as any,
      99,
      'PRESTADOR',
    );
    expect(mocks.appointments.save).toHaveBeenCalledWith(
      expect.objectContaining({ id_cliente: 99, id_prestador: 12 }),
    );
  });

  it('rejects a provider changing another provider appointment status', async () => {
    const mocks = repositories();
    mocks.appointments.findOne.mockResolvedValue({ id_agendamento: 1, id_prestador: 12 });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.updateStatus(1, { status: 'CONFIRMADO' }, 99, 'PRESTADOR'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a client reviewing another client appointment', async () => {
    const mocks = repositories();
    mocks.appointments.findOne.mockResolvedValue({ id_agendamento: 1, id_cliente: 8 });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.createReview(1, { nota_estrelas: 5 }, 7, 'CLIENTE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects review creation unless the appointment is completed', async () => {
    const mocks = repositories();
    mocks.appointments.findOne.mockResolvedValue({
      id_agendamento: 1,
      id_cliente: 7,
      status: 'CONFIRMADO',
    });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.createReview(1, { nota_estrelas: 5 }, 7, 'CLIENTE'),
    ).rejects.toThrow('Só é possível avaliar agendamentos concluídos');
    expect(mocks.reviews.save).not.toHaveBeenCalled();
  });

  it('allows review creation for a completed appointment', async () => {
    const mocks = repositories();
    mocks.appointments.findOne.mockResolvedValue({
      id_agendamento: 1,
      id_cliente: 7,
      status: 'CONCLUIDO',
    });
    mocks.reviews.save.mockImplementation(async (review) => review);
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.createReview(1, { nota_estrelas: 5 }, 7, 'CLIENTE'),
    ).resolves.toEqual({ nota_estrelas: 5, id_agendamento: 1 });
  });

  it('rejects an overlapping appointment', async () => {
    const mocks = repositories();
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id_agendamento: 2 }),
    };
    mocks.appointments.createQueryBuilder.mockReturnValue(queryBuilder);
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.create(
        {
          id_servico: 3,
          data_hora_inicio: '2026-09-01T10:00:00Z',
          data_hora_fim: '2026-09-01T11:00:00Z',
        } as any,
        7,
        'CLIENTE',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('derives the provider from the selected service', async () => {
    const mocks = repositories();
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mocks.appointments.createQueryBuilder.mockReturnValue(queryBuilder);
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await service.create(
      {
        id_servico: 3,
        id_prestador: 99,
        data_hora_inicio: '2026-09-01T10:00:00Z',
        data_hora_fim: '2026-09-01T11:00:00Z',
      } as any,
      7,
      'CLIENTE',
    );
    expect(mocks.appointments.create).toHaveBeenCalledWith({
      id_cliente: 7,
      id_prestador: 12,
      id_servico: 3,
      data_hora_inicio: new Date('2026-09-01T10:00:00Z'),
      data_hora_fim: new Date('2026-09-01T11:00:00Z'),
    });
  });

  it('returns a conflict when the database exclusion constraint rejects a concurrent booking', async () => {
    const mocks = repositories();
    mocks.appointments.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    mocks.appointments.save.mockRejectedValue({ driverError: { code: '23P01' } });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(service.create({
      id_servico: 3,
      data_hora_inicio: '2026-09-01T10:00:00Z',
      data_hora_fim: '2026-09-01T11:00:00Z',
    } as any, 7, 'CLIENTE')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a booking that overlaps another appointment of the same client', async () => {
    const mocks = repositories();
    const getOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id_agendamento: 5 });
    mocks.appointments.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne,
    });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(service.create({
      id_servico: 3,
      data_hora_inicio: '2026-09-01T10:00:00Z',
      data_hora_fim: '2026-09-01T11:00:00Z',
    } as any, 7, 'CLIENTE')).rejects.toThrow('Você já possui um agendamento nesse horário');
    expect(mocks.appointments.save).not.toHaveBeenCalled();
  });

  it('maps the client exclusion constraint to a client-specific conflict', async () => {
    const mocks = repositories();
    mocks.appointments.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
    mocks.appointments.save.mockRejectedValue({
      driverError: { code: '23P01', constraint: 'EX_agendamento_cliente_sem_sobreposicao' },
    });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(service.create({
      id_servico: 3,
      data_hora_inicio: '2026-09-01T10:00:00Z',
      data_hora_fim: '2026-09-01T11:00:00Z',
    } as any, 7, 'CLIENTE')).rejects.toThrow('Você já possui um agendamento nesse horário');
  });

  it('returns a conflict when reactivating a cancelled appointment overlaps another', async () => {
    const mocks = repositories();
    mocks.appointments.findOne.mockResolvedValue({ id_agendamento: 1, id_prestador: 12 });
    mocks.appointments.save.mockRejectedValue({ driverError: { code: '23P01' } });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(
      service.updateStatus(1, { status: 'CONFIRMADO' }, 12, 'PRESTADOR'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a conflict if a related provider or service disappears during booking', async () => {
    const mocks = repositories();
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mocks.appointments.createQueryBuilder.mockReturnValue(queryBuilder);
    mocks.appointments.save.mockRejectedValue({ driverError: { code: '23503' } });
    const service = new AppointmentsService(
      mocks.appointments as any,
      mocks.reviews as any,
      mocks.users as any,
      mocks.profiles as any,
      mocks.services as any,
    );

    await expect(service.create({
      id_servico: 3,
      data_hora_inicio: '2026-09-01T10:00:00Z',
      data_hora_fim: '2026-09-01T11:00:00Z',
    } as any, 7, 'CLIENTE')).rejects.toBeInstanceOf(ConflictException);
  });
});
