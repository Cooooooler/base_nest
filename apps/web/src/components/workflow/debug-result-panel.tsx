'use client';

import type { FC } from 'react';

function getStatusClass(status: string): string {
  if (status === 'succeeded') return 'bg-green-100 text-green-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-blue-100 text-blue-700';
}

function getDotColor(status: string): string {
  if (status === 'succeeded') return 'bg-green-500';
  if (status === 'failed') return 'bg-red-500';
  if (status === 'skipped') return 'bg-gray-300';
  return 'bg-blue-400';
}

interface NodeExecutionData {
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  latency?: number;
  error?: string;
}

interface Props {
  status: string;
  outputs?: Record<string, any>;
  nodeExecutions?: NodeExecutionData[];
  onClose: () => void;
}

export const DebugResultPanel: FC<Props> = ({ status, outputs, nodeExecutions, onClose }) => {
  const statusBadge = getStatusClass(status);

  return (
    <div className='border-t bg-muted/30 max-h-[40vh] overflow-auto'>
      <div className='flex items-center justify-between px-4 py-2 border-b bg-background'>
        <div className='flex items-center gap-2'>
          <h3 className='font-semibold text-sm'>调试结果</h3>
          <span className={`px-2 py-0.5 rounded text-xs ${statusBadge}`}>{status}</span>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='text-xs text-muted-foreground hover:text-foreground'
        >
          关闭
        </button>
      </div>

      {/* Final outputs */}
      {outputs && (
        <div className='px-4 py-2'>
          <div className='text-xs font-medium text-muted-foreground mb-1'>最终输出</div>
          <pre className='text-xs p-2 bg-background border rounded max-h-20 overflow-auto'>
            {JSON.stringify(outputs, null, 2)}
          </pre>
        </div>
      )}

      {/* Node executions */}
      {nodeExecutions && nodeExecutions.length > 0 && (
        <div className='px-4 py-2'>
          <div className='text-xs font-medium text-muted-foreground mb-2'>节点执行记录</div>
          <div className='space-y-1'>
            {nodeExecutions.map((ne, i) => (
              <details key={`${ne.nodeId}-${i}`} className='text-xs'>
                <summary className='flex items-center gap-2 cursor-pointer p-1 hover:bg-muted rounded'>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(ne.status)}`}
                  />
                  <span className='font-medium'>{ne.nodeId}</span>
                  <span className='text-muted-foreground'>({ne.nodeType})</span>
                  {ne.latency != null && (
                    <span className='text-muted-foreground ml-auto'>{ne.latency}ms</span>
                  )}
                  {ne.error && <span className='text-red-500 ml-2'>{ne.error}</span>}
                </summary>
                {ne.inputs && (
                  <div className='ml-6 mt-1'>
                    <span className='text-muted-foreground'>Inputs:</span>
                    <pre className='text-xs p-1 bg-background border rounded mt-0.5 max-h-20 overflow-auto'>
                      {JSON.stringify(ne.inputs, null, 2)}
                    </pre>
                  </div>
                )}
                {ne.outputs && (
                  <div className='ml-6 mt-1'>
                    <span className='text-muted-foreground'>Outputs:</span>
                    <pre className='text-xs p-1 bg-background border rounded mt-0.5 max-h-20 overflow-auto'>
                      {JSON.stringify(ne.outputs, null, 2)}
                    </pre>
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
