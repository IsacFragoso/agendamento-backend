import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '../users/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosRepository.findOne({ where: { email: dto.email } });
    if (!usuario || !usuario.ativo || !(await bcryptjs.compare(dto.senha, usuario.senha_hash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    return {
      access_token: this.jwtService.sign({
        sub: usuario.id_usuario,
        email: usuario.email,
        tipo_conta: usuario.tipo_conta,
      }),
      usuario: {
        id_usuario: usuario.id_usuario,
        nome_completo: usuario.nome_completo,
        email: usuario.email,
        telefone: usuario.telefone,
        data_nascimento: usuario.data_nascimento,
        tipo_conta: usuario.tipo_conta,
        ativo: usuario.ativo,
      },
    };
  }
}