import {
  Body, Controller, Get, HttpCode, Param, ParseUUIDPipe,
  Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RunService } from './run.service';
import { ExecuteWorkflowDto } from './dto';

@ApiTags('Workflows - Runs')
@Controller('workflows/:workflowId/runs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '执行工作流（异步）' })
  async execute(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
    @Req() _req: any,
  ) {
    const run = await this.runService.execute(workflowId, dto.inputs);
    return { runId: run.id, status: run.status };
  }

  @Post('debug')
  @HttpCode(200)
  @ApiOperation({ summary: '调试执行工作流（同步返回全部中间结果）' })
  async executeDebug(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
    @Req() _req: any,
  ) {
    const { run, nodeExecutions } = await this.runService.executeDebug(workflowId, dto.inputs);
    return {
      runId: run.id,
      status: run.status,
      outputs: run.outputs,
      nodeExecutions: nodeExecutions.map(ne => ({
        nodeId: ne.nodeId,
        nodeType: ne.nodeType,
        status: ne.status,
        inputs: ne.inputs,
        outputs: ne.outputs,
        latency: ne.latency,
        error: ne.error,
      })),
    };
  }

  @Get()
  @ApiOperation({ summary: '获取运行历史列表' })
  async findByWorkflow(@Param('workflowId', ParseUUIDPipe) workflowId: string) {
    return this.runService.findByWorkflow(workflowId);
  }

  @Get(':runId')
  @ApiOperation({ summary: '获取运行详情' })
  async findOne(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.runService.findOne(runId);
  }

  @Get(':runId/nodes')
  @ApiOperation({ summary: '获取节点执行快照' })
  async findNodeExecutions(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.runService.findNodeExecutions(runId);
  }
}
