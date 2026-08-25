import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@database/database.module';
import { UsersModule } from '@modules/users/users.module';
import { ServicesModule } from '@modules/services/services.module';
import { SchedulesModule } from '@modules/schedules/schedules.module';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsersModule,
    ServicesModule,
    SchedulesModule,
    AppointmentsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
