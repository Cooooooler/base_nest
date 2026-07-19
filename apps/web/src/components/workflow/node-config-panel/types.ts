import type { WorkflowNodeData } from '../nodes/workflow-node';

export interface NodeConfigProps {
  readonly config: Record<string, any>;
  readonly onSave: (cfg: Record<string, any>) => void;
  readonly providers?: any[];
  readonly knowledgeBases?: any[];
}

export interface NodeConfigPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly nodeData: WorkflowNodeData;
  readonly onSave: (config: Record<string, any>) => void;
}
