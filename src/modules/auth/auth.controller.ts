import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './strategies/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request) {
    const auth = req.headers.authorization as string | undefined;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const payload = req.user as { sub: number; exp?: number };
    return this.authService.logout(token, payload);
  }
}
