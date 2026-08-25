import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Agendamento } from './agendamento.entity';

@Entity('avaliacao')
export class Avaliacao {
  @PrimaryGeneratedColumn({ name: 'id_avaliacao' })
  id_avaliacao: number;

  @Column()
  nota_estrelas: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  data: Date;

  @Column({ name: 'id_agendamento', unique: true })
  id_agendamento: number;

  @OneToOne(() => Agendamento, (agendamento) => agendamento.avaliacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_agendamento' })
  agendamento: Agendamento;
}