import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../users/entities/usuario.entity';

@Entity('password_reset_token')
@Index('IDX_password_reset_token_user_expiration', ['id_usuario', 'expires_at'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_usuario' })
  id_usuario: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  token_hash: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;
}
