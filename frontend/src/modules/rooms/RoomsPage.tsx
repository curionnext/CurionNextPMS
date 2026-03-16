import { useEffect } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { usePropertyStore } from '../../stores/propertyStore';
import { RoomInventorySection } from '../property/components/RoomInventorySection.tsx';
import { Button } from '../../components/ui/Button.tsx';

export function RoomsPage() {
  const isHydrated = usePropertyStore((state) => state.isHydrated);
  const isLoading = usePropertyStore((state) => state.isLoading);
  const error = usePropertyStore((state) => state.error);
  const hydrateFromBackend = usePropertyStore((state) => state.hydrateFromBackend);

  useEffect(() => {
    if (!isHydrated && !isLoading) {
      hydrateFromBackend().catch(() => undefined);
    }
  }, [hydrateFromBackend, isHydrated, isLoading]);

  if (!isHydrated && isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading rooms…</span>
        </div>
      </div>
    );
  }

  if (error && !isLoading && !isHydrated) {
    return (
      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <div className="text-sm font-semibold text-red-700">Unable to load rooms.</div>
        <div className="text-sm text-red-600">{error}</div>
        <div className="flex justify-center">
          <Button onClick={() => hydrateFromBackend()} isLoading={isLoading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage room statuses, assignments, and capacity directly from your live inventory.
        </p>
      </div>

      <RoomInventorySection />
    </div>
  );
}
