import { ForbiddenException } from '@nestjs/common';
import { ServicesService } from '../../src/modules/services/services.service';

describe('ServicesService', () => {
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
      findOne: jest.fn().mockResolvedValue({ id_prestador: 12 }),
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
    expect(profilesRepository.findOne).toHaveBeenCalledWith({ where: { id_prestador: 12 } });
  });
});
