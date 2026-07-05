import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './entities/workflow.entity';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto';
import { validateGraph } from './engine/graph-validator';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly repo: Repository<Workflow>,
  ) {}

  async findAll(userId: string): Promise<Workflow[]> {
    return this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: ['id', 'name', 'description', 'userId', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: string): Promise<Workflow> {
    const wf = await this.repo.findOneBy({ id });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async create(userId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    validateGraph(dto.graph);
    const wf = this.repo.create({ ...dto, userId });
    return this.repo.save(wf);
  }

  async update(id: string, userId: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const wf = await this.findOne(id);
    if (wf.userId !== userId) throw new NotFoundException('Workflow not found');
    if (dto.graph) validateGraph(dto.graph);
    Object.assign(wf, dto);
    return this.repo.save(wf);
  }

  async delete(id: string, userId: string): Promise<void> {
    const wf = await this.findOne(id);
    if (wf.userId !== userId) throw new NotFoundException('Workflow not found');
    await this.repo.delete(id);
  }
}
