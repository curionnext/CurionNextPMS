import { useEffect, useState } from 'react';
import { Building2, BedDouble, DoorOpen, Layers, Receipt, UtensilsCrossed } from 'lucide-react';
import { HotelProfileSection } from './components/HotelProfileSection.tsx';
import { RoomTypesSection } from './components/RoomTypesSection.tsx';
import { RoomInventorySection } from './components/RoomInventorySection.tsx';
import { FloorsSection } from './components/FloorsSection.tsx';
import { TaxConfigSection } from './components/TaxConfigSection.tsx';
import { POSManagementSection } from './components/POSManagementSection.tsx';
import { usePropertyStore } from '../../stores/propertyStore.ts';
import { Button } from '../../components/ui/Button.tsx';

type SetupStep = 'profile' | 'room-types' | 'inventory' | 'floors' | 'tax' | 'pos';

interface Step {
  id: SetupStep;
  name: string;
  icon: typeof Building2;
}

const steps: Step[] = [
  { id: 'profile', name: 'Hotel Profile', icon: Building2 },
  { id: 'room-types', name: 'Room Types', icon: BedDouble },
  { id: 'inventory', name: 'Room Inventory', icon: DoorOpen },
  { id: 'floors', name: 'Floors & Buildings', icon: Layers },
  { id: 'tax', name: 'Tax Configuration', icon: Receipt },
  { id: 'pos', name: 'POS Management', icon: UtensilsCrossed },
];

export function PropertySetupPage() {
  const [activeStep, setActiveStep] = useState<SetupStep>('profile');
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
        <div className="text-sm text-gray-600">Loading property data…</div>
      </div>
    );
  }

  if (error && !isLoading && !isHydrated) {
    return (
      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <div className="text-sm font-semibold text-red-700">Unable to load property data.</div>
        <div className="text-sm text-red-600">{error}</div>
        <div className="flex justify-center">
          <Button onClick={() => hydrateFromBackend()} isLoading={isLoading}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 'profile':
        return <HotelProfileSection />;
      case 'room-types':
        return <RoomTypesSection />;
      case 'inventory':
        return <RoomInventorySection />;
      case 'floors':
        return <FloorsSection />;
      case 'tax':
        return <TaxConfigSection />;
      case 'pos':
        return <POSManagementSection />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your property details, room types, and inventory
        </p>
      </div>

      {/* Step Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <nav className="flex divide-x divide-gray-200">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden sm:inline">{step.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderStepContent()}
      </div>
    </div>
  );
}
