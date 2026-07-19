'use client';

// Workflow node type definitions and shared constants

import type { FC } from 'react';
import { CodeConfig } from '../node-config-panel/code';
import { ConditionConfig } from '../node-config-panel/condition';
import { HttpRequestConfig } from '../node-config-panel/http-request';
import { KnowledgeRetrievalConfig } from '../node-config-panel/knowledge-retrieval';
import { LlmConfig } from '../node-config-panel/llm';
import { QuestionClassifierConfig } from '../node-config-panel/question-classifier';
import type { NodeConfigProps } from '../node-config-panel/types';
import { UserInputConfig } from '../node-config-panel/user-input';

export interface NodeTypeEntry {
  color: { bg: string; border: string; text: string };
  label: string;
  description: string;
  defaults: Record<string, any>;
  handles: { sources: string[]; targets: string[] };
  configComponent?: FC<NodeConfigProps>;
}

export const NODE_CONFIGS: Record<string, NodeTypeEntry> = {
  start: {
    color: { bg: '#f6ffed', border: '#52c41a', text: '#135200' },
    label: '开始',
    description: '工作流入口，接收用户输入',
    defaults: {},
    handles: { sources: ['output'], targets: [] },
  },
  end: {
    color: { bg: '#fff2f0', border: '#ff4d4f', text: '#820014' },
    label: '结束',
    description: '工作流出口，输出最终结果',
    defaults: {},
    handles: { sources: [], targets: ['input'] },
  },
  llm: {
    color: { bg: '#e6f4ff', border: '#1677ff', text: '#002c8c' },
    label: 'LLM',
    description: '调用大模型生成回复',
    defaults: { providerId: '', model: '', prompt: '', temperature: 0.7, maxTokens: 4096 },
    handles: { sources: ['output'], targets: ['input'] },
    configComponent: LlmConfig,
  },
  code: {
    color: { bg: '#f9f0ff', border: '#722ed1', text: '#22075e' },
    label: 'Code',
    description: '执行自定义 JavaScript 代码',
    defaults: { code: 'return inputs;', inputs: {} },
    handles: { sources: ['output'], targets: ['input'] },
    configComponent: CodeConfig,
  },
  condition: {
    color: { bg: '#fffbe6', border: '#faad14', text: '#614700' },
    label: '条件分支',
    description: '根据布尔表达式分支',
    defaults: { expression: '' },
    handles: { sources: ['true', 'false'], targets: ['input'] },
    configComponent: ConditionConfig,
  },
  http_request: {
    color: { bg: '#fff7e6', border: '#fa8c16', text: '#612500' },
    label: 'HTTP 请求',
    description: '调用外部 HTTP API',
    defaults: { url: '', method: 'GET', headers: {}, body: '' },
    handles: { sources: ['output'], targets: ['input'] },
    configComponent: HttpRequestConfig,
  },
  knowledge_retrieval: {
    color: { bg: '#e6fffb', border: '#13c2c2', text: '#002329' },
    label: '知识库检索',
    description: '从知识库检索相关内容',
    defaults: { knowledgeBaseId: '', query: '', topK: 4 },
    handles: { sources: ['output'], targets: ['input'] },
    configComponent: KnowledgeRetrievalConfig,
  },
  question_classifier: {
    color: { bg: '#fff0f6', border: '#eb2f96', text: '#520339' },
    label: '问题分类',
    description: '用 LLM 对用户问题分类',
    defaults: { providerId: '', model: '', instruction: '', categories: [], input: '' },
    handles: { sources: [], targets: ['input'] },
    configComponent: QuestionClassifierConfig,
  },
  user_input: {
    color: { bg: '#f0f5ff', border: '#2f54eb', text: '#061178' },
    label: '用户输入',
    description: '在工作流运行时收集用户输入',
    defaults: { fieldName: '', fieldLabel: '', fieldType: 'text', placeholder: '', required: true },
    handles: { sources: ['output'], targets: ['input'] },
    configComponent: UserInputConfig,
  },
};

// Derived flat maps for backward compatibility
export const NODE_COLORS: Record<string, NodeTypeEntry['color']> = {};
export const NODE_LABELS: Record<string, string> = {};
export const NODE_DESCRIPTIONS: Record<string, string> = {};
export const NODE_DEFAULTS: Record<string, Record<string, any>> = {};

for (const [key, config] of Object.entries(NODE_CONFIGS)) {
  NODE_COLORS[key] = config.color;
  NODE_LABELS[key] = config.label;
  NODE_DESCRIPTIONS[key] = config.description;
  NODE_DEFAULTS[key] = config.defaults;
}

export type NodeType = keyof typeof NODE_LABELS;

export function getNodeHandles(nodeType: string): { sources: string[]; targets: string[] } {
  return NODE_CONFIGS[nodeType]?.handles ?? { sources: ['output'], targets: ['input'] };
}
