import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('revoked_tokens')
@Index('IDX_revoked_tokens_expires_at', ['expires_at'])
export class RevokedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;
}
