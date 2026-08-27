"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const testing_1 = require("@nestjs/testing");
const auth_controller_1 = require("../../src/modules/auth/auth.controller");
const auth_service_1 = require("../../src/modules/auth/auth.service");
describe('Auth API', () => {
    let app;
    const authService = {
        login: jest.fn(),
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [auth_controller_1.AuthController],
            providers: [{ provide: auth_service_1.AuthService, useValue: authService }],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    beforeEach(() => {
        authService.login.mockReset();
        authService.login.mockResolvedValue({
            access_token: 'signed-token',
            usuario: {
                id_usuario: 9,
                nome_completo: 'Alice Cliente',
                email: 'alice@example.com',
                telefone: '11999999999',
                data_nascimento: '1990-01-01',
                tipo_conta: 'CLIENTE',
                ativo: true,
            },
        });
    });
    afterAll(async () => {
        await app.close();
    });
    it('logs in with valid credentials', async () => {
        const payload = { email: 'alice@example.com', senha: 'secret' };
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/login')
            .send(payload)
            .expect(201);
        expect(authService.login).toHaveBeenCalledWith(payload);
        expect(response.body).toEqual({
            access_token: 'signed-token',
            usuario: {
                id_usuario: 9,
                nome_completo: 'Alice Cliente',
                email: 'alice@example.com',
                telefone: '11999999999',
                data_nascimento: '1990-01-01',
                tipo_conta: 'CLIENTE',
                ativo: true,
            },
        });
    });
});
//# sourceMappingURL=auth.api.e2e-spec.js.map