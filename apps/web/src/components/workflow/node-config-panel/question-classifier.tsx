import { Input } from '@base/ui/input';
import { Label } from '@base/ui/label';
import { Textarea } from '@base/ui/textarea';
import type { NodeConfigProps } from './types';

export function QuestionClassifierConfig({ config, onSave, providers }: NodeConfigProps) {
  const set = (key: string, value: any) => onSave({ ...config, [key]: value });

  return (
    <div className='space-y-3'>
      <div>
        <Label>Provider</Label>
        <select
          value={(config.providerId as string) || ''}
          onChange={(e) => set('providerId', e.target.value)}
          className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
        >
          <option value=''>选择 Provider...</option>
          {providers?.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Model</Label>
        <Input
          value={(config.model as string) || ''}
          onChange={(e) => set('model', e.target.value)}
          placeholder='gpt-4o'
        />
      </div>
      <div>
        <Label>分类说明</Label>
        <Textarea
          value={(config.instruction as string) || ''}
          onChange={(e) => set('instruction', e.target.value)}
          placeholder='请将用户问题分类到以下类别...'
          rows={3}
        />
      </div>
    </div>
  );
}
