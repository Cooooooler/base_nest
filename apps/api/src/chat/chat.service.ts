import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { RetrievalService } from '../knowledge/retrieval.service';
import { ProvidersService } from '../providers/providers.service';
import { AppService } from './app.service';
import { ConversationService } from './conversation.service';
import { Message } from './entities/message.entity';

interface ChatChunk {
  content: string;
  reasoning?: string;
  isEnd: boolean;
  error?: string;
  sources?: Array<{
    content: string;
    metadata: Record<string, any>;
    score?: number;
  }>;
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
    private readonly providersService: ProvidersService,
    private readonly retrievalService: RetrievalService
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
    content: string
  ): Promise<Observable<ChatChunk>> {
    const conv = await this.convService.findOne(convId);
    if (conv.appId !== appId) throw new NotFoundException('Conversation not found');

    const app = await this.appService.findOne(appId);

    // 先查历史（排除本次消息），再保存用户消息，避免 buildMessages 中重复
    const history = await this.msgRepo.find({
      where: { conversationId: convId },
      order: { createdAt: 'ASC' },
    });

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: convId,
        role: 'user',
        content,
      })
    );

    let retrievedSources: ChatChunk['sources'] = undefined;
    if (app.knowledgeBaseId) {
      try {
        const results = await this.retrievalService.searchWithScore(
          app.knowledgeBaseId,
          content,
          4
        );
        retrievedSources = results;
      } catch (err) {
        this.logger.warn(`Knowledge retrieval failed: ${(err as Error).message}`);
      }
    }

    const messages = this.buildMessages(
      app.systemPrompt,
      history,
      content,
      app.maxTokens,
      retrievedSources
    );
    const client = await this.providersService.getProviderClient(app.providerId);

    return new Observable<ChatChunk>((subscriber) => {
      let fullContent = '';
      let fullReasoning = '';
      const modelName = app.model?.name || 'unknown';

      const stream = client.chatStream({
        model: modelName,
        messages,
        temperature: Number(app.temperature),
        maxTokens: app.maxTokens,
      });

      stream.subscribe({
        next: (chunk: ChatChunk) => {
          fullContent += chunk.content || '';
          fullReasoning += chunk.reasoning || '';
          if (!chunk.isEnd) {
            subscriber.next(chunk);
          }
        },
        error: (err: Error) => {
          this.logger.error(`Chat stream error: ${err.message}`);
          subscriber.next({ content: '', isEnd: true, error: err.message });
          subscriber.complete();
        },
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        complete: async () => {
          try {
            const metadata: Record<string, any> = {};
            if (retrievedSources) {
              metadata.sources = retrievedSources;
            }
            if (fullReasoning) {
              metadata.reasoning = fullReasoning;
            }

            // 如果 content 为空但 reasoning 有内容，从 reasoning 末段提取有效内容
            if (!fullContent && fullReasoning) {
              const paragraphs = fullReasoning.split('\n').filter(Boolean);
              fullContent = paragraphs[paragraphs.length - 1] || '（模型未返回明确回答）';
            }
            const msgData: Partial<Message> = {
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
              metadata: Object.keys(metadata).length > 0 ? metadata : null,
            };
            await this.msgRepo.save(this.msgRepo.create(msgData));
          } catch (err) {
            this.logger.error(`Failed to save assistant message: ${(err as Error).message}`);
          }
          const finalChunk: ChatChunk = {
            content: '',
            isEnd: true,
          };
          if (retrievedSources) {
            finalChunk.sources = retrievedSources;
          }
          subscriber.next(finalChunk);
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
    maxTokens: number,
    sources?: ChatChunk['sources']
  ): ChatMessage[] {
    let systemContent = this.renderPrompt(systemPrompt, {
      query: userContent,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
    });

    // 如果有检索结果，追加引用上下文
    if (sources && sources.length > 0) {
      const refs = sources
        .map(
          (s, i) =>
            `[${i + 1}] (相似度 ${(s.score! * 100).toFixed(0)}%) —— ${s.metadata?.fileName || '未知来源'}`
        )
        .join('\n');
      systemContent += `\n\n以下是与用户问题相关的参考资料：\n${refs}\n\n请在回答中引用相关来源，格式为 [编号]；不要提及内部编号规则。`;
    }

    const systemMsg: ChatMessage = {
      role: 'system',
      content: systemContent,
    };

    const userMsg: ChatMessage = { role: 'user', content: userContent };
    const estimated = (text: string) => Math.ceil(text.length / 4);
    let total = estimated(systemMsg.content) + estimated(userMsg.content);
    const result: ChatMessage[] = [systemMsg];

    const reversed = [...history].reverse();
    const selected: ChatMessage[] = [];
    for (const msg of reversed) {
      const tokens = estimated(msg.content);
      if (total + tokens > maxTokens) break;
      total += tokens;
      selected.push({ role: msg.role, content: msg.content });
    }

    // 恢复时间顺序（最早的在前），再追加当前消息
    result.push(...selected.reverse());
    result.push(userMsg);
    return result;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
