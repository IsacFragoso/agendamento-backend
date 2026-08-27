"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const test_app_1 = require("../support/test-app");
describe('Schedules API', () => {
    let context;
    beforeAll(async () => {
        context = await (0, test_app_1.createTestApp)();
    });
    afterAll(() => context.app.close());
    beforeEach(() => context.reset());
    it('passes provider identity to schedule updates', async () => {
        context.setUser({ sub: 12, tipo_conta: 'PRESTADOR' });
        await (0, supertest_1.default)(context.app.getHttpServer()).put('/prestadores/12/horario').send({}).expect(200);
        expect(context.schedulesService.update).toHaveBeenCalledWith(12, {}, 12, 'PRESTADOR');
    });
});
//# sourceMappingURL=schedules.api.e2e-spec.js.map