'use client';

import type { FC } from 'react';
import { useEffect, useState } from 'react';

import {
  NodePanel,
  NodePanelHeader,
  NodePanelLeftTitle,
  NodePanelRightTitle,
} from '@/components/workflow/node-panel';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviders } from '@/hooks/use-providers';
import { Input } from '@base/ui/input';
import { NODE_CONFIGS } from '../nodes/constants';
import type { NodeConfigPanelProps } from './types';

export const NodeConfigPanel: FC<NodeConfigPanelProps> = ({
  open,
  onOpenChange,
  nodeData,
  onSave,
}) => {
  const { data: providers } = useProviders();
  const { data: knowledgeBases } = useKnowledgeBases();

  const nodeConfig = NODE_CONFIGS[nodeData.nodeType];
  const ConfigComponent = nodeConfig?.configComponent;

  const [label, setLabel] = useState(nodeData.label);

  useEffect(() => {
    setLabel(nodeData.label);
  }, [nodeData.label, open]);

  const handleLabelBlur = () => {
    if (label !== nodeData.label) {
      onSave({ ...nodeData.config, label });
    }
  };

  return (
    <NodePanel open={open} onClose={() => onOpenChange(false)}>
      <NodePanelHeader className='gap-x-2'>
        <NodePanelLeftTitle className='flex-1'>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            className='bg-transparent! text-lg font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0'
            placeholder='节点名称'
          />
        </NodePanelLeftTitle>
        <NodePanelRightTitle />
      </NodePanelHeader>

      <div className='p-4 flex-1 overflow-y-auto'>
        {ConfigComponent ? (
          <ConfigComponent
            config={nodeData.config}
            providers={providers}
            knowledgeBases={knowledgeBases}
            onSave={(cfg: Record<string, any>) => {
              onSave(cfg);
            }}
          />
        ) : (
          <pre className='text-xs p-2 bg-muted rounded overflow-auto max-h-40'>
            {JSON.stringify(nodeData.config, null, 2)}
          </pre>
        )}
      </div>
    </NodePanel>
  );
};
