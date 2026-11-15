import {
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';
import { Usuario } from '../users/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RevokedToken } from './entities/revoked-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    @InjectRepository(RevokedToken)
    private readonly revokedTokensRepository: Repository<RevokedToken>,
    @Optional()
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepository?: Repository<PasswordResetToken>,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: dto.email },
      select: {
        id_usuario: true,
        nome_completo: true,
        email: true,
        telefone: true,
        data_cadastro: true,
        tipo_conta: true,
        foto_perfil: true,
        deleted_at: true,
        senha_hash: true,
      },
    });
    if (
      !usuario ||
      usuario.deleted_at ||
      !(await bcryptjs.compare(dto.senha, usuario.senha_hash))
    ) {
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
        data_cadastro: usuario.data_cadastro,
        tipo_conta: usuario.tipo_conta,
        foto_perfil: usuario.foto_perfil,
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

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const config = this.configService;
    const host = config?.get<string>('MAIL_HOST');
    const user = config?.get<string>('MAIL_USER');
    const password = config?.get<string>('MAIL_PASSWORD');
    const from = config?.get<string>('MAIL_FROM') || user;
    if (!host || !user || !password || !from) {
      throw new ServiceUnavailableException('A recuperação de senha por e-mail não está configurada');
    }

    const usuario = await this.usuariosRepository.findOne({
      where: { email: dto.email.trim().toLowerCase(), deleted_at: IsNull() },
    });
    if (!usuario) {
      return { message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.' };
    }

    const resetTokens = this.resetTokensRepository;
    if (!resetTokens) {
      throw new ServiceUnavailableException('A recuperação de senha não está disponível');
    }
    await resetTokens.update(
      { id_usuario: usuario.id_usuario, used_at: IsNull() },
      { used_at: new Date() },
    );

    const token = randomBytes(32).toString('hex');
    await resetTokens.save(resetTokens.create({
      id_usuario: usuario.id_usuario,
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      used_at: null,
    }));

    const port = Number(config?.get('MAIL_PORT', 587));
    const secure = config?.get<string>('MAIL_SECURE') === 'true';
    const transporter = createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });
    const frontendUrl = config?.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/recuperar-senha?token=${encodeURIComponent(token)}`;
    await transporter.sendMail({
      from,
      to: usuario.email,
      subject: 'Redefinição de senha',
      text: `Use este link para redefinir sua senha. Ele expira em 1 hora: ${resetUrl}`,
      html: `<p>Use o link abaixo para redefinir sua senha. Ele expira em 1 hora.</p><p><a href="${resetUrl}">Redefinir senha</a></p>`,
    });
    return { message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetTokens = this.resetTokensRepository;
    if (!resetTokens) {
      throw new ServiceUnavailableException('A recuperação de senha não está disponível');
    }
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const reset = await resetTokens.findOne({ where: { token_hash: tokenHash } });
    if (!reset || reset.used_at || reset.expires_at <= new Date()) {
      throw new BadRequestException('Este link de redefinição é inválido ou expirou');
    }

    await this.usuariosRepository.manager.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(PasswordResetToken);
      const userRepository = manager.getRepository(Usuario);
      const currentTime = new Date();
      const claim = await tokenRepository
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ used_at: currentTime })
        .where('"id" = :id', { id: reset.id })
        .andWhere('"used_at" IS NULL')
        .andWhere('"expires_at" > :now', { now: currentTime })
        .execute();
      if (claim.affected !== 1) {
        throw new BadRequestException('Este link de redefinição é inválido ou expirou');
      }
      const current = { ...reset, used_at: currentTime };
      const usuario = await userRepository.findOne({
        where: { id_usuario: current.id_usuario, deleted_at: IsNull() },
      });
      if (!usuario) throw new BadRequestException('Este link de redefinição é inválido ou expirou');
      usuario.senha_hash = await bcryptjs.hash(dto.nova_senha, 10);
      await userRepository.save(usuario);
    });
    return { message: 'Senha redefinida com sucesso. Faça login para continuar.' };
  }

  async isRevoked(token: string) {
    const found = await this.revokedTokensRepository.findOne({ where: { token } });
    return !!found;
  }
}
