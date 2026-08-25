import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'ok',
      message: 'API de Agendamento está rodando',
      timestamp: new Date().toISOString(),
    };
  }
}
