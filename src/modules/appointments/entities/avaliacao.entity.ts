import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Agendamento } from './agendamento.entity';

@Entity('avaliacao')
@Check('CK_avaliacao_nota', '"nota_estrelas" BETWEEN 1 AND 5')
@Check('CK_avaliacao_avaliador_tipo', `"avaliador_tipo" IN ('CLIENTE', 'PRESTADOR')`)
@Unique('UQ_avaliacao_agendamento_avaliador', ['id_agendamento', 'avaliador_tipo'])
export class Avaliacao {
  @PrimaryGeneratedColumn({ name: 'id_avaliacao' })
  id_avaliacao: number;

  @Column()
  nota_estrelas: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  data: Date;

  @Column({ name: 'id_agendamento' })
  id_agendamento: number;

  @Column({ type: 'varchar', length: 20, default: 'CLIENTE' })
  avaliador_tipo: string;

  @ManyToOne(() => Agendamento, (agendamento) => agendamento.avaliacoes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_agendamento' })
  agendamento: Agendamento;
}
