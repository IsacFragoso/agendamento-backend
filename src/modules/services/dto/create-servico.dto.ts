import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateServicoDto {
  @IsString()
  @MinLength(2)
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsNumber()
  @Min(0)
  preco: number;

  @IsInt()
  @Min(1)
  duracao_padrao: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsInt()
  @Min(1)
  id_prestador: number;

  @IsInt()
  @Min(1)
  id_categoria: number;
}