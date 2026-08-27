"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const test_app_1 = require("../support/test-app");
describe('Users API', () => {
    let context;
    beforeAll(async () => {
        context = await (0, test_app_1.createTestApp)();
    });
    afterAll(() => context.app.close());
    beforeEach(() => context.reset());
    it('creates users through public registration', async () => {
        await (0, supertest_1.default)(context.app.getHttpServer())
            .post('/usuarios')
            .send({
            nome_completo: 'Client',
            email: 'client@example.com',
            tipo_conta: 'CLIENTE',
            senha: 'password',
        })
            .expect(201);
        expect(context.usersService.create).toHaveBeenCalled();
    });
    it('rejects protected routes without authentication', async () => {
        context.setAuthenticated(false);
        await (0, supertest_1.default)(context.app.getHttpServer()).get('/usuarios/7').expect(401);
    });
    it('forwards the requester identity when viewing a user', async () => {
        await (0, supertest_1.default)(context.app.getHttpServer()).get('/usuarios/8').expect(200);
        expect(context.usersService.findOne).toHaveBeenCalledWith(8, 7, 'CLIENTE');
        await (0, supertest_1.default)(context.app.getHttpServer()).get('/usuarios/7').expect(200);
        expect(context.usersService.findOne).toHaveBeenCalledWith(7, 7, 'CLIENTE');
        context.setUser({ sub: 1, tipo_conta: 'ADMIN' });
        await (0, supertest_1.default)(context.app.getHttpServer()).get('/usuarios/8').expect(200);
        expect(context.usersService.findOne).toHaveBeenCalledWith(8, 1, 'ADMIN');
    });
    it('restricts the user list to administrators', async () => {
        await (0, supertest_1.default)(context.app.getHttpServer()).get('/usuarios').expect(403);
        context.setUser({ sub: 1, tipo_conta: 'ADMIN' });
        await (0, supertest_1.default)(context.app.getHttpServer()).get('/usuarios').expect(200);
    });
    it('passes the authenticated identity to account deletion', async () => {
        await (0, supertest_1.default)(context.app.getHttpServer()).delete('/usuarios/7').expect(200);
        expect(context.usersService.remove).toHaveBeenCalledWith(7, 7, 'CLIENTE');
    });
});
//# sourceMappingURL=users.api.e2e-spec.js.map