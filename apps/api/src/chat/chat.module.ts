import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { ProvidersModule } from '../providers/providers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { App } from './entities/app.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([App, Conversation, Message]),
    AuthGuardModule,
    ProvidersModule,
  ],
  controllers: [AppController, ConversationController, ChatController],
  providers: [AppService, ConversationService, ChatService],
})
export class ChatModule {}
