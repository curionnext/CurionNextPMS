import { useState, useEffect } from 'react';
import { Search, Eye, Edit2, XCircle, Plus } from 'lucide-react';
import { useReservationStore } from '../../../stores/reservationStore';
import { useGuestStore } from '../../../stores/guestStore';
import { usePropertyStore } from '../../../stores/propertyStore';
import type { Reservation, ReservationStatus } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { cn } from '../../../utils';
import { format } from 'date-fns';

const statusConfig: Record<ReservationStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  'checked-in': { label: 'Checked In', color: 'bg-green-100 text-green-800' },
  'checked-out': { label: 'Checked Out', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  'no-show': { label: 'No Show', color: 'bg-orange-100 text-orange-800' },
};

interface ReservationListViewProps {
  onCreateClick: () => void;
}

export function ReservationListView({ onCreateClick }: ReservationListViewProps) {
  const { reservations, cancelReservation } = useReservationStore();
  const { guests } = useGuestStore();
  const { roomTypes } = usePropertyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    let filtered = [...reservations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (res) =>
          res.confirmationNumber.toLowerCase().includes(query) ||
          guests.find(g => g.id === res.guest.id)?.firstName.toLowerCase().includes(query) ||
          guests.find(g => g.id === res.guest.id)?.lastName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((res) => res.status === statusFilter);
    }

    // Sort by check-in date (newest first)
    filtered.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

    setFilteredReservations(filtered);
  }, [reservations, searchQuery, statusFilter, guests]);

  const getGuestName = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    return guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest';
  };

  const getRoomTypeName = (roomTypeId: string) => {
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    return roomType?.name || 'Unknown Room Type';
  };

  const handleCancelReservation = async (id: string) => {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      const reason = prompt('Cancellation reason (optional):');
      try {
        await cancelReservation(id, reason || undefined);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to cancel reservation');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by confirmation number or guest name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'checked-in', label: 'Checked In' },
              { value: 'checked-out', label: 'Checked Out' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {/* Reservations Table */}
      {filteredReservations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No reservations found</p>
          <Button onClick={onCreateClick} variant="secondary" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create First Reservation
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confirmation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In / Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-semibold text-primary-600">
                        {reservation.confirmationNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getGuestName(reservation.guest.id)}
                      </div>
                      <div className="text-sm text-gray-500">{reservation.source}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRoomTypeName(reservation.roomTypeId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(reservation.checkIn), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(reservation.checkOut), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-400">{reservation.nights} night(s)</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reservation.adults}A {reservation.children > 0 && `${reservation.children}C`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{reservation.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">{reservation.paymentStatus}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded',
                          statusConfig[reservation.status].color
                        )}
                      >
                        {statusConfig[reservation.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          className="text-primary-600 hover:text-primary-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {reservation.status === 'confirmed' && (
                          <>
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelReservation(reservation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
