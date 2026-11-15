import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO'])
  status: string;

  @ValidateIf((dto: UpdateStatusDto) => dto.status === 'CANCELADO')
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  motivo_cancelamento?: string;
}
