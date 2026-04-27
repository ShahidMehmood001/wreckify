import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ScansModule } from './modules/scans/scans.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlansModule } from './modules/plans/plans.module';
import { AiClientModule } from './modules/ai-client/ai-client.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    ScansModule,
    WorkshopsModule,
    ReportsModule,
    AdminModule,
    PlansModule,
    AiClientModule,
    HealthModule,
  ],
})
export class AppModule {}
