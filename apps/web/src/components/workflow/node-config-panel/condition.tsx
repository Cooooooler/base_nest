import { Input } from '@base/ui/input';
import { Label } from '@base/ui/label';
import type { NodeConfigProps } from './types';

export function ConditionConfig({ config, onSave }: Readonly<NodeConfigProps>) {
  const set = (key: string, value: any) => onSave({ ...config, [key]: value });

  return (
    <div className='space-y-3'>
      <div>
        <Label>条件表达式</Label>
        <Input
          value={(config.expression as string) || ''}
          onChange={(e) => set('expression', e.target.value)}
          placeholder='{{nodes.llm_1.output.tokens.total}} > 100'
        />
        <p className='text-xs text-muted-foreground mt-1'>
          返回 true 走上方分支（true），false 走下方分支（false）
        </p>
      </div>
    </div>
  );
}
