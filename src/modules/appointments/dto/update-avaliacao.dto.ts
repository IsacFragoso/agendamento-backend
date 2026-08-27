import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateAvaliacaoDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  nota_estrelas?: number;

  @IsOptional()
  @IsString()
  comentario?: string;
}
