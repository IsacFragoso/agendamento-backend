import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database.config';
import { Usuario } from '../modules/users/entities/usuario.entity';
import { PerfilPrestador } from '../modules/users/entities/perfil-prestador.entity';
import { Categoria } from '../modules/services/entities/categoria.entity';
import { Servico } from '../modules/services/entities/servico.entity';
import { Agendamento } from '../modules/appointments/entities/agendamento.entity';
import { Avaliacao } from '../modules/appointments/entities/avaliacao.entity';
import { RevokedToken } from '../modules/auth/entities/revoked-token.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { SugestaoPrestador } from '../modules/users/entities/sugestao.entity';
import { Horario } from '../modules/schedules/entities/horario.entity';

config();

export default new DataSource({
  ...createDatabaseOptions(),
  entities: [
    Usuario,
    PerfilPrestador,
    Categoria,
    Servico,
    Agendamento,
    Avaliacao,
    RevokedToken,
    PasswordResetToken,
    SugestaoPrestador,
    Horario,
  ],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
