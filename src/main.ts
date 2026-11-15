import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const allowedOrigins = [new URL(frontendUrl).origin];
  if (configService.get<string>('NODE_ENV') !== 'production') {
    allowedOrigins.push('http://localhost:5173');
  }
  app.enableCors({ origin: allowedOrigins });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global API prefix
  app.setGlobalPrefix('api');

  const port = configService.get('PORT', 8000);

  await app.listen(port);
  console.log(`✅ Aplicação iniciada em http://localhost:${port}`);
  console.log(`📚 API rodando em http://localhost:${port}/api`);
}

bootstrap();
