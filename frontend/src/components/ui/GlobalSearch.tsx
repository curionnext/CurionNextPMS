import { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, Users, Bed, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReservationStore } from '../../stores/reservationStore';
import { useGuestStore } from '../../stores/guestStore';
import { usePropertyStore } from '../../stores/propertyStore';
import { formatCurrency } from '../../utils';

interface SearchResult {
  id: string;
  type: 'reservation' | 'guest' | 'room';
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { reservations } = useReservationStore();
  const { guests } = useGuestStore();
  const { rooms } = usePropertyStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    const foundResults: SearchResult[] = [];

    // Search reservations
    reservations.forEach((reservation) => {
      const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName || ''}`.toLowerCase();
      const confirmationNumber = reservation.confirmationNumber?.toLowerCase() || '';
      const roomNumbers = reservation.roomNumbers?.join(', ') || '';

      if (
        guestName.includes(searchTerm) ||
        confirmationNumber.includes(searchTerm) ||
        roomNumbers.includes(searchTerm)
      ) {
        foundResults.push({
          id: reservation.id,
          type: 'reservation',
          title: `${reservation.guest.firstName} ${reservation.guest.lastName || ''}`,
          subtitle: `${reservation.confirmationNumber} • ${roomNumbers} • ${formatCurrency(reservation.totalAmount || 0)}`,
          href: `/reservations/${reservation.id}`,
          icon: Calendar,
        });
      }
    });

    // Search guests
    guests.forEach((guest) => {
      const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
      const email = guest.email?.toLowerCase() || '';
      const phone = guest.phone?.toLowerCase() || '';

      if (fullName.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm)) {
        foundResults.push({
          id: guest.id,
          type: 'guest',
          title: `${guest.firstName} ${guest.lastName}`,
          subtitle: `${guest.email || ''} ${guest.phone ? '• ' + guest.phone : ''}`,
          href: `/guests/${guest.id}`,
          icon: Users,
        });
      }
    });

    // Search rooms
    rooms.forEach((room) => {
      const roomNumber = room.roomNumber?.toLowerCase() || '';
      const roomTypeId = room.roomTypeId?.toLowerCase() || '';

      if (roomNumber.includes(searchTerm) || roomTypeId.includes(searchTerm)) {
        foundResults.push({
          id: room.id,
          type: 'room',
          title: room.roomNumber,
          subtitle: `Type: ${room.roomTypeId} • ${room.status}`,
          href: `/rooms`,
          icon: Bed,
        });
      }
    });

    setResults(foundResults.slice(0, 8)); // Limit to 8 results
    setIsOpen(foundResults.length > 0);
    setSelectedIndex(0);
  }, [query, reservations, guests, rooms]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].href);
          setQuery('');
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          placeholder="Search reservations, guests, rooms..."
          className="w-full pl-9 pr-9 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <div className="py-2 max-h-[400px] overflow-y-auto">
            {results.map((result, index) => {
              const Icon = result.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                    isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                  )}
                >
                  <div className="flex-shrink-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        result.type === 'reservation' && 'bg-blue-50 text-blue-600',
                        result.type === 'guest' && 'bg-green-50 text-green-600',
                        result.type === 'room' && 'bg-purple-50 text-purple-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{result.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{result.subtitle}</p>
                  </div>
                  {isSelected && <ArrowRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200">
            <p className="text-xs text-zinc-500">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
