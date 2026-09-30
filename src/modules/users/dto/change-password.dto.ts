import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  senha_atual: string;

  @IsString()
  @MinLength(8)
  nova_senha: string;

  @IsString()
  @MinLength(8)
  confirmar_senha: string;
}
