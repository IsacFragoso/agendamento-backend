import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateHorarioDto {
  @IsOptional()
  @IsString()
  dias_atendimento?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  horario_inicio?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  horario_fim?: string;
}