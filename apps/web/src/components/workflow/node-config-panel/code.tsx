import { Label } from '@base/ui/label';
import { Textarea } from '@base/ui/textarea';
import type { NodeConfigProps } from './types';

export function CodeConfig({ config, onSave }: Readonly<NodeConfigProps>) {
  const set = (key: string, value: any) => onSave({ ...config, [key]: value });

  return (
    <div className='space-y-3'>
      <div>
        <Label>JavaScript 代码</Label>
        <Textarea
          value={(config.code as string) || ''}
          onChange={(e) => set('code', e.target.value)}
          placeholder='return inputs.query.toUpperCase();'
          rows={6}
          className='font-mono text-sm'
        />
      </div>
    </div>
  );
}
