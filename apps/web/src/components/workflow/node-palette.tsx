'use client';

import { Brain, Code, Database, GitBranch, Globe, Hash, Plus } from 'lucide-react';
import type { FC } from 'react';

import { NODE_COLORS, NODE_DESCRIPTIONS, NODE_LABELS } from './nodes/constants';

interface Props {
  onAddNode: (type: string, position: { x: number; y: number }) => void;
}

const NODE_TYPES = Object.keys(NODE_LABELS).filter((t) => t !== 'start' && t !== 'end');

const NODE_ICONS: Record<string, typeof Brain> = {
  llm: Brain,
  code: Code,
  condition: GitBranch,
  http_request: Globe,
  knowledge_retrieval: Database,
  question_classifier: Hash,
};

export const NodePalette: FC<Props> = ({ onAddNode }) => {
  return (
    <div className='flex flex-col items-center gap-1 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg'>
      {NODE_TYPES.map((type) => {
        const Icon = NODE_ICONS[type] || Plus;
        const colors = NODE_COLORS[type] ?? { bg: '#f5f5f5', border: '#d9d9d9', text: '#333' };
        return (
          <button
            key={type}
            onClick={() => onAddNode(type, { x: 300, y: 100 + NODE_TYPES.indexOf(type) * 80 })}
            className='relative group flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent transition-colors'
            style={{ color: colors.border }}
            title={NODE_LABELS[type]}
          >
            <Icon size={18} />
            {/* Tooltip */}
            <div className='absolute left-full ml-2 px-2 py-1.5 rounded-md text-xs whitespace-nowrap bg-popover text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50'>
              <div className='font-medium'>{NODE_LABELS[type]}</div>
              <div className='text-muted-foreground'>{NODE_DESCRIPTIONS[type]}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
