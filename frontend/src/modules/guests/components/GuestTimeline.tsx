import { format, parseISO } from 'date-fns';
import { Calendar, BedDouble, Receipt, Clock } from 'lucide-react';
import type { Reservation } from '../../../types';
import { cn } from '../../../utils';

interface GuestTimelineProps {
  stays: Reservation[];
}

const statusTone: Record<Reservation['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-700',
  'checked-in': 'bg-emerald-100 text-emerald-700',
  'checked-out': 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  'no-show': 'bg-gray-200 text-gray-600',
};

export function GuestTimeline({ stays }: GuestTimelineProps) {
  if (!stays.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
        No stays recorded yet.
      </div>
    );
  }

  const ordered = [...stays].sort((a, b) => {
    const aDate = a.checkIn ? parseISO(a.checkIn).getTime() : 0;
    const bDate = b.checkIn ? parseISO(b.checkIn).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="space-y-6">
      {ordered.map((stay, index) => {
        const checkInDate = stay.checkIn ? format(parseISO(stay.checkIn), 'MMM d, yyyy') : 'N/A';
        const checkOutDate = stay.checkOut ? format(parseISO(stay.checkOut), 'MMM d, yyyy') : 'N/A';
        const badgeTone = statusTone[stay.status] || 'bg-gray-200 text-gray-600';
        const rooms = stay.roomNumbers?.length ? stay.roomNumbers.join(', ') : 'Not assigned';

        return (
          <div key={stay.id} className="relative pl-8">
            <span className="absolute left-1.5 top-2 h-3 w-3 rounded-full bg-primary-500" />
            {index !== ordered.length - 1 && (
              <span className="absolute left-2 top-5 h-full w-px bg-gray-200" aria-hidden="true" />
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{checkInDate}</p>
                  <p className="text-xs text-gray-500">to {checkOutDate}</p>
                </div>
                <span className={cn('rounded-full px-3 py-1 text-xs font-medium', badgeTone)}>
                  {stay.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Nights: {stay.nights}
                </div>
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-gray-400" />
                  Room: {rooms}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Rate Plan: {stay.ratePlanId}
                </div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-gray-400" />
                  Total: ₹{stay.totalAmount.toLocaleString()}
                </div>
              </div>

              {stay.specialRequests && (
                <p className="mt-3 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-700">
                  Special request: {stay.specialRequests}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
