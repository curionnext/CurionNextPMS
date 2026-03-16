import { useState } from 'react';
import { Search, Plus, User } from 'lucide-react';
import { useGuestStore } from '../../../stores/guestStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface GuestSelectorProps {
  selectedGuestId: string;
  onSelectGuest: (guestId: string) => void;
}

export function GuestSelector({ selectedGuestId, onSelectGuest }: GuestSelectorProps) {
  const { guests, addGuest, searchGuests, isLoading } = useGuestStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newGuestData, setNewGuestData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
    idType: 'passport' as 'passport' | 'driving_license' | 'national_id',
    idNumber: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchResults = searchQuery ? searchGuests(searchQuery) : guests.slice(0, 10);

  const handleCreateGuest = async () => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const guest = await addGuest({
        firstName: newGuestData.firstName,
        lastName: newGuestData.lastName,
        email: newGuestData.email,
        phone: newGuestData.phone,
        nationality: newGuestData.country,
        idType: newGuestData.idType,
        idNumber: newGuestData.idNumber,
        address: {
          street: newGuestData.street,
          city: newGuestData.city,
          state: newGuestData.state,
          country: newGuestData.country,
          zipCode: newGuestData.zipCode
        },
        totalSpent: 0
      });

      onSelectGuest(guest.id);
      setIsCreatingNew(false);
      setNewGuestData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: '',
        idType: 'passport',
        idNumber: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create guest. Please try again.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCreatingNew) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Create New Guest</h4>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsCreatingNew(false);
              setFormError(null);
              setIsSubmitting(false);
            }}
          >
            Back to Search
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            required
            value={newGuestData.firstName}
            onChange={(e) => setNewGuestData({ ...newGuestData, firstName: e.target.value })}
            placeholder="John"
          />
          <Input
            label="Last Name"
            required
            value={newGuestData.lastName}
            onChange={(e) => setNewGuestData({ ...newGuestData, lastName: e.target.value })}
            placeholder="Doe"
          />
          <Input
            label="Email"
            type="email"
            required
            value={newGuestData.email}
            onChange={(e) => setNewGuestData({ ...newGuestData, email: e.target.value })}
            placeholder="john@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            required
            value={newGuestData.phone}
            onChange={(e) => setNewGuestData({ ...newGuestData, phone: e.target.value })}
            placeholder="+91 9876543210"
          />
          <div className="col-span-2">
            <Input
              label="Street Address"
              value={newGuestData.street}
              onChange={(e) => setNewGuestData({ ...newGuestData, street: e.target.value })}
              placeholder="Street address"
            />
          </div>
          <Input
            label="City"
            value={newGuestData.city}
            onChange={(e) => setNewGuestData({ ...newGuestData, city: e.target.value })}
            placeholder="Mumbai"
          />
          <Input
            label="State"
            value={newGuestData.state}
            onChange={(e) => setNewGuestData({ ...newGuestData, state: e.target.value })}
            placeholder="Maharashtra"
          />
          <Input
            label="Zip Code"
            value={newGuestData.zipCode}
            onChange={(e) => setNewGuestData({ ...newGuestData, zipCode: e.target.value })}
            placeholder="400001"
          />
          <Input
            label="ID Type"
            value={newGuestData.idType}
            onChange={(e) => setNewGuestData({ ...newGuestData, idType: e.target.value as any })}
            placeholder="Passport"
          />
          <Input
            label="ID Number"
            required
            value={newGuestData.idNumber}
            onChange={(e) => setNewGuestData({ ...newGuestData, idNumber: e.target.value })}
            placeholder="A1234567"
          />
        </div>

        {formError && (
          <p className="text-sm text-red-600">{formError}</p>
        )}

        <Button
          onClick={handleCreateGuest}
          disabled={
            !newGuestData.firstName ||
            !newGuestData.lastName ||
            !newGuestData.email ||
            !newGuestData.phone ||
            !newGuestData.idNumber ||
            isSubmitting ||
            isLoading
          }
          className="w-full"
        >
          {isSubmitting || isLoading ? 'Creating...' : 'Create Guest'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setIsCreatingNew(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Guest
        </Button>
      </div>

      {/* Guest List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No guests found</p>
            <Button
              onClick={() => {
                setFormError(null);
                setIsCreatingNew(true);
              }}
              variant="secondary"
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Guest
            </Button>
          </div>
        ) : (
          searchResults.map((guest) => (
            <button
              key={guest.id}
              onClick={() => onSelectGuest(guest.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${selectedGuestId === guest.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">
                    {guest.firstName} {guest.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{guest.email}</p>
                  <p className="text-sm text-gray-500">{guest.phone}</p>
                </div>
                {selectedGuestId === guest.id && (
                  <div className="flex-shrink-0">
                    <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
