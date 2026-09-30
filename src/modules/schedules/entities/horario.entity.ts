import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PerfilPrestador } from '../../users/entities/perfil-prestador.entity';

@Entity('horarios')
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
