import { useState } from 'react';
import { Calendar as CalendarIcon, List, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ReservationListView } from './components/ReservationListView';
import { ReservationCalendarView } from './components/ReservationCalendarView';
import { CreateReservationModal } from './components/CreateReservationModal';

type ViewMode = 'list' | 'calendar';

export function ReservationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage bookings and room availability
          </p>
        </div>
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`
                inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${viewMode === 'list' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`
                inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${viewMode === 'calendar' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </button>
          </div>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <ReservationListView onCreateClick={() => setIsCreateModalOpen(true)} />
      ) : (
        <ReservationCalendarView />
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateReservationModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
