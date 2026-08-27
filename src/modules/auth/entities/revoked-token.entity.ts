import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('revoked_tokens')
export class RevokedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;
}
