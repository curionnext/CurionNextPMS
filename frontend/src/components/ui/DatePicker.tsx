import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  min?: string;
  max?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  disabled,
  error,
  min,
  max,
  className
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const selected = new Date(year, month, day);
    const dateString = selected.toISOString().split('T')[0];
    
    if (min && dateString < min) return;
    if (max && dateString > max) return;
    
    onChange(dateString);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isDateSelected = (day: number) => {
    if (!value) return false;
    const selected = new Date(value);
    return selected.getDate() === day && 
           selected.getMonth() === month && 
           selected.getFullYear() === year;
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    
    if (min && dateString < min) return true;
    if (max && dateString > max) return true;
    return false;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Generate calendar days array
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-zinc-900 mb-1.5">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full px-3.5 py-2.5 text-left border rounded-lg text-sm transition-all',
          'flex items-center justify-between gap-2',
          'hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900',
          error ? 'border-red-500' : 'border-zinc-300',
          disabled ? 'bg-zinc-50 text-zinc-400 cursor-not-allowed' : 'bg-white text-zinc-900',
          !value && 'text-zinc-500'
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-zinc-400" />
          {formatDisplayDate(value)}
        </span>
        <ChevronRight className={cn(
          'h-4 w-4 text-zinc-400 transition-transform',
          isOpen && 'rotate-90'
        )} />
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full min-w-[320px] bg-white rounded-xl shadow-lg border border-zinc-200 p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-600" />
            </button>
            
            <div className="font-semibold text-zinc-900">
              {monthNames[month]} {year}
            </div>
            
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const selected = isDateSelected(day);
              const disabled = isDateDisabled(day);
              const isToday = 
                day === new Date().getDate() && 
                month === new Date().getMonth() && 
                year === new Date().getFullYear();

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={disabled}
                  className={cn(
                    'aspect-square rounded-lg text-sm font-medium transition-all',
                    'hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/20',
                    selected && 'bg-zinc-900 text-white hover:bg-zinc-800',
                    !selected && isToday && 'border-2 border-zinc-900',
                    disabled && 'text-zinc-300 cursor-not-allowed hover:bg-transparent'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <div className="mt-3 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                onChange(today);
                setIsOpen(false);
              }}
              className="w-full py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
