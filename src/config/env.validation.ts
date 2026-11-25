import { plainToClass } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 8000;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsNumber()
  DB_PORT: number = 5432;

  @ValidateIf((environment) => !environment.DATABASE_URL)
  @IsString()
  DB_HOST: string;

  @ValidateIf((environment) => !environment.DATABASE_URL)
  @IsString()
  DB_USER: string;

  @ValidateIf((environment) => !environment.DATABASE_URL)
  @IsString()
  DB_PASSWORD: string;

  @ValidateIf((environment) => !environment.DATABASE_URL)
  @IsString()
  DB_NAME: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  DB_SSL?: string;

  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  JWT_EXPIRATION: number = 3600;

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  @IsOptional()
  @IsString()
  MAIL_HOST?: string;

  @IsOptional()
  @IsString()
  MAIL_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_PASSWORD?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  @IsOptional()
  @IsNumber()
  MAIL_PORT?: number;

  @IsOptional()
  @IsString()
  MAIL_SECURE?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  GMAIL_APPS_SCRIPT_URL?: string;

  @IsOptional()
  @IsString()
  GMAIL_APPS_SCRIPT_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
