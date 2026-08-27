"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const bcryptjs = __importStar(require("bcryptjs"));
const auth_service_1 = require("../../src/modules/auth/auth.service");
describe('AuthService', () => {
    it('returns token and user on successful login', async () => {
        const dto = { email: 'test@example.com', senha: 'plain' };
        const fakeUser = {
            id_usuario: 42,
            nome_completo: 'Test User',
            email: 'test@example.com',
            telefone: '123',
            data_nascimento: new Date('1990-01-01'),
            tipo_conta: 'CLIENTE',
            ativo: true,
            senha_hash: await bcryptjs.hash('plain', 1),
        };
        const usuariosRepo = { findOne: jest.fn().mockResolvedValue(fakeUser) };
        const jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
        const revokedRepo = {};
        const svc = new auth_service_1.AuthService(usuariosRepo, jwtService, revokedRepo);
        const res = await svc.login(dto);
        expect(res).toHaveProperty('access_token', 'signed-token');
        expect(res.usuario).toMatchObject({ id_usuario: 42, email: 'test@example.com' });
        expect(jwtService.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: 42, email: 'test@example.com' }));
    });
    it('throws UnauthorizedException for wrong credentials', async () => {
        const dto = { email: 'x@example.com', senha: 'wrong' };
        const usuariosRepo = { findOne: jest.fn().mockResolvedValue(null) };
        const jwtService = { sign: jest.fn() };
        const revokedRepo = {};
        const svc = new auth_service_1.AuthService(usuariosRepo, jwtService, revokedRepo);
        await expect(svc.login(dto)).rejects.toThrow(common_1.UnauthorizedException);
    });
});
//# sourceMappingURL=auth.service.spec.js.map