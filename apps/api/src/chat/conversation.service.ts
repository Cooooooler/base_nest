import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>
  ) {}

  async findByApp(appId: string, userId: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { appId, userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Conversation> {
    const conv = await this.convRepo.findOneBy({ id });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async create(appId: string, userId: string, dto: CreateConversationDto): Promise<Conversation> {
    const conv = this.convRepo.create({
      appId,
      userId,
      title: dto.title ?? null,
    });
    return this.convRepo.save(conv);
  }

  async delete(id: string): Promise<void> {
    const result = await this.convRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Conversation not found');
  }
}
