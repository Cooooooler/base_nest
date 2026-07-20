'use client';

import { Marker, MarkerContent, MarkerIcon } from '@base/ui/marker';
import { Spinner } from '@base/ui/spinner';
import dynamic from 'next/dynamic';
import { ReasoningBlock } from './reasoning-block';
import { SourceList } from './source-list';
import type { ChatMessage } from './types';

const MarkdownRenderer = dynamic(
  // @ts-expect-error — dynamic import with @/ webpack alias
  () => import('@/components/app/markdown-renderer').then((mod) => mod.MarkdownRenderer),
  { ssr: false }
) as React.ComponentType<{ content: string; className?: string }>;

const StreamingMarkdown = dynamic(
  // @ts-expect-error — dynamic import with @/ webpack alias
  () => import('@/components/chat/streaming-markdown').then((mod) => mod.StreamingMarkdown),
  { ssr: false }
) as React.ComponentType<{ content: string }>;

export function AssistantMessage({
  msg,
  streaming,
}: Readonly<{ msg: ChatMessage; streaming: boolean }>) {
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
