'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviders } from '@/hooks/use-providers';
import type { FC } from 'react';
import { NODE_LABELS } from '../nodes/constants';
import { CodeConfig } from './code';
import { ConditionConfig } from './condition';
import { HttpRequestConfig } from './http-request';
import { KnowledgeRetrievalConfig } from './knowledge-retrieval';
import { LlmConfig } from './llm';
import { QuestionClassifierConfig } from './question-classifier';
import type { NodeConfigPanelProps } from './types';
import { UserInputConfig } from './user-input';

const configComponents: Record<string, FC<any>> = {
  llm: LlmConfig,
  code: CodeConfig,
  condition: ConditionConfig,
  http_request: HttpRequestConfig,
  knowledge_retrieval: KnowledgeRetrievalConfig,
  question_classifier: QuestionClassifierConfig,
  user_input: UserInputConfig,
};

export const NodeConfigPanel: FC<NodeConfigPanelProps> = ({
  open,
  onOpenChange,
  nodeData,
  onSave,
}) => {
  const { data: providers } = useProviders();
  const { data: knowledgeBases } = useKnowledgeBases();

  const ConfigComponent = configComponents[nodeData.nodeType];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent overlay={false} className='w-100 sm:max-w-100 overflow-auto rounded-3xl'>
        <SheetHeader>
          <SheetTitle>{NODE_LABELS[nodeData.nodeType] || nodeData.nodeType} 配置</SheetTitle>
        </SheetHeader>
        <div className='mt-4 space-y-4'>
          {ConfigComponent ? (
            <ConfigComponent
              config={nodeData.config}
              providers={providers}
              knowledgeBases={knowledgeBases}
              onSave={(cfg: Record<string, any>) => {
                onSave(cfg);
              }}
            />
          ) : (
            <pre className='text-xs p-2 bg-muted rounded overflow-auto max-h-40'>
              {JSON.stringify(nodeData.config, null, 2)}
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
