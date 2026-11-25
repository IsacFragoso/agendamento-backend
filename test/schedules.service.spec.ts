import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Agendamento } from '../src/modules/appointments/entities/agendamento.entity';
import { PerfilPrestador } from '../src/modules/users/entities/perfil-prestador.entity';
import { Horario } from '../src/modules/schedules/entities/horario.entity';
import { Servico } from '../src/modules/services/entities/servico.entity';
import { SchedulesService } from '../src/modules/schedules/schedules.service';

describe('SchedulesService interval management', () => {
  const scheduleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn((value) => value),
  };
  let service: SchedulesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SchedulesService(
      {} as unknown as Repository<PerfilPrestador>,
      scheduleRepository as unknown as Repository<Horario>,
      {} as unknown as Repository<Servico>,
      {} as unknown as Repository<Agendamento>,
    );
  });

  it('updates one interval without replacing the other intervals for that provider', async () => {
    const interval = {
      id_horario: 12,
      id_prestador: 7,
      dia_semana: 1,
      hora_inicio: '08:00:00',
      hora_fim: '12:00:00',
    };
    scheduleRepository.findOne.mockResolvedValue(interval);
    scheduleRepository.save.mockImplementation(async (value) => value);

    await service.updateInterval(
      7,
      12,
      { dia_semana: 2, horario_inicio: '09:00', horario_fim: '13:00' },
      7,
      'PRESTADOR',
    );

    expect(scheduleRepository.findOne).toHaveBeenCalledWith({
      where: { id_horario: 12, id_prestador: 7 },
    });
    expect(scheduleRepository.save).toHaveBeenCalledWith({
      ...interval,
      dia_semana: 2,
      hora_inicio: '09:00',
      hora_fim: '13:00',
    });
  });

  it('replaces the existing interval when another interval is saved for the same day', async () => {
    const existing = {
      id_horario: 12,
      id_prestador: 7,
      dia_semana: 1,
      hora_inicio: '08:00:00',
      hora_fim: '12:00:00',
    };
    scheduleRepository.find.mockResolvedValue([existing]);
    scheduleRepository.save.mockImplementation(async (value) => value);
    const replacementService = new SchedulesService(
      { findOne: jest.fn().mockResolvedValue({ id_usuario: 7 }) } as any,
      scheduleRepository as unknown as Repository<Horario>,
      {} as unknown as Repository<Servico>,
      {} as unknown as Repository<Agendamento>,
    );

    await replacementService.update(
      7,
      { dia_semana: 1, horario_inicio: '13:00', horario_fim: '18:00' },
      7,
      'PRESTADOR',
    );

    expect(scheduleRepository.find).toHaveBeenCalledWith({
      where: { id_prestador: 7, dia_semana: 1 },
      order: { id_horario: 'ASC' },
    });
    expect(scheduleRepository.save).toHaveBeenCalledWith({
      ...existing,
      hora_inicio: '13:00',
      hora_fim: '18:00',
    });
  });

  it('rejects invalid time intervals without persisting them', async () => {
    scheduleRepository.findOne.mockResolvedValue({
      id_horario: 12,
      id_prestador: 7,
      dia_semana: 1,
      hora_inicio: '08:00:00',
      hora_fim: '12:00:00',
    });

    await expect(
      service.updateInterval(
        7,
        12,
        { horario_inicio: '14:00', horario_fim: '13:00' },
        7,
        'PRESTADOR',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(scheduleRepository.save).not.toHaveBeenCalled();
  });

  it('prevents a provider from changing another provider schedule', async () => {
    await expect(
      service.updateInterval(
        7,
        12,
        { horario_inicio: '09:00', horario_fim: '13:00' },
        8,
        'PRESTADOR',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(scheduleRepository.findOne).not.toHaveBeenCalled();
  });

  it('removes only the selected interval', async () => {
    const interval = { id_horario: 12, id_prestador: 7 };
    scheduleRepository.findOne.mockResolvedValue(interval);
    scheduleRepository.remove.mockResolvedValue(interval);

    await service.removeInterval(7, 12, 7, 'PRESTADOR');

    expect(scheduleRepository.findOne).toHaveBeenCalledWith({
      where: { id_horario: 12, id_prestador: 7 },
    });
    expect(scheduleRepository.remove).toHaveBeenCalledWith(interval);
  });
});
