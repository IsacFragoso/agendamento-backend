import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../users/entities/usuario.entity';
import { PerfilPrestador } from '../../users/entities/perfil-prestador.entity';
import { Servico } from '../../services/entities/servico.entity';
import { Avaliacao } from './avaliacao.entity';

@Entity('agendamento')
export class Agendamento {
  @PrimaryGeneratedColumn({ name: 'id_agendamento' })
  id_agendamento: number;

  @Column({ type: 'timestamp' })
  data_hora_inicio: Date;

  @Column({ type: 'timestamp' })
  data_hora_fim: Date;

  @Column({ length: 50, default: 'PENDENTE' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  data_criacao: Date;

  @Column({ name: 'id_cliente' })
  id_cliente: number;

  @Column({ name: 'id_prestador' })
  id_prestador: number;

  @Column({ name: 'id_servico' })
  id_servico: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.agendamentos_cliente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Usuario;

  @ManyToOne(() => PerfilPrestador, (perfil) => perfil.agendamentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_prestador' })
  prestador: PerfilPrestador;

  @ManyToOne(() => Servico, (servico) => servico.agendamentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_servico' })
  servico: Servico;

  @OneToOne(() => Avaliacao, (avaliacao) => avaliacao.agendamento)
  avaliacao: Avaliacao | null;
}