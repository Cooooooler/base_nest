'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { NODE_COLORS, NODE_LABELS, getNodeHandles } from './constants';

export interface WorkflowNodeData {
  label: string;
  nodeType: string;
  config: Record<string, any>;
}

/**
 * Custom node rendered inside React Flow.
 * Renders type-colored label + input/output handles based on node type.
 * Interactive elements (inputs/buttons) get `nodrag` class.
 */
function BaseNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const colors = NODE_COLORS[nodeData.nodeType] ?? {
    bg: '#f5f5f5',
    border: '#d9d9d9',
    text: '#333',
  };
  const label = NODE_LABELS[nodeData.nodeType] ?? nodeData.nodeType;
  const handles = getNodeHandles(nodeData.nodeType);

  const handleStyle = (color: string) => ({
    background: color,
    border: '2px solid #fff',
    width: 9,
    height: 9,
  });

  return (
    <div
      className='px-3 py-2 rounded-lg text-sm font-medium min-w-[100px] text-center shadow-sm transition-shadow'
      style={{
        background: colors.bg,
        border: `2px solid ${selected ? '#1677ff' : colors.border}`,
        boxShadow: selected ? '0 0 0 2px rgba(22,119,255,0.2)' : undefined,
      }}
    >
      {/* Target handles (input) */}
      {handles.targets.map((id, i) => (
        <Handle
          key={`t-${id}`}
          id={id}
          type='target'
          position={Position.Left}
          style={{
            ...handleStyle(colors.border),
            top:
              handles.targets.length > 1
                ? `${((i + 1) / (handles.targets.length + 1)) * 100}%`
                : '50%',
          }}
        />
      ))}

      {/* Node content */}
      <div className='flex items-center gap-2 justify-center'>
        <span
          className='inline-block w-2 h-2 rounded-full flex-shrink-0'
          style={{ background: colors.border }}
        />
        <span style={{ color: colors.text }}>{nodeData.label || label}</span>
      </div>

      {/* Source handles (output) */}
      {handles.sources.map((id, i) => (
        <Handle
          key={`s-${id}`}
          id={id}
          type='source'
          position={Position.Right}
          style={{
            ...handleStyle(colors.border),
            top:
              handles.sources.length > 1
                ? `${((i + 1) / (handles.sources.length + 1)) * 100}%`
                : '50%',
          }}
        />
      ))}
    </div>
  );
}

// Memoize to prevent re-renders on other node/edge changes
export const WorkflowNode = memo(BaseNode);
