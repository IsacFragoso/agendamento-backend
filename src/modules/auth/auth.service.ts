import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { createTransport } from 'nodemailer';
import { Cron, CronExpression } from '@nestjs/schedule';
import { join } from 'path';
import { Usuario } from '../users/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RevokedToken } from './entities/revoked-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    const email = dto.email.trim().toLowerCase();
    const usuario = await this.usuariosRepository.findOne({
      where: { email },
      select: {
        id_usuario: true,
        nome_completo: true,
        email: true,
        telefone: true,
        data_cadastro: true,
        tipo_conta: true,
        foto_perfil: true,
        deleted_at: true,
        email_verified_at: true,
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
    if (usuario.email_verified_at === null) {
      throw new ForbiddenException('Verifique seu e-mail antes de acessar sua conta');
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
      throw new ServiceUnavailableException(
        'A recuperação de senha por e-mail não está configurada',
      );
    }

    const usuario = await this.usuariosRepository.findOne({
      where: { email: dto.email.trim().toLowerCase(), deleted_at: IsNull() },
    });
    if (!usuario) {
      return {
        message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.',
      };
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
    await resetTokens.save(
      resetTokens.create({
        id_usuario: usuario.id_usuario,
        token_hash: createHash('sha256').update(token).digest('hex'),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        used_at: null,
      }),
    );

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
      html: this.renderPasswordResetEmail(resetUrl),
    });
    return {
      message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.',
    };
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

  async sendEmailVerification(usuario: Usuario, ipAddress = 'unknown') {
    const mail = this.getEmailConfiguration();
    const allowed = await this.reserveEmailVerificationAttempt(
      usuario.email,
      ipAddress,
      usuario.id_usuario,
    );
    if (!allowed) return false;

    await this.deliverEmailVerification(usuario, mail);
    return true;
  }

  private getMailConfiguration() {
    const config = this.configService;
    const host = config?.get<string>('MAIL_HOST');
    const user = config?.get<string>('MAIL_USER');
    const password = config?.get<string>('MAIL_PASSWORD');
    const from = config?.get<string>('MAIL_FROM') || user;
    if (!host || !user || !password || !from) {
      throw new ServiceUnavailableException('A verificação de e-mail não está configurada');
    }

    return {
      host,
      user,
      password,
      from,
      port: Number(config?.get('MAIL_PORT', 587)),
      secure: config?.get<string>('MAIL_SECURE') === 'true',
      frontendUrl: config?.get<string>('FRONTEND_URL') || 'http://localhost:5173',
    };
  }

  private getEmailConfiguration() {
    const config = this.configService;
    const relayUrl = config?.get<string>('GMAIL_APPS_SCRIPT_URL');
    const relaySecret = config?.get<string>('GMAIL_APPS_SCRIPT_SECRET');
    const frontendUrl = config?.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    if (!relayUrl || !relaySecret) {
      throw new ServiceUnavailableException('A verificação de e-mail não está configurada');
    }
    return { relayUrl, relaySecret, frontendUrl };
  }

  private async deliverEmailVerification(
    usuario: Usuario,
    mail: ReturnType<AuthService['getEmailConfiguration']>,
  ) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await this.usuariosRepository.update(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        email_verified_at: IsNull(),
        deleted_at: IsNull(),
      },
      {
        email_verification_token_hash: tokenHash,
        email_verification_expires_at: expiresAt,
      },
    );
    if (result.affected !== 1) return;

    const verifyUrl = `${mail.frontendUrl.replace(/\/$/, '')}/verificar-email?token=${encodeURIComponent(token)}`;
    await this.sendEmail(mail, {
      to: usuario.email,
      subject: 'Confirme seu e-mail',
      text: `Confirme seu cadastro usando este link. Ele expira em 24 horas: ${verifyUrl}`,
      html: this.renderVerificationEmail(verifyUrl),
    });
  }

  private async sendEmail(
    mail: ReturnType<AuthService['getEmailConfiguration']>,
    message: { to: string; subject: string; text: string; html: string },
  ) {
    try {
      const response = await fetch(mail.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: mail.relaySecret, ...message }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error('Relay HTTP error');
      const payload = (await response.json()) as { ok?: boolean };
      if (payload?.ok !== true) throw new Error('Relay rejected message');
    } catch (error) {
      this.logger.error(
        'Email verification relay delivery failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Serviço de e-mail indisponível');
    }
  }

  private renderVerificationEmail(verificationUrl: string) {
    const templatePath = join(__dirname, '../../common/template/verification-email.html');
    const template = readFileSync(templatePath, 'utf8');
    const safeUrl = verificationUrl.replace(/[&<>"']/g, (character) => {
      const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return htmlEntities[character];
    });

    return template
      .replace(/\{\{appName\}\}/g, 'SAPNE')
      .replace(/\{\{verificationUrl\}\}/g, safeUrl);
  }

  private renderPasswordResetEmail(resetUrl: string) {
    const templatePath = join(__dirname, '../../common/template/password-reset-email.html');
    const template = readFileSync(templatePath, 'utf8');
    const safeUrl = resetUrl.replace(/[&<>"']/g, (character) => {
      const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return htmlEntities[character];
    });

    return template.replace(/\{\{appName\}\}/g, 'SAPNE').replace(/\{\{resetUrl\}\}/g, safeUrl);
  }

  async verifyEmail(dto: { token: string }) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const now = new Date();
    const retentionDeadline = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = await this.usuariosRepository
      .createQueryBuilder()
      .update(Usuario)
      .set({
        email_verified_at: now,
        email_verification_token_hash: null,
        email_verification_expires_at: null,
      })
      .where('email_verification_token_hash = :tokenHash', { tokenHash })
      .andWhere('email_verified_at IS NULL')
      .andWhere('deleted_at IS NULL')
      .andWhere('email_verification_expires_at > :now', { now })
      .andWhere('data_cadastro > :retentionDeadline', { retentionDeadline })
      .execute();
    if (result.affected !== 1) {
      throw new BadRequestException('Este link de confirmação é inválido ou expirou');
    }
    return { message: 'E-mail confirmado com sucesso. Faça login para continuar.' };
  }

  async requestEmailVerification(dto: { email: string }, ipAddress = 'unknown') {
    const email = dto.email.trim().toLowerCase();
    const usuario = await this.usuariosRepository.findOne({
      where: { email, deleted_at: IsNull() },
    });
    const allowed = await this.reserveEmailVerificationAttempt(
      email,
      ipAddress,
      usuario?.id_usuario,
    );
    if (!allowed) {
      return this.emailVerificationRequestMessage();
    }

    const retentionDeadline = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    if (usuario && !usuario.email_verified_at && usuario.data_cadastro > retentionDeadline) {
      try {
        await this.deliverEmailVerification(usuario, this.getEmailConfiguration());
      } catch (error) {
        this.logger.error(
          'Email verification delivery failed',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return this.emailVerificationRequestMessage();
  }

  private emailVerificationRequestMessage() {
    return {
      message:
        'Se houver uma conta pendente para esse e-mail, você receberá um novo link de confirmação.',
    };
  }

  private async reserveEmailVerificationAttempt(
    email: string,
    ipAddress: string,
    accountId?: number,
  ) {
    const secret = this.configService?.get<string>('JWT_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('O limite de envio de e-mail não está configurado');
    }

    const emailKey = accountId ? `account:${accountId}` : `email:${email.trim().toLowerCase()}`;
    const emailHash = createHmac('sha256', secret).update(emailKey).digest('hex');
    const ipHash = createHmac('sha256', secret).update(ipAddress).digest('hex');
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lockKeys = [
      ...new Set([this.advisoryLockKey(emailHash), this.advisoryLockKey(ipHash)]),
    ].sort((left, right) => {
      if (BigInt(left) === BigInt(right)) return 0;
      return BigInt(left) < BigInt(right) ? -1 : 1;
    });

    return this.usuariosRepository.manager.transaction(async (manager) => {
      for (const lockKey of lockKeys) {
        await manager.query('SELECT pg_advisory_xact_lock($1::bigint)', [lockKey]);
      }
      await manager.query('DELETE FROM "email_verification_attempt" WHERE "requested_at" < $1', [
        dayAgo,
      ]);
      const [counts] = await manager.query(
        `SELECT
          COUNT(*) FILTER (WHERE "email_hash" = $1) AS email_count,
          COUNT(*) FILTER (WHERE "ip_hash" = $2) AS ip_count,
          MAX("requested_at") FILTER (WHERE "email_hash" = $1) AS last_email_request
        FROM "email_verification_attempt"
        WHERE "requested_at" >= $3
          AND ("email_hash" = $1 OR "ip_hash" = $2)`,
        [emailHash, ipHash, hourAgo],
      );

      const lastEmailRequest = counts.last_email_request
        ? new Date(counts.last_email_request).getTime()
        : 0;
      if (
        Number(counts.email_count) >= 3 ||
        Number(counts.ip_count) >= 10 ||
        (lastEmailRequest > 0 && now.getTime() - lastEmailRequest < 60 * 1000)
      ) {
        return false;
      }

      await manager.query(
        'INSERT INTO "email_verification_attempt" ("email_hash", "ip_hash", "requested_at") VALUES ($1, $2, $3)',
        [emailHash, ipHash, now],
      );
      return true;
    });
  }

  private advisoryLockKey(hash: string) {
    let key = BigInt(`0x${hash.slice(0, 16)}`);
    if (key >= 1n << 63n) key -= 1n << 64n;
    return key.toString();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredUnverifiedAccounts() {
    const manager = this.usuariosRepository.manager;
    await manager.query(
      'DELETE FROM "email_verification_attempt" WHERE "requested_at" < now() - INTERVAL \'24 hours\'',
    );
    const deletedUsers = await manager.query(`
      DELETE FROM "usuario" AS usuario
      WHERE usuario."tipo_conta" = 'CLIENTE'
        AND usuario."email_verified_at" IS NULL
        AND usuario."deleted_at" IS NULL
        AND usuario."data_cadastro" < now() - INTERVAL '14 days'
        AND NOT EXISTS (
          SELECT 1 FROM "perfil_prestador" perfil
          WHERE perfil."id_usuario" = usuario."id_usuario"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "agendamento" agendamento
          WHERE agendamento."id_cliente" = usuario."id_usuario"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "sugestao_prestador" sugestao
          WHERE sugestao."id_remetente" = usuario."id_usuario"
             OR sugestao."id_prestador" = usuario."id_usuario"
        )
      RETURNING usuario."id_usuario"
    `);
    if (deletedUsers.length > 0) {
      this.logger.log(`Removed ${deletedUsers.length} expired unverified account(s)`);
    }
    return deletedUsers.length;
  }

  async isRevoked(token: string) {
    const found = await this.revokedTokensRepository.findOne({ where: { token } });
    return !!found;
  }
}
