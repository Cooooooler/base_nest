import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: '获取工作流列表' })
  async findAll(@Req() req: any) {
    return this.workflowService.findAll(req.user!.id);
  }

  @Post()
  @ApiOperation({ summary: '创建工作流' })
  async create(@Req() req: any, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(req.user!.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工作流详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工作流' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.update(id, req.user!.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工作流' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.workflowService.delete(id, req.user!.id);
  }
}
