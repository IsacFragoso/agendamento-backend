import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Servico } from '../../services/entities/servico.entity';
import { Agendamento } from '../../appointments/entities/agendamento.entity';
import { Horario } from '../../schedules/entities/horario.entity';

@Entity('perfil_prestador')
export class PerfilPrestador {
  @PrimaryColumn({ name: 'id_usuario' })
  id_usuario: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'text', nullable: true })
  imagem_banner: string | null;

  @OneToOne(() => Usuario, (usuario) => usuario.perfil_prestador, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id_usuario' })
  usuario: Usuario;

  @OneToMany(() => Servico, (servico) => servico.prestador)
  servicos: Servico[];

  @OneToMany(() => Agendamento, (agendamento) => agendamento.prestador)
  agendamentos: Agendamento[];

  @OneToMany(() => Horario, (horario) => horario.prestador)
  horarios: Horario[];
}
