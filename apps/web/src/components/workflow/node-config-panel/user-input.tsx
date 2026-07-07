import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NodeConfigProps } from './types';

export function UserInputConfig({ config, onSave }: NodeConfigProps) {
  const set = (key: string, value: any) => onSave({ ...config, [key]: value });

  return (
    <div className='space-y-3'>
      <div>
        <Label>字段标识</Label>
        <Input
          value={(config.fieldName as string) || ''}
          onChange={(e) => set('fieldName', e.target.value)}
          placeholder='user_name'
        />
        <p className='text-xs text-muted-foreground mt-1'>
          变量名，用于在后续节点中通过 {`{{nodes.xxx.output.fieldName}}`} 引用
        </p>
      </div>
      <div>
        <Label>显示标签</Label>
        <Input
          value={(config.fieldLabel as string) || ''}
          onChange={(e) => set('fieldLabel', e.target.value)}
          placeholder='请输入用户名'
        />
      </div>
      <div>
        <Label>输入类型</Label>
        <select
          value={(config.fieldType as string) || 'text'}
          onChange={(e) => set('fieldType', e.target.value)}
          className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
        >
          <option value='text'>文本 (text)</option>
          <option value='number'>数字 (number)</option>
          <option value='email'>邮箱 (email)</option>
          <option value='textarea'>多行文本 (textarea)</option>
        </select>
      </div>
      <div>
        <Label>占位文本</Label>
        <Input
          value={(config.placeholder as string) || ''}
          onChange={(e) => set('placeholder', e.target.value)}
          placeholder='请输入...'
        />
      </div>
      <div className='flex items-center gap-2'>
        <input
          type='checkbox'
          id='required'
          checked={config.required !== false}
          onChange={(e) => set('required', e.target.checked)}
          className='rounded border-gray-300'
        />
        <Label htmlFor='required' className='!mb-0'>
          必填
        </Label>
      </div>
    </div>
  );
}
