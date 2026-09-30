import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateHorarioDto {
  @IsOptional()
  @IsString()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana?: number;

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
