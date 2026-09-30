import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { sanitizePhoneNumber } from '../../../common/utils/phone.util';

export class CreateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome_completo?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Transform(({ value }) => sanitizePhoneNumber(value))
  @IsString()
  @Matches(/^\d{11}$/, { message: 'telefone deve conter 11 dígitos' })
  telefone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  foto_perfil?: string;

  @IsOptional()
  @IsIn(['CLIENTE'])
  tipo_conta?: string;

  @IsString()
  @MinLength(8)
  senha: string;
}
