import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { sanitizePhoneNumber } from '../../../common/utils/phone.util';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  nome_completo: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Transform(({ value }) => sanitizePhoneNumber(value))
  @IsString()
  @Matches(/^\d{11}$/, { message: 'telefone deve conter 11 dígitos' })
  telefone?: string;

  @IsOptional()
  @IsDateString()
  data_nascimento?: string;

  @IsIn(['CLIENTE', 'PRESTADOR'])
  tipo_conta: string;

  @IsString()
  @MinLength(8)
  senha: string;
}
