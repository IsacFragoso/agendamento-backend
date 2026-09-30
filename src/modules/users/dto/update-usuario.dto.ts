import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
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
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  foto_perfil?: string;
}
