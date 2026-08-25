import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateAgendamentoDto {
  @IsDateString()
  data_hora_inicio: string;

  @IsDateString()
  data_hora_fim: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_cliente: number;

  @IsInt()
  @Min(1)
  id_servico: number;
}