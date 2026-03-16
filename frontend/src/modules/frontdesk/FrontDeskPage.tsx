import { useMemo, useState, type ComponentType } from 'react';
import { CalendarCheck, ClipboardList, DoorOpen, LogOut, Users } from 'lucide-react';
import { format, isToday, isBefore, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { CheckInFlow } from './components/CheckInFlow';
import { CheckOutFlow } from './components/CheckOutFlow';
import { useReservationStore } from '../../stores/reservationStore';
import { cn } from '../../utils';

const tabs = [
  { label: 'Check-in', value: 'check-in' as const },
  { label: 'Check-out', value: 'check-out' as const },
];

type TabValue = (typeof tabs)[number]['value'];

export function FrontDeskPage() {
  const { reservations } = useReservationStore();
  const [activeTab, setActiveTab] = useState<TabValue>('check-in');

  const { arrivals, departures, inHouse, overdue } = useMemo(() => {
    const today = new Date();

    const arrivalsToday = reservations.filter((res) => {
      if (!res.checkIn) return false;
      const checkInDate = parseISO(res.checkIn);
      return isToday(checkInDate) && (res.status === 'confirmed' || res.status === 'pending');
    }).length;

    const departuresToday = reservations.filter((res) => {
      if (!res.checkOut) return false;
      const checkOutDate = parseISO(res.checkOut);
      return isToday(checkOutDate) && res.status === 'checked-in';
    }).length;

    const inHouseCount = reservations.filter((res) => res.status === 'checked-in').length;

    const overdueCount = reservations.filter((res) => {
      if (!res.checkOut) return false;
      const checkOutDate = parseISO(res.checkOut);
      return isBefore(checkOutDate, today) && res.status !== 'checked-out';
    }).length;

    return {
      arrivals: arrivalsToday,
      departures: departuresToday,
      inHouse: inHouseCount,
      overdue: overdueCount,
    };
  }, [reservations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Front Desk</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor arrivals, manage in-house guests, and streamline departures.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <ClipboardList className="mr-2 h-4 w-4" /> Shift Notes
          </Button>
          <Button variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Quick Check-out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={DoorOpen}
          label="Arrivals Today"
          value={arrivals}
          helper={format(new Date(), 'MMM d, yyyy')}
        />
        <SummaryCard
          icon={CalendarCheck}
          label="Due Departures"
          value={departures}
          helper="Guests checked-in and scheduled to leave"
        />
        <SummaryCard
          icon={Users}
          label="In-House"
          value={inHouse}
          helper="Currently occupied"
        />
        <SummaryCard
          icon={LogOut}
          label="Overdue"
          value={overdue}
          helper="Departures pending completion"
          tone="warning"
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.value
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            All times displayed in property timezone.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-6">
          {activeTab === 'check-in' ? <CheckInFlow /> : <CheckOutFlow />}
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper?: string;
  tone?: 'default' | 'warning';
}

function SummaryCard({ icon: Icon, label, value, helper, tone = 'default' }: SummaryCardProps) {
  const toneClasses = tone === 'warning'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-white text-gray-900 border-gray-200';

  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', toneClasses)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <span className="rounded-full bg-primary-50 p-2 text-primary-600">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {helper && <p className="mt-3 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}
