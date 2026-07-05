'use client';

import type { DragEvent, FC } from 'react';
import { NODE_COLORS, NODE_DESCRIPTIONS, NODE_LABELS } from './nodes/constants';

interface Props {
  onAddNode: (type: string, position: { x: number; y: number }) => void;
}

const NODE_TYPES = Object.keys(NODE_LABELS).filter((t) => t !== 'start' && t !== 'end');

export const NodePalette: FC<Props> = ({ onAddNode }) => {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className='p-3 space-y-2 h-full overflow-auto bg-background border-r'>
      <h3 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
        节点面板
      </h3>

      {NODE_TYPES.map((type) => {
        const colors = NODE_COLORS[type] ?? { bg: '#f5f5f5', border: '#d9d9d9', text: '#333' };
        return (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            onClick={() => onAddNode(type, { x: 300, y: 100 + NODE_TYPES.indexOf(type) * 80 })}
            className='flex items-center gap-3 p-2 rounded-lg border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow text-sm'
            style={{ borderColor: colors.border, background: colors.bg }}
          >
            <span
              className='w-3 h-3 rounded-full flex-shrink-0'
              style={{ background: colors.border }}
            />
            <div>
              <div className='font-medium' style={{ color: colors.text }}>
                {NODE_LABELS[type]}
              </div>
              <div className='text-xs text-muted-foreground'>{NODE_DESCRIPTIONS[type]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
