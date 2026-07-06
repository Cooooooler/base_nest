import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CommonFields } from './shared';
import type { NodeConfigProps } from './types';

export function KnowledgeRetrievalConfig({ config, onSave, knowledgeBases }: NodeConfigProps) {
  const set = (key: string, value: any) => onSave({ ...config, [key]: value });

  return (
    <div className='space-y-3'>
      <CommonFields label={(config.label as string) || ''} onChange={(v) => set('label', v)} />
      <div>
        <Label>知识库</Label>
        <select
          value={(config.knowledgeBaseId as string) || ''}
          onChange={(e) => set('knowledgeBaseId', e.target.value)}
          className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
        >
          <option value=''>选择知识库...</option>
          {knowledgeBases?.map((kb: any) => (
            <option key={kb.id} value={kb.id}>
              {kb.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>查询语句</Label>
        <Input
          value={(config.query as string) || ''}
          onChange={(e) => set('query', e.target.value)}
          placeholder='{{nodes.start.output.query}}'
        />
      </div>
      <div>
        <Label>Top K</Label>
        <Input
          type='number'
          value={config.topK ?? 4}
          onChange={(e) => set('topK', Number(e.target.value))}
        />
      </div>
    </div>
  );
}
