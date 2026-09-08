import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health/health.controller'

// MikroORM entra aqui (@mikro-orm/nestjs) quando a primeira entidade nascer —
// ver docs/requisitos/03-dados.md e ADR-006.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
