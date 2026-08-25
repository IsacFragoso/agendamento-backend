import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PerfilPrestador } from '../../users/entities/perfil-prestador.entity';
import { Categoria } from './categoria.entity';
import { Agendamento } from '../../appointments/entities/agendamento.entity';

@Entity('servico')
export class Servico {
  @PrimaryGeneratedColumn({ name: 'id_servico' })
  id_servico: number;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  preco: number;

  @Column()
  duracao_padrao: number;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'id_prestador' })
  id_prestador: number;

  @Column({ name: 'id_categoria' })
  id_categoria: number;

  @ManyToOne(() => PerfilPrestador, (perfil) => perfil.servicos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_prestador' })
  prestador: PerfilPrestador;

  @ManyToOne(() => Categoria, (categoria) => categoria.servicos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @OneToMany(() => Agendamento, (agendamento) => agendamento.servico)
  agendamentos: Agendamento[];
}