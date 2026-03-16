import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-zinc-900">
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'appearance-none flex h-10 w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm transition-all',
              'focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-50',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-zinc-300 hover:border-zinc-400',
              'cursor-pointer',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-zinc-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
