import type { WorkflowNodeData } from '../nodes/workflow-node';

export interface NodeConfigProps {
  config: Record<string, any>;
  onSave: (cfg: Record<string, any>) => void;
  providers?: any[];
  knowledgeBases?: any[];
}

export interface NodeConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: WorkflowNodeData;
  onSave: (config: Record<string, any>) => void;
}
