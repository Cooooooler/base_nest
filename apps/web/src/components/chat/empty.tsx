import { cn } from '@/lib/utils';

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='empty'
      className={cn('flex h-full flex-col items-center justify-center gap-3', className)}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='empty-header'
      className={cn('flex flex-col items-center gap-1', className)}
      {...props}
    />
  );
}

function EmptyMedia({
  className,
  variant = 'icon',
  ...props
}: React.ComponentProps<'div'> & { variant?: 'icon' | 'image' }) {
  return (
    <div
      data-slot='empty-media'
      data-variant={variant}
      className={cn(
        variant === 'icon' &&
          'flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6',
        variant === 'image' && 'max-w-full',
        className
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='empty-title'
      className={cn('text-sm font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='empty-description'
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
