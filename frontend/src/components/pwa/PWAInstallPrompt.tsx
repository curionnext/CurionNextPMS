import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Smartphone, X } from 'lucide-react';
import { cn } from '../../utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome !== 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <div className={cn('fixed inset-x-0 bottom-0 z-50 px-4 pb-4')}
      role="dialog"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="flex-1 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Install Aurora PMS</p>
          <p className="text-xs text-gray-500">Add to your home screen to stay signed in and work offline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-gray-600">
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" className="gap-2" onClick={handleInstall}>
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}
