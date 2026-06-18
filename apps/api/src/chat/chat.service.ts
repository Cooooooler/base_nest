import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { ProvidersService } from '../providers/providers.service';
import { AppService } from './app.service';
import { ConversationService } from './conversation.service';
import { Message } from './entities/message.entity';

interface ChatChunk {
  content: string;
  isEnd: boolean;
  error?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly appService: AppService,
    private readonly convService: ConversationService,
    private readonly providersService: ProvidersService
  ) {}

  async getMessages(convId: string): Promise<Message[]> {
    return this.msgRepo.find({
      where: { conversationId: convId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(
    appId: string,
    convId: string,
    content: string,
    userId: string
  ): Promise<Observable<ChatChunk>> {
    const conv = await this.convService.findOne(convId);
    if (conv.appId !== appId) throw new NotFoundException('Conversation not found');

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: convId,
        role: 'user',
        content,
      })
    );

    const app = await this.appService.findOne(appId);

    const history = await this.msgRepo.find({
      where: { conversationId: convId },
      order: { createdAt: 'ASC' },
    });

    const messages = this.buildMessages(app.systemPrompt, history, content, app.maxTokens);
    const client = await this.providersService.getProviderClient(app.providerId);

    return new Observable<ChatChunk>((subscriber) => {
      let fullContent = '';
      const modelName = (app.model as any)?.name || 'unknown';

      const stream = client.chatStream({
        model: modelName,
        messages,
        temperature: Number(app.temperature),
        maxTokens: app.maxTokens,
      });

      stream.subscribe({
        next: (chunk: ChatChunk) => {
          if (!chunk.isEnd) fullContent += chunk.content;
          subscriber.next(chunk);
        },
        error: (err: Error) => {
          this.logger.error(`Chat stream error: ${err.message}`);
          subscriber.next({ content: '', isEnd: true, error: err.message });
          subscriber.complete();
        },
        complete: async () => {
          try {
            await this.msgRepo.save(
              this.msgRepo.create({
                conversationId: convId,
                role: 'assistant',
                content: fullContent,
                tokens: {
                  prompt: this.estimateTokens(messages.map((m) => m.content).join('')),
                  completion: this.estimateTokens(fullContent),
                  total:
                    this.estimateTokens(fullContent) +
                    this.estimateTokens(messages.map((m) => m.content).join('')),
                },
              })
            );
          } catch (err) {
            this.logger.error(`Failed to save assistant message: ${(err as Error).message}`);
          }
          subscriber.next({ content: '', isEnd: true });
          subscriber.complete();
        },
      });
    });
  }

  renderPrompt(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  }

  private buildMessages(
    systemPrompt: string,
    history: Message[],
    userContent: string,
    maxTokens: number
  ): ChatMessage[] {
    const systemMsg: ChatMessage = {
      role: 'system',
      content: this.renderPrompt(systemPrompt, {
        query: userContent,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toISOString().slice(11, 19),
      }),
    };

    const userMsg: ChatMessage = { role: 'user', content: userContent };
    const estimated = (text: string) => Math.ceil(text.length / 4);
    let total = estimated(systemMsg.content) + estimated(userMsg.content);
    const result: ChatMessage[] = [systemMsg];

    const reversed = [...history].reverse();
    for (const msg of reversed) {
      const tokens = estimated(msg.content);
      if (total + tokens > maxTokens) break;
      total += tokens;
      result.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    result.push(userMsg);
    return result;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
