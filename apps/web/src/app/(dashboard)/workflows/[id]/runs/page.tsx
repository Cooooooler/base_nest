'use client';

import { workflowApi } from '@/api/workflow';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WorkflowRunsPage() {
  const params = useParams();
  const router = useRouter();
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    workflowApi
      .getRuns(params.id as string)
      .then(setRuns)
      .catch(console.error);
  }, [params.id]);

  const statusColor: Record<string, string> = {
    running: 'text-blue-500',
    succeeded: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-gray-500',
  };

  return (
    <div className='p-6'>
      <div className='flex items-center gap-4 mb-6'>
        <button onClick={() => router.back()} className='text-sm text-muted-foreground'>
          {'←'} 返回
        </button>
        <h1 className='text-2xl font-bold'>运行历史</h1>
      </div>
      <div className='space-y-2'>
        {runs.map((run) => (
          <div
            key={run.id}
            className='flex items-center gap-4 p-3 border rounded-lg cursor-pointer'
            onClick={() => router.push(`/workflows/${params.id}/runs/${run.id}`)}
          >
            <span className={`font-medium ${statusColor[run.status] || 'text-gray-500'}`}>
              {run.status}
            </span>
            <span className='text-sm'>{new Date(run.createdAt).toLocaleString()}</span>
            {run.error && <span className='text-red-500 text-sm ml-auto'>{run.error}</span>}
          </div>
        ))}
        {runs.length === 0 && <p className='text-muted-foreground'>暂无运行记录</p>}
      </div>
    </div>
  );
}
