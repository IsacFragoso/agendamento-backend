import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('sugestao_prestador')
export class SugestaoPrestador {
  @PrimaryGeneratedColumn({ name: 'id_sugestao' })
  id_sugestao: number;

  @Column({ name: 'id_prestador' })
  id_prestador: number;

  @Column({ name: 'id_remetente' })
  id_remetente: number;

  @Column({ type: 'varchar', length: 20 })
  remetente_tipo: string;

  @Column({ type: 'text' })
  sugestao: string;

  @CreateDateColumn({ type: 'timestamptz' })
  data_criacao: Date;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_prestador' })
  prestador: Usuario;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_remetente' })
  remetente: Usuario;
}
