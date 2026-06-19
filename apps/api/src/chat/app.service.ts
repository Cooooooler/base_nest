import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { App } from './entities/app.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>
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
    const result = await this.appRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('App not found');
  }
}
