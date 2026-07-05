export type NodeType =
  | 'start'
  | 'end'
  | 'llm'
  | 'code'
  | 'condition'
  | 'http_request'
  | 'knowledge_retrieval'
  | 'question_classifier';

export const NODE_TYPES: NodeType[] = [
  'start',
  'end',
  'llm',
  'code',
  'condition',
  'http_request',
  'knowledge_retrieval',
  'question_classifier',
];
