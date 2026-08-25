import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO'])
  status: string;
}