import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Usuario } from '@modules/users/entities/usuario.entity';
import { PerfilPrestador } from '@modules/users/entities/perfil-prestador.entity';
import { Categoria } from '@modules/services/entities/categoria.entity';
import { Servico } from '@modules/services/entities/servico.entity';
import { Agendamento } from '@modules/appointments/entities/agendamento.entity';
import { Avaliacao } from '@modules/appointments/entities/avaliacao.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'agendamento'),
        entities: [Usuario, PerfilPrestador, Categoria, Servico, Agendamento, Avaliacao],
        migrations: [__dirname + '/migrations/*.{js,ts}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') !== 'production',
        ssl:
          configService.get('DB_HOST') !== 'localhost'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
