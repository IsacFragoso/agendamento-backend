import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Servico } from '../../services/entities/servico.entity';
import { Agendamento } from '../../appointments/entities/agendamento.entity';

@Entity('perfil_prestador')
export class PerfilPrestador {
  @PrimaryColumn({ name: 'id_prestador' })
  id_prestador: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'text', nullable: true })
  foto_perfil: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dias_atendimento: string | null;

  @Column({ type: 'time', nullable: true })
  horario_inicio: string | null;

  @Column({ type: 'time', nullable: true })
  horario_fim: string | null;

  @OneToOne(() => Usuario, (usuario) => usuario.perfil_prestador, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_prestador', referencedColumnName: 'id_usuario' })
  usuario: Usuario;

  @OneToMany(() => Servico, (servico) => servico.prestador)
  servicos: Servico[];

  @OneToMany(() => Agendamento, (agendamento) => agendamento.prestador)
  agendamentos: Agendamento[];
}
