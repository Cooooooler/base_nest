import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NodeConfigProps } from './types';

export function HttpRequestConfig({ config, onSave }: NodeConfigProps) {
  const set = (key: string, value: any) => onSave({ ...config, [key]: value });

  return (
    <div className='space-y-3'>
      <div>
        <Label>Method</Label>
        <select
          value={(config.method as string) || 'GET'}
          onChange={(e) => set('method', e.target.value)}
          className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>URL</Label>
        <Input
          value={(config.url as string) || ''}
          onChange={(e) => set('url', e.target.value)}
          placeholder='https://api.example.com/data'
        />
      </div>
    </div>
  );
}
