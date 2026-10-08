import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PerfilPrestador } from '../../users/entities/perfil-prestador.entity';

@Entity('horarios')
@Check('CK_horarios_dia', '"dia_semana" BETWEEN 0 AND 6')
@Check('CK_horarios_intervalo', '"hora_inicio" < "hora_fim"')
@Unique('UQ_horarios_provider_interval', [
  'id_prestador',
  'dia_semana',
  'hora_inicio',
  'hora_fim',
])
export class Horario {
  @PrimaryGeneratedColumn({ name: 'id_horario' })
  id_horario: number;

  @Column({ name: 'dia_semana', type: 'smallint' })
  dia_semana: number;

  @Column({ name: 'hora_inicio', type: 'time' })
  hora_inicio: string;

  @Column({ name: 'hora_fim', type: 'time' })
  hora_fim: string;

  @Column({ name: 'id_prestador' })
  id_prestador: number;

  @ManyToOne(() => PerfilPrestador, (perfil) => perfil.horarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_prestador', referencedColumnName: 'id_usuario' })
  prestador: PerfilPrestador;
}
