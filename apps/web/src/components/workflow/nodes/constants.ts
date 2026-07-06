// Workflow node type definitions and shared constants

export const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  start: { bg: '#f6ffed', border: '#52c41a', text: '#135200' },
  end: { bg: '#fff2f0', border: '#ff4d4f', text: '#820014' },
  llm: { bg: '#e6f4ff', border: '#1677ff', text: '#002c8c' },
  code: { bg: '#f9f0ff', border: '#722ed1', text: '#22075e' },
  condition: { bg: '#fffbe6', border: '#faad14', text: '#614700' },
  http_request: { bg: '#fff7e6', border: '#fa8c16', text: '#612500' },
  knowledge_retrieval: { bg: '#e6fffb', border: '#13c2c2', text: '#002329' },
  question_classifier: { bg: '#fff0f6', border: '#eb2f96', text: '#520339' },
  user_input: { bg: '#f0f5ff', border: '#2f54eb', text: '#061178' },
};

export const NODE_LABELS: Record<string, string> = {
  start: '开始',
  end: '结束',
  llm: 'LLM',
  code: 'Code',
  condition: '条件分支',
  http_request: 'HTTP 请求',
  knowledge_retrieval: '知识库检索',
  question_classifier: '问题分类',
  user_input: '用户输入',
};

export const NODE_DESCRIPTIONS: Record<string, string> = {
  start: '工作流入口，接收用户输入',
  end: '工作流出口，输出最终结果',
  llm: '调用大模型生成回复',
  code: '执行自定义 JavaScript 代码',
  condition: '根据布尔表达式分支',
  http_request: '调用外部 HTTP API',
  knowledge_retrieval: '从知识库检索相关内容',
  question_classifier: '用 LLM 对用户问题分类',
  user_input: '在工作流运行时收集用户输入',
};

export const NODE_DEFAULTS: Record<string, Record<string, any>> = {
  start: {},
  end: { output: '' },
  llm: { providerId: '', model: '', prompt: '', temperature: 0.7, maxTokens: 4096 },
  code: { code: 'return inputs;', inputs: {} },
  condition: { expression: '' },
  http_request: { url: '', method: 'GET', headers: {}, body: '' },
  knowledge_retrieval: { knowledgeBaseId: '', query: '', topK: 4 },
  question_classifier: { providerId: '', model: '', instruction: '', categories: [], input: '' },
  user_input: { fieldName: '', fieldLabel: '', fieldType: 'text', placeholder: '', required: true },
};

export type NodeType = keyof typeof NODE_LABELS;

// Define which nodes can have which handles
// start: only source (no inputs)
// end: only target (no outputs)
// condition/question_classifier: multiple source handles
export function getNodeHandles(nodeType: string): { sources: string[]; targets: string[] } {
  switch (nodeType) {
    case 'start':
      return { sources: ['output'], targets: [] };
    case 'end':
      return { sources: [], targets: ['input'] };
    case 'condition':
      return { sources: ['true', 'false'], targets: ['input'] };
    case 'question_classifier':
      return { sources: [], targets: ['input'] };
    default:
      return { sources: ['output'], targets: ['input'] };
  }
}
