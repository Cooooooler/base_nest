import { Input } from '@base/ui/input';
import { Label } from '@base/ui/label';
import { Textarea } from '@base/ui/textarea';
import type { NodeConfigProps } from './types';

export function LlmConfig({ config, onSave, providers }: NodeConfigProps) {
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
              {p.name} ({p.type})
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
        <Label>Prompt</Label>
        <Textarea
          value={(config.prompt as string) || ''}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder='输入提示词，使用 {{nodes.x.output}} 引用上游输出'
          rows={5}
        />
      </div>
      <div className='flex gap-3'>
        <div className='flex-1'>
          <Label>Temperature</Label>
          <Input
            type='number'
            min={0}
            max={2}
            step={0.1}
            value={config.temperature ?? 0.7}
            onChange={(e) => set('temperature', Number(e.target.value))}
          />
        </div>
        <div className='flex-1'>
          <Label>Max Tokens</Label>
          <Input
            type='number'
            value={config.maxTokens ?? 4096}
            onChange={(e) => set('maxTokens', Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
