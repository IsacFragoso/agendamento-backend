import { SchedulesService } from '../../src/modules/schedules/schedules.service';

describe('SchedulesService', () => {
  it('returns an existing identical interval instead of inserting a duplicate', async () => {
    const existing = { id_horario: 5, dia_semana: 2, hora_inicio: '08:00', hora_fim: '12:00' };
    const horariosRepository = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const service = new SchedulesService(
      { findOne: jest.fn().mockResolvedValue({ id_usuario: 7 }) } as any,
      horariosRepository as any,
      {} as any,
      {} as any,
    );

    await expect(service.update(7, {
      dia_semana: 2,
      horario_inicio: '08:00',
      horario_fim: '12:00',
    }, 7, 'PRESTADOR')).resolves.toBe(existing);
    expect(horariosRepository.save).not.toHaveBeenCalled();
  });

  it('excludes time slots that overlap existing non-cancelled appointments', async () => {
    const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const bookingQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          data_hora_inicio: new Date(`${date}T09:00:00.000Z`),
          data_hora_fim: new Date(`${date}T10:00:00.000Z`),
        },
      ]),
    };
    const service = new SchedulesService(
      {} as any,
      { find: jest.fn().mockResolvedValue([{ hora_inicio: '08:00', hora_fim: '12:00' }]) } as any,
      { findOne: jest.fn().mockResolvedValue({ duracao_padrao: 60 }) } as any,
      { createQueryBuilder: jest.fn().mockReturnValue(bookingQuery) } as any,
    );

    await expect(service.getAvailableSlots(7, { servico_id: 2, data: date })).resolves.toEqual([
      '08:00',
      '10:00',
      '10:30',
      '11:00',
    ]);
    expect(bookingQuery.where).toHaveBeenCalledWith('agendamento.id_prestador = :provider', {
      provider: 7,
    });
  });
});