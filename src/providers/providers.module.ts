import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelProvider } from './entities/model-provider.entity';
import { ApiKey } from './entities/api-key.entity';
import { Model } from './entities/model.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModelProvider, ApiKey, Model])],
  controllers: [],
  providers: [],
  exports: [],
})
export class ProvidersModule {}
