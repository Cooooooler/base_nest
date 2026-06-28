import { cn } from '@/lib/utils';

function Marker({
  className,
  variant = 'default',
  role,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'separator';
}) {
  return (
    <div
      data-slot='marker'
      data-variant={variant}
      role={role}
      className={cn(
        'flex items-center gap-2 text-xs text-muted-foreground',
        variant === 'separator'
          ? 'flex-row py-1 [&::after]:ml-2 [&::after]:h-px [&::after]:flex-1 [&::after]:bg-border [&::before]:mr-2 [&::before]:h-px [&::before]:flex-1 [&::before]:bg-border'
          : 'py-1',
        className
      )}
      {...props}
    />
  );
}

function MarkerIcon({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='marker-icon'
      className={cn('flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5', className)}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot='marker-content' className={cn('', className)} {...props} />;
}

export { Marker, MarkerContent, MarkerIcon };
