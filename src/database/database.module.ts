import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDatabaseOptions } from './database.config';
import { Usuario } from '../modules/users/entities/usuario.entity';
import { PerfilPrestador } from '../modules/users/entities/perfil-prestador.entity';
import { Categoria } from '../modules/services/entities/categoria.entity';
import { Servico } from '../modules/services/entities/servico.entity';
import { Agendamento } from '../modules/appointments/entities/agendamento.entity';
import { Avaliacao } from '../modules/appointments/entities/avaliacao.entity';
import { Horario } from '../modules/schedules/entities/horario.entity';
import { RevokedToken } from '../modules/auth/entities/revoked-token.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { SugestaoPrestador } from '../modules/users/entities/sugestao.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...createDatabaseOptions({
          DATABASE_URL: configService.get<string>('DATABASE_URL'),
          DB_HOST: configService.get<string>('DB_HOST'),
          DB_PORT: configService.get<string>('DB_PORT'),
          DB_USER: configService.get<string>('DB_USER'),
          DB_PASSWORD: configService.get<string>('DB_PASSWORD'),
          DB_NAME: configService.get<string>('DB_NAME'),
          DB_SSL: configService.get<string>('DB_SSL'),
        }),
        entities: [
          Usuario,
          PerfilPrestador,
          Categoria,
          Servico,
          Agendamento,
          Avaliacao,
          Horario,
          RevokedToken,
          PasswordResetToken,
          SugestaoPrestador,
        ],
        migrations: [__dirname + '/migrations/*.{js,ts}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
