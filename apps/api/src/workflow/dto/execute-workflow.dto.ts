import { IsObject } from 'class-validator';

export class ExecuteWorkflowDto {
  @IsObject()
  inputs: Record<string, any>;
}
