import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReservationStore } from '../../../stores/reservationStore';
import { usePropertyStore } from '../../../stores/propertyStore';
import { Button } from '../../../components/ui/Button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

export function ReservationCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { reservations } = useReservationStore();
  const { roomTypes } = usePropertyStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getReservationsForDate = (date: Date) => {
    return reservations.filter((res) => {
      const checkIn = new Date(res.checkIn);
      const checkOut = new Date(res.checkOut);
      return date >= checkIn && date < checkOut && res.status !== 'cancelled';
    });
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={goToPreviousMonth}
                className="px-3 py-1.5 hover:bg-gray-50 border-r border-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToNextMonth}
                className="px-3 py-1.5 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-center text-xs font-semibold text-gray-600 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, dayIdx) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const dayReservations = getReservationsForDate(day);

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[120px] border-b border-r border-gray-200 p-2
                  ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                  ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm font-medium
                      ${isToday 
                        ? 'flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white' 
                        : isCurrentMonth 
                          ? 'text-gray-900' 
                          : 'text-gray-400'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayReservations.length > 0 && (
                    <span className="text-xs font-medium text-gray-500">
                      {dayReservations.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayReservations.slice(0, 3).map((res) => {
                    const roomType = roomTypes.find(rt => rt.id === res.roomTypeId);
                    return (
                      <div
                        key={res.id}
                        className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-800 truncate cursor-pointer hover:bg-primary-200"
                        title={`${res.confirmationNumber} - ${roomType?.name || 'Room'}`}
                      >
                        {res.confirmationNumber}
                      </div>
                    );
                  })}
                  {dayReservations.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{dayReservations.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary-600"></div>
            <span className="text-gray-600">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary-100 border border-primary-300"></div>
            <span className="text-gray-600">Reservation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
