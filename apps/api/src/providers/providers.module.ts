import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { App } from '../chat/entities/app.entity';
import { ApiKey } from './entities/api-key.entity';
import { ModelProvider } from './entities/model-provider.entity';
import { Model } from './entities/model.entity';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModelProvider, ApiKey, Model, App]), AuthGuardModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
