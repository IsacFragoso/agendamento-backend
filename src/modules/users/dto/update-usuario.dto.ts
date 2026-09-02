import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { sanitizePhoneNumber } from '../../../common/utils/phone.util';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome_completo?: string;

  @IsOptional()
  @Transform(({ value }) => sanitizePhoneNumber(value))
  @IsString()
  @Matches(/^\d{11}$/, { message: 'telefone deve conter 11 dígitos' })
  telefone?: string;

  @IsOptional()
  @IsDateString()
  data_nascimento?: string;
}
