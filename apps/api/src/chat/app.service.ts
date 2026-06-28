import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ModelProvider } from '../providers/entities/model-provider.entity';
import { Model } from '../providers/entities/model.entity';
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
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ModelProvider)
    private readonly providerRepo: Repository<ModelProvider>,
    @InjectRepository(Model)
    private readonly modelRepo: Repository<Model>
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
    // Verify ownership: providerId must belong to this user
    const provider = await this.providerRepo.findOneBy({ id: dto.providerId, userId });
    if (!provider) {
      throw new BadRequestException('Provider not found');
    }

    // Verify model belongs to this provider
    const model = await this.modelRepo.findOneBy({ id: dto.modelId, providerId: dto.providerId });
    if (!model) {
      throw new BadRequestException('Model not found under this provider');
    }

    const app = this.appRepo.create({
      ...dto,
      userId,
      systemPrompt: dto.systemPrompt ?? '',
      temperature: dto.temperature ?? 0.7,
      maxTokens: dto.maxTokens ?? 4096,
    });
    return this.appRepo.save(app);
  }

  async update(id: string, userId: string, dto: UpdateAppDto): Promise<App> {
    // If providerId or modelId is being updated, verify ownership
    if (dto.providerId) {
      const provider = await this.providerRepo.findOneBy({ id: dto.providerId, userId });
      if (!provider) {
        throw new BadRequestException('Provider not found');
      }
    }
    if (dto.modelId && dto.providerId) {
      const model = await this.modelRepo.findOneBy({
        id: dto.modelId,
        providerId: dto.providerId,
      });
      if (!model) {
        throw new BadRequestException('Model not found under this provider');
      }
    }

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
