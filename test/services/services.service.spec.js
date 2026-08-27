"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const services_service_1 = require("../../src/modules/services/services.service");
describe('ServicesService', () => {
    it('rejects service creation by a client', async () => {
        const service = new services_service_1.ServicesService({}, {}, {});
        await expect(service.create({ id_prestador: 2, id_categoria: 1 }, 1, 'CLIENTE')).rejects.toBeInstanceOf(common_1.ForbiddenException);
    });
    it('rejects a provider changing another provider service', async () => {
        const servicesRepository = {
            findOne: jest.fn().mockResolvedValue({ id_servico: 4, id_prestador: 9 }),
        };
        const service = new services_service_1.ServicesService({}, servicesRepository, {});
        await expect(service.update(4, {}, 10, 'PRESTADOR')).rejects.toBeInstanceOf(common_1.ForbiddenException);
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
        const service = new services_service_1.ServicesService(categoriesRepository, servicesRepository, profilesRepository);
        const dto = { id_prestador: 12, id_categoria: 3, titulo: 'Serviço admin' };
        await expect(service.create(dto, 1, 'ADMIN')).resolves.toEqual(dto);
        expect(profilesRepository.findOne).toHaveBeenCalledWith({ where: { id_prestador: 12 } });
    });
});
//# sourceMappingURL=services.service.spec.js.map