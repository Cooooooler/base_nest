'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviders } from '@/hooks/use-providers';
import { type FC, useState } from 'react';
import { NODE_LABELS } from './nodes/constants';
import type { WorkflowNodeData } from './nodes/workflow-node';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: WorkflowNodeData;
  onSave: (config: Record<string, any>) => void;
}

export const NodeConfigPanel: FC<Props> = ({ open, onOpenChange, nodeData, onSave }) => {
  const { data: providers } = useProviders();
  const { data: knowledgeBases } = useKnowledgeBases();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent overlay={false} className='w-100 sm:max-w-100 overflow-auto rounded-3xl'>
        <SheetHeader>
          <SheetTitle>{NODE_LABELS[nodeData.nodeType] || nodeData.nodeType} 配置</SheetTitle>
        </SheetHeader>
        <div className='mt-4 space-y-4'>
          <NodeConfigFields
            nodeType={nodeData.nodeType}
            config={nodeData.config}
            providers={providers}
            knowledgeBases={knowledgeBases}
            onSave={(cfg) => {
              onSave(cfg);
              onOpenChange(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

function NodeConfigFields({
  nodeType,
  config,
  providers,
  knowledgeBases,
  onSave,
}: {
  nodeType: string;
  config: Record<string, any>;
  providers?: any[];
  knowledgeBases?: any[];
  onSave: (cfg: Record<string, any>) => void;
}) {
  const [state, setState] = useState<Record<string, any>>({ ...config });

  const update = (key: string, value: any) => setState((s) => ({ ...s, [key]: value }));

  const handleSave = () => onSave(state);

  const renderCommon = () => (
    <div className='space-y-3'>
      <div>
        <Label>节点名称</Label>
        <Input
          value={(state.label as string) || ''}
          onChange={(e) => update('label', e.target.value)}
          placeholder='节点显示名称'
        />
      </div>
    </div>
  );

  switch (nodeType) {
    case 'llm':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>Provider</Label>
            <select
              value={(state.providerId as string) || ''}
              onChange={(e) => update('providerId', e.target.value)}
              className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
            >
              <option value=''>选择 Provider...</option>
              {providers?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Model</Label>
            <Input
              value={(state.model as string) || ''}
              onChange={(e) => update('model', e.target.value)}
              placeholder='gpt-4o'
            />
          </div>
          <div>
            <Label>Prompt</Label>
            <Textarea
              value={(state.prompt as string) || ''}
              onChange={(e) => update('prompt', e.target.value)}
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
                value={state.temperature ?? 0.7}
                onChange={(e) => update('temperature', Number(e.target.value))}
              />
            </div>
            <div className='flex-1'>
              <Label>Max Tokens</Label>
              <Input
                type='number'
                value={state.maxTokens ?? 4096}
                onChange={(e) => update('maxTokens', Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    case 'code':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>JavaScript 代码</Label>
            <Textarea
              value={(state.code as string) || ''}
              onChange={(e) => update('code', e.target.value)}
              placeholder='return inputs.query.toUpperCase();'
              rows={6}
              className='font-mono text-sm'
            />
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    case 'condition':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>条件表达式</Label>
            <Input
              value={(state.expression as string) || ''}
              onChange={(e) => update('expression', e.target.value)}
              placeholder='{{nodes.llm_1.output.tokens.total}} > 100'
            />
            <p className='text-xs text-muted-foreground mt-1'>
              返回 true 走上方分支（true），false 走下方分支（false）
            </p>
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    case 'http_request':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>Method</Label>
            <select
              value={(state.method as string) || 'GET'}
              onChange={(e) => update('method', e.target.value)}
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
              value={(state.url as string) || ''}
              onChange={(e) => update('url', e.target.value)}
              placeholder='https://api.example.com/data'
            />
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    case 'knowledge_retrieval':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>知识库</Label>
            <select
              value={(state.knowledgeBaseId as string) || ''}
              onChange={(e) => update('knowledgeBaseId', e.target.value)}
              className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
            >
              <option value=''>选择知识库...</option>
              {knowledgeBases?.map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>查询语句</Label>
            <Input
              value={(state.query as string) || ''}
              onChange={(e) => update('query', e.target.value)}
              placeholder='{{nodes.start.output.query}}'
            />
          </div>
          <div>
            <Label>Top K</Label>
            <Input
              type='number'
              value={state.topK ?? 4}
              onChange={(e) => update('topK', Number(e.target.value))}
            />
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    case 'question_classifier':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>Provider</Label>
            <select
              value={(state.providerId as string) || ''}
              onChange={(e) => update('providerId', e.target.value)}
              className='w-full px-3 py-2 border rounded-lg text-sm bg-background'
            >
              <option value=''>选择 Provider...</option>
              {providers?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Model</Label>
            <Input
              value={(state.model as string) || ''}
              onChange={(e) => update('model', e.target.value)}
              placeholder='gpt-4o'
            />
          </div>
          <div>
            <Label>分类说明</Label>
            <Textarea
              value={(state.instruction as string) || ''}
              onChange={(e) => update('instruction', e.target.value)}
              placeholder='请将用户问题分类到以下类别...'
              rows={3}
            />
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    case 'user_input':
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <div>
            <Label>字段标识</Label>
            <Input
              value={(state.fieldName as string) || ''}
              onChange={(e) => update('fieldName', e.target.value)}
              placeholder='user_name'
            />
            <p className='text-xs text-muted-foreground mt-1'>
              变量名，用于在后续节点中通过 {`{{nodes.xxx.output.fieldName}}`} 引用
            </p>
          </div>
          <div>
            <Label>显示标签</Label>
            <Input
              value={(state.fieldLabel as string) || ''}
              onChange={(e) => update('fieldLabel', e.target.value)}
              placeholder='请输入用户名'
            />
          </div>
          <div>
            <Label>输入类型</Label>
            <select
              value={(state.fieldType as string) || 'text'}
              onChange={(e) => update('fieldType', e.target.value)}
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
              value={(state.placeholder as string) || ''}
              onChange={(e) => update('placeholder', e.target.value)}
              placeholder='请输入...'
            />
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='required'
              checked={state.required !== false}
              onChange={(e) => update('required', e.target.checked)}
              className='rounded border-gray-300'
            />
            <Label htmlFor='required' className='!mb-0'>
              必填
            </Label>
          </div>
          <Button onClick={handleSave} className='w-full'>
            保存
          </Button>
        </div>
      );

    default:
      return (
        <div className='space-y-3'>
          {renderCommon()}
          <pre className='text-xs p-2 bg-muted rounded overflow-auto max-h-40'>
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      );
  }
}
