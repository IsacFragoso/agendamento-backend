"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const test_app_1 = require("../support/test-app");
describe('Services API', () => {
    let context;
    beforeAll(async () => {
        context = await (0, test_app_1.createTestApp)();
    });
    afterAll(() => context.app.close());
    beforeEach(() => context.reset());
    it('passes provider identity to service management', async () => {
        context.setUser({ sub: 12, tipo_conta: 'PRESTADOR' });
        await (0, supertest_1.default)(context.app.getHttpServer())
            .post('/servicos')
            .send({ id_prestador: 12 })
            .expect(201);
        expect(context.servicesService.create).toHaveBeenCalledWith(expect.anything(), 12, 'PRESTADOR');
    });
    it('restricts category management to administrators', async () => {
        await (0, supertest_1.default)(context.app.getHttpServer())
            .post('/categorias')
            .send({ nome: 'Beleza' })
            .expect(403);
        context.setUser({ sub: 1, tipo_conta: 'ADMIN' });
        await (0, supertest_1.default)(context.app.getHttpServer())
            .post('/categorias')
            .send({ nome: 'Beleza' })
            .expect(201);
    });
});
//# sourceMappingURL=services.api.e2e-spec.js.map