import { Input } from '@base/ui/input';
import { Label } from '@base/ui/label';

interface CommonFieldsProps {
  label: string;
  onChange: (value: string) => void;
}

export function CommonFields({ label, onChange }: CommonFieldsProps) {
  return (
    <div>
      <Label>节点名称</Label>
      <Input value={label} onChange={(e) => onChange(e.target.value)} placeholder='节点显示名称' />
    </div>
  );
}
