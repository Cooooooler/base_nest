'use client';

import { workflowApi } from '@/api/workflow';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [run, setRun] = useState<any>(null);
  const [nodeExecs, setNodeExecs] = useState<any[]>([]);

  useEffect(() => {
    const wid = params.id as string;
    const rid = params.runId as string;
    Promise.all([workflowApi.getRun(wid, rid), workflowApi.getNodeExecutions(wid, rid)])
      .then(([r, nodes]) => {
        setRun(r);
        setNodeExecs(nodes);
      })
      .catch(console.error);
  }, [params.id, params.runId]);

  if (!run) return <div className='p-6'>加载中...</div>;

  return (
    <div className='p-6'>
      <div className='flex items-center gap-4 mb-6'>
        <button onClick={() => router.back()} className='text-sm text-muted-foreground'>
          {'←'} 返回
        </button>
        <h1 className='text-2xl font-bold'>运行详情</h1>
        <span
          className={`px-2 py-0.5 rounded text-sm ${run.status === 'succeeded' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
        >
          {run.status}
        </span>
      </div>

      {run.error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm'>
          {run.error}
        </div>
      )}

      <div className='mb-6'>
        <h2 className='text-lg font-semibold mb-2'>节点执行</h2>
        <div className='space-y-1'>
          {nodeExecs.map((ne: any) => (
            <div key={ne.id} className='flex items-center gap-3 p-2 border rounded text-sm'>
              <span
                className={`w-2 h-2 rounded-full ${ne.status === 'succeeded' ? 'bg-green-500' : ne.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'}`}
              />
              <span className='font-medium'>{ne.nodeId}</span>
              <span className='text-muted-foreground'>({ne.nodeType})</span>
              <span className='text-xs text-muted-foreground ml-auto'>{ne.latency}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
