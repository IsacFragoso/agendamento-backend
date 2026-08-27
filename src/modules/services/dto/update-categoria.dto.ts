import { IsString, MinLength } from 'class-validator';

export class UpdateCategoriaDto {
  @IsString()
  @MinLength(2)
  nome: string;
}
