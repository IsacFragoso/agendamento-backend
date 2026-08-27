import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Servico } from './servico.entity';

@Entity('categoria')
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  id_categoria: number;

  @Column({ length: 150, unique: true })
  nome: string;

  @OneToMany(() => Servico, (servico) => servico.categoria)
  servicos: Servico[];
}
