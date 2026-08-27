import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '../users/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RevokedToken } from './entities/revoked-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokensRepository: Repository<RevokedToken>,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosRepository.findOne({ where: { email: dto.email } });
    if (!usuario || !usuario.ativo || !(await bcryptjs.compare(dto.senha, usuario.senha_hash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    return {
      access_token: this.jwtService.sign({
        sub: usuario.id_usuario,
        email: usuario.email,
        tipo_conta: usuario.tipo_conta,
      }),
      usuario: {
        id_usuario: usuario.id_usuario,
        nome_completo: usuario.nome_completo,
        email: usuario.email,
        telefone: usuario.telefone,
        data_nascimento: usuario.data_nascimento,
        tipo_conta: usuario.tipo_conta,
        ativo: usuario.ativo,
      },
    };
  }

  async logout(token: string | undefined, payload: { sub: number; exp?: number }) {
    if (!token) return { ok: false };
    const expiresAt = payload?.exp
      ? new Date(payload.exp * 1000)
      : new Date(Date.now() + 3600 * 1000);
    const revoked = this.revokedTokensRepository.create({ token, expires_at: expiresAt });
    await this.revokedTokensRepository.save(revoked);
    return { ok: true };
  }

  async isRevoked(token: string) {
    const found = await this.revokedTokensRepository.findOne({ where: { token } });
    return !!found;
  }
}
