'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

const COMPONENTS: Components = {
  // ====== Headings ======
  h1: ({ children, ...props }) => (
    <h1 className='mb-4 mt-6 text-xl font-bold tracking-tight first:mt-0' {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className='mb-3 mt-5 text-lg font-semibold tracking-tight' {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className='mb-2 mt-4 text-base font-semibold tracking-tight' {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className='mb-2 mt-3 text-sm font-semibold' {...props}>
      {children}
    </h4>
  ),

  // ====== Paragraph ======
  p: ({ children, ...props }) => (
    <p className='mb-3 leading-relaxed last:mb-0' {...props}>
      {children}
    </p>
  ),

  // ====== Code ======
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match && !className;
    const codeString = String(children).replace(/\n$/, '');

    if (isInline) {
      return (
        <code
          className='rounded-md bg-muted/70 px-1.5 py-0.5 text-[0.85em] font-mono font-medium text-foreground'
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className='group relative my-3 overflow-hidden rounded-lg border'>
        {match && (
          <div className='flex items-center justify-between border-b bg-muted/30 px-3 py-1.5'>
            <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
              {match[1]}
            </span>
          </div>
        )}
        <div className='overflow-x-auto'>
          <pre className='p-3 text-[13px] leading-relaxed'>
            <code className={className} {...props}>
              {codeString}
            </code>
          </pre>
        </div>
      </div>
    );
  },

  // ====== Blockquote ======
  blockquote: ({ children, ...props }) => (
    <blockquote
      className='my-3 border-l-3 border-primary/30 py-1 pl-4 text-muted-foreground italic'
      {...props}
    >
      {children}
    </blockquote>
  ),

  // ====== Lists ======
  ul: ({ children, ...props }) => (
    <ul className='mb-3 list-disc space-y-1 pl-5 last:mb-0' {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className='mb-3 list-decimal space-y-1 pl-5 last:mb-0' {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className='leading-relaxed' {...props}>
      {children}
    </li>
  ),

  // ====== Links ======
  a: ({ href, children, ...props }) => {
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className='font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary'
        {...props}
      >
        {children}
        {isExternal && (
          <span className='ml-0.5 inline-block text-[0.7em] opacity-60' aria-hidden='true'>
            ↗
          </span>
        )}
      </a>
    );
  },

  // ====== Tables ======
  table: ({ children, ...props }) => (
    <div className='my-3 overflow-x-auto rounded-lg border'>
      <table className='min-w-full border-collapse text-sm' {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className='bg-muted/50' {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className='border-b px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className='border-b px-3 py-2 text-foreground/80 last:border-b-0' {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr className='even:bg-muted/20 transition-colors hover:bg-muted/30' {...props}>
      {children}
    </tr>
  ),

  // ====== Horizontal Rule ======
  hr: (props) => <hr className='my-4 border-t border-border/50' {...props} />,

  // ====== Images ======
  img: ({ alt, src, ...props }) => (
    <img
      alt={alt || ''}
      src={src}
      className='my-3 max-w-full rounded-lg border'
      loading='lazy'
      {...props}
    />
  ),

  // ====== Task List (GFM) ======
  input: ({ checked, ...props }) => (
    <input
      type='checkbox'
      checked={checked}
      readOnly
      className='mr-1.5 mt-0.5 size-3.5 accent-primary'
      {...props}
    />
  ),
};
