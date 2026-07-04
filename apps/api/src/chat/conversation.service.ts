import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>
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
      title: dto.title,
    } as Partial<Conversation>);
    return this.convRepo.save(conv);
  }

  async updateTitleIfEmpty(id: string, content: string): Promise<void> {
    await this.convRepo.update({ id, title: IsNull() }, { title: content.slice(0, 255) });
  }

  async delete(id: string): Promise<void> {
    await this.messageRepo.delete({ conversationId: id });
    const result = await this.convRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Conversation not found');
  }
}
