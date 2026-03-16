import { cn } from '../../../utils';

interface StepperProps {
  steps: { title: string; description?: string }[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={step.title} className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    isCompleted && 'border-green-500 bg-green-500 text-white',
                    isActive && !isCompleted && 'border-primary-500 text-primary-600 bg-primary-50',
                    !isCompleted && !isActive && 'border-gray-300 text-gray-500 bg-white'
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', isActive ? 'text-gray-900' : 'text-gray-600')}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 truncate">{step.description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden md:block h-px bg-gray-200" />
    </div>
  );
}
