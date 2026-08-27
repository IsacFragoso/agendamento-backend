import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { Usuario } from '../modules/users/entities/usuario.entity';
import { PerfilPrestador } from '../modules/users/entities/perfil-prestador.entity';
import { Categoria } from '../modules/services/entities/categoria.entity';
import { Servico } from '../modules/services/entities/servico.entity';
import { Agendamento } from '../modules/appointments/entities/agendamento.entity';
import { Avaliacao } from '../modules/appointments/entities/avaliacao.entity';
import { RevokedToken } from '../modules/auth/entities/revoked-token.entity';

config({ path: join(__dirname, '../../.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agendamento',
  ssl:
    process.env.DB_SSL === 'true' || process.env.DB_HOST !== 'localhost'
      ? { rejectUnauthorized: false }
      : false,
  entities: [Usuario, PerfilPrestador, Categoria, Servico, Agendamento, Avaliacao, RevokedToken],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
