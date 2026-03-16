import { cn } from '../../utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        {
          'bg-zinc-50 text-zinc-700 ring-zinc-600/20': variant === 'default',
          'bg-green-50 text-green-700 ring-green-600/20': variant === 'success',
          'bg-yellow-50 text-yellow-800 ring-yellow-600/20': variant === 'warning',
          'bg-red-50 text-red-700 ring-red-600/20': variant === 'danger' || variant === 'destructive',
          'bg-blue-50 text-blue-700 ring-blue-600/20': variant === 'info',
          'bg-gray-50 text-gray-700 ring-gray-600/20': variant === 'secondary',
          'bg-transparent text-gray-700 ring-gray-300': variant === 'outline',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
