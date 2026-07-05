import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class GraphNodePosition {
  x: number;
  y: number;
}

class GraphNode {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  label: string;

  @IsObject()
  position: GraphNodePosition;

  @IsObject()
  config: Record<string, any>;
}

class GraphEdge {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;
}

class WorkflowGraphDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphNode)
  nodes: GraphNode[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphEdge)
  edges: GraphEdge[];
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowGraphDto)
  graph: WorkflowGraphDto;
}
