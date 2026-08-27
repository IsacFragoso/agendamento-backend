import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../users/entities/usuario.entity';
import { RevokedToken } from '../entities/revoked-token.entity';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(RevokedToken)
    private readonly revokedTokensRepository: Repository<RevokedToken>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub: number; email: string; tipo_conta: string; exp?: number },
  ) {
    const auth = req.headers?.authorization as string | undefined;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (token) {
      const found = await this.revokedTokensRepository.findOne({ where: { token } });
      if (found) {
        throw new UnauthorizedException('Token revogado');
      }
    }

    const usuario = await this.usuariosRepository.findOne({ where: { id_usuario: payload.sub } });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Conta desativada ou inexistente');
    }
    return payload;
  }
}
