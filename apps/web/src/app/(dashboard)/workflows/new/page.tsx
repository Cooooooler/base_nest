'use client';

import { workflowApi } from '@/api/workflow';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wf = await workflowApi.create({
      name,
      description,
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} },
          {
            id: 'end',
            type: 'end',
            label: '结束',
            position: { x: 500, y: 200 },
            config: { output: '' },
          },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }],
      },
    });
    router.push(`/workflows/${wf.id}/edit`);
  };

  return (
    <div className='p-6 max-w-lg mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>新建工作流</h1>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium mb-1'>名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium mb-1'>描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='w-full px-3 py-2 border rounded-lg'
            rows={3}
          />
        </div>
        <button type='submit' className='px-4 py-2 bg-primary text-white rounded-lg'>
          创建并编辑
        </button>
      </form>
    </div>
  );
}
