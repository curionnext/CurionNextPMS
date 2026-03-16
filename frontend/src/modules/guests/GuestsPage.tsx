import { useMemo, useState } from 'react';
import { Search, Users, TrendingUp, Star } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useGuestStore } from '../../stores/guestStore';
import { useReservationStore } from '../../stores/reservationStore';
import { GuestProfileDrawer } from './components/GuestProfileDrawer';
import type { Guest, Reservation } from '../../types';
import { getInitials } from '../../utils';
import { parseISO } from 'date-fns';

interface GuestStats {
  visitCount: number;
  lastStay?: string;
  lastStayTime?: number;
  stays: Reservation[];
}

export function GuestsPage() {
  const { guests, updateGuest } = useGuestStore();
  const { reservations } = useReservationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statsMap = useMemo(() => {
    const map = new Map<string, GuestStats>();

    reservations.forEach((reservation) => {
      const guestId = reservation.guest?.id || (reservation as any).guestId;
      if (!guestId) {
        return;
      }

      if (!map.has(guestId)) {
        map.set(guestId, { visitCount: 0, stays: [] });
      }

      const entry = map.get(guestId)!;
      entry.visitCount += 1;
      entry.stays.push(reservation);

      const reference = reservation.checkOut || reservation.checkIn;
      if (reference) {
        const time = safeParse(reference);
        if (time && (!entry.lastStayTime || time > entry.lastStayTime)) {
          entry.lastStayTime = time;
          entry.lastStay = reference;
        }
      }
    });

    return map;
  }, [reservations]);

  const filteredGuests = useMemo(() => {
    if (!searchTerm.trim()) {
      return guests;
    }
    const term = searchTerm.toLowerCase();
    return guests.filter((guest) => {
      const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
      return (
        fullName.includes(term) ||
        guest.phone.toLowerCase().includes(term) ||
        guest.email.toLowerCase().includes(term)
      );
    });
  }, [guests, searchTerm]);

  const selectedGuest = selectedGuestId
    ? guests.find((guest) => guest.id === selectedGuestId) || null
    : null;
  const selectedStats = selectedGuestId ? statsMap.get(selectedGuestId) : undefined;

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuestId(guest.id);
    setDrawerOpen(true);
  };

  const handleUpdatePreferences = async (preferences: Guest['preferences']) => {
    if (!selectedGuestId) {
      return;
    }

    await updateGuest(selectedGuestId, { preferences });
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedGuestId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
          <p className="mt-1 text-sm text-gray-500">Maintain guest profiles, stay history, and personalized preferences.</p>
        </div>
        <Button variant="secondary">
          <Users className="mr-2 h-4 w-4" /> Import Guests
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search guest by name, phone, or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-12 w-full pl-11 text-base"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
            <TrendingUp className="h-4 w-4 text-primary-500" />
            {reservations.length} total reservations
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
            <Star className="h-4 w-4 text-amber-500" />
            {guests.length} guests on file
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredGuests.map((guest) => {
          const stats = statsMap.get(guest.id);
          const visitCount = stats?.visitCount || 0;
          const lastStayLabel = stats?.lastStay ? formatDisplayDate(stats.lastStay) : 'No stays yet';
          const primaryPreference = guest.preferences?.bedType || guest.preferences?.smokingPreference || 'No room preference set';
          const foodPreference = guest.preferences?.food?.cuisinePreferences?.[0] || guest.preferences?.food?.dietaryRestrictions?.[0] || 'No food notes';

          return (
            <button
              key={guest.id}
              type="button"
              onClick={() => handleGuestClick(guest)}
              className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-600">
                  {getInitials(`${guest.firstName} ${guest.lastName}`)}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {guest.firstName} {guest.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{guest.email}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Visits</span>
                  <span className="font-semibold text-gray-900">{visitCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last stay</span>
                  <span>{lastStayLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Room pref</span>
                  <span className="truncate" title={primaryPreference}>
                    {primaryPreference}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Food pref</span>
                  <span className="truncate" title={foodPreference}>
                    {foodPreference}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {!filteredGuests.length && (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
            No guests match your search. Add a new guest from a reservation or import from your PMS.
          </div>
        )}
      </div>

      <GuestProfileDrawer
        guest={selectedGuest}
        stays={selectedStats?.stays || []}
        visitCount={selectedStats?.visitCount || 0}
        lastStay={selectedStats?.lastStay}
        isOpen={drawerOpen && !!selectedGuest}
        onClose={handleCloseDrawer}
        onUpdatePreferences={handleUpdatePreferences}
      />
    </div>
  );
}

function safeParse(value: string) {
  try {
    return parseISO(value).getTime();
  } catch (error) {
    return undefined;
  }
}

function formatDisplayDate(value: string) {
  try {
    const date = parseISO(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    return value;
  }
}
