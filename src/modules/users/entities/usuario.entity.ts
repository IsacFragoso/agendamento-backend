import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PerfilPrestador } from './perfil-prestador.entity';
import { Servico } from '../../services/entities/servico.entity';
import { Agendamento } from '../../appointments/entities/agendamento.entity';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  id_usuario: number;

  @Column({ length: 255 })
  nome_completo: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefone: string | null;

  @CreateDateColumn({ name: 'data_cadastro', type: 'timestamptz' })
  data_cadastro: Date;

  @Column({ type: 'text', nullable: true })
  foto_perfil: string | null;

  @Column({ length: 50 })
  tipo_conta: string;

  @Column({ length: 255 })
  senha_hash: string;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @OneToOne(() => PerfilPrestador, (perfil) => perfil.usuario)
  perfil_prestador: PerfilPrestador | null;

  @OneToMany(() => Servico, (servico) => servico.prestador)
  servicos: Servico[];

  @OneToMany(() => Agendamento, (agendamento) => agendamento.cliente)
  agendamentos_cliente: Agendamento[];
}
