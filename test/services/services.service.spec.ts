import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ServicesService } from '../../src/modules/services/services.service';

describe('ServicesService', () => {
  it('returns a conflict when concurrent category creation violates the unique key', async () => {
    const categoriesRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn().mockRejectedValue({ driverError: { code: '23505' } }),
    };
    const service = new ServicesService(categoriesRepository as any, {} as any, {} as any);

    await expect(service.createCategory({ nome: 'Beleza' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects service creation by a client', async () => {
    const service = new ServicesService({} as any, {} as any, {} as any);

    await expect(
      service.create({ id_prestador: 2, id_categoria: 1 } as any, 1, 'CLIENTE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a provider changing another provider service', async () => {
    const servicesRepository = {
      findOne: jest.fn().mockResolvedValue({ id_servico: 4, id_prestador: 9 }),
    };
    const service = new ServicesService({} as any, servicesRepository as any, {} as any);

    await expect(service.update(4, {}, 10, 'PRESTADOR')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an admin to create a service for another provider', async () => {
    const categoriesRepository = {
      findOne: jest.fn().mockResolvedValue({ id_categoria: 3 }),
    };
    const servicesRepository = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const profilesRepository = {
      findOne: jest.fn().mockResolvedValue({ id_usuario: 12 }),
    };
    const service = new ServicesService(
      categoriesRepository as any,
      servicesRepository as any,
      profilesRepository as any,
    );
    const dto = {
      id_prestador: 12,
      id_categoria: 3,
      titulo: 'Serviço admin',
      descricao: 'Descrição',
      preco: 99.9,
      duracao_padrao: 60,
    };

    await expect(service.create(dto as any, 1, 'ADMIN')).resolves.toEqual(
      expect.objectContaining(dto),
    );
    expect(profilesRepository.findOne).toHaveBeenCalledWith({ where: { id_usuario: 12 } });
  });

  it('archives a service without deleting its appointment history', async () => {
    const serviceRecord = { id_servico: 4, id_prestador: 12, ativo: true };
    const servicesRepository = {
      findOne: jest.fn().mockResolvedValue(serviceRecord),
      save: jest.fn().mockImplementation(async (value) => value),
      remove: jest.fn(),
    };
    const service = new ServicesService({} as any, servicesRepository as any, {} as any);

    await expect(service.remove(4, 12, 'PRESTADOR')).resolves.toEqual({
      message: 'Serviço arquivado com sucesso',
    });
    expect(servicesRepository.save).toHaveBeenCalledWith({
      id_servico: 4,
      id_prestador: 12,
      ativo: false,
    });
    expect(servicesRepository.remove).not.toHaveBeenCalled();
  });
});
