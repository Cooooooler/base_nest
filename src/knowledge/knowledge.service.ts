import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { KnowledgeBase } from './entities/knowledge-base.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>,
  ) {}

  async findAll(userId: string): Promise<KnowledgeBase[]> {
    return this.kbRepo.find({
      where: { userId },
      relations: { documents: true },
    });
  }

  async findById(id: string): Promise<KnowledgeBase | null> {
    return this.kbRepo.findOne({
      where: { id },
      relations: { documents: true },
    });
  }

  async create(userId: string, dto: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const kb = this.kbRepo.create({ ...dto, userId });
    return this.kbRepo.save(kb);
  }

  async delete(id: string): Promise<void> {
    const kb = await this.kbRepo.findOneBy({ id });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    await this.kbRepo.delete(id);
  }
}
