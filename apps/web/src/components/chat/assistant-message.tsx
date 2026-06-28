'use client';

import { MarkdownRenderer } from '@/components/app/markdown-renderer';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import { Spinner } from '@/components/ui/spinner';
import { ReasoningBlock } from './reasoning-block';
import { SourceList } from './source-list';
import { StreamingMarkdown } from './streaming-markdown';
import type { ChatMessage } from './types';

export function AssistantMessage({ msg, streaming }: { msg: ChatMessage; streaming: boolean }) {
  return (
    <>
      {/* 思考中提示 — 仅在没有 reasoning 也没有 content 的流式阶段 */}
      {!msg.reasoning && !msg.content && streaming && (
        <Marker role='status'>
          <MarkerIcon>
            <Spinner />
          </MarkerIcon>
          <MarkerContent className='shimmer'>思考中...</MarkerContent>
        </Marker>
      )}

      {/* Reasoning — 用 Markdown 渲染思考过程 */}
      {msg.reasoning && (
        <ReasoningBlock streaming={streaming && !msg.content}>
          <div className='text-amber-800 dark:text-amber-300'>
            <MarkdownRenderer content={msg.reasoning} />
          </div>
        </ReasoningBlock>
      )}

      {/* Content — 有内容或 reasoning 阶段结束后开始打字 */}
      {(msg.content || (streaming && msg.reasoning)) && (
        <StreamingMarkdown content={msg.content || ''} />
      )}
      {msg.sources && msg.sources.length > 0 && <SourceList data={msg.sources} />}
    </>
  );
}
