import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { App } from './entities/app.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>
  ) {}

  async findAllByUser(userId: string): Promise<App[]> {
    return this.appRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<App> {
    const app = await this.appRepo.findOne({
      where: { id },
      relations: { provider: true, model: true },
    });
    if (!app) throw new NotFoundException('App not found');
    return app;
  }

  async create(userId: string, dto: CreateAppDto): Promise<App> {
    const app = this.appRepo.create({
      ...dto,
      userId,
      systemPrompt: dto.systemPrompt ?? '',
      temperature: dto.temperature ?? 0.7,
      maxTokens: dto.maxTokens ?? 4096,
    });
    return this.appRepo.save(app);
  }

  async update(id: string, dto: UpdateAppDto): Promise<App> {
    await this.appRepo.update(id, dto);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    // 先删除关联的消息和会话，再删应用（外键约束）
    const conversations = await this.convRepo.find({ where: { appId: id } });
    const convIds = conversations.map((c) => c.id);
    if (convIds.length > 0) {
      await this.messageRepo.delete({ conversationId: In(convIds) });
      await this.convRepo.delete({ appId: id });
    }
    const result = await this.appRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('App not found');
  }
}
