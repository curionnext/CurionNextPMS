import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useReservationStore } from '../../../stores/reservationStore';
import { usePropertyStore } from '../../../stores/propertyStore';
import { useGuestStore } from '../../../stores/guestStore';
import type { BookingSource, OTASource } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { GuestSelector } from './GuestSelector';
import { PricingBreakdown } from './PricingBreakdown';

interface CreateReservationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateReservationModal({ onClose, onSuccess }: CreateReservationModalProps) {
  const { createReservation, ratePlans, checkAvailability } = useReservationStore();
  const { roomTypes } = usePropertyStore();
  const { guests } = useGuestStore();
  
  const [step, setStep] = useState<'details' | 'guest' | 'review'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    guestId: '',
    roomTypeId: roomTypes[0]?.id || '',
    checkIn: '',
    checkOut: '',
    adults: '2',
    children: '0',
    ratePlanId: ratePlans[0]?.id || '',
    source: 'walk-in' as BookingSource,
    otaSource: '' as OTASource | '',
    specialRequests: '',
    notes: '',
  });
  
  const [availability, setAvailability] = useState<{
    available: boolean;
    availableRooms: number;
    message?: string;
  } | null>(null);

  const handleCheckAvailability = async () => {
    if (!formData.roomTypeId || !formData.checkIn || !formData.checkOut) {
      setError('Please select room type and dates');
      return false;
    }
    
    if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      setError('Check-out date must be after check-in date');
      return false;
    }

    const result = await checkAvailability(formData.roomTypeId, formData.checkIn, formData.checkOut);
    setAvailability(result);

    if (!result.available) {
      setError(result.message || 'No rooms available');
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = async () => {
    if (step === 'details') {
      const available = await handleCheckAvailability();
      if (available) {
        setStep('guest');
      }
    } else if (step === 'guest') {
      if (!formData.guestId) {
        setError('Please select or create a guest');
        return;
      }
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'review') setStep('guest');
    else if (step === 'guest') setStep('details');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await createReservation({
        guestId: formData.guestId,
        roomTypeId: formData.roomTypeId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        adults: parseInt(formData.adults),
        children: parseInt(formData.children),
        ratePlanId: formData.ratePlanId,
        source: formData.source,
        otaSource: formData.otaSource || undefined,
        specialRequests: formData.specialRequests,
        notes: formData.notes,
      });
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGuest = guests.find(g => g.id === formData.guestId);
  const selectedRoomType = roomTypes.find(rt => rt.id === formData.roomTypeId);
  const selectedRatePlan = ratePlans.find(rp => rp.id === formData.ratePlanId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">New Reservation</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {step === 'details' && 'Step 1: Booking Details'}
                {step === 'guest' && 'Step 2: Guest Information'}
                {step === 'review' && 'Step 3: Review & Confirm'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              <div className={`flex-1 h-1 rounded ${step === 'details' || step === 'guest' || step === 'review' ? 'bg-primary-600' : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1 rounded ${step === 'guest' || step === 'review' ? 'bg-primary-600' : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1 rounded ${step === 'review' ? 'bg-primary-600' : 'bg-gray-200'}`} />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {step === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Room Type"
                    required
                    value={formData.roomTypeId}
                    onChange={(e) => {
                      setFormData({ ...formData, roomTypeId: e.target.value });
                      setAvailability(null);
                    }}
                    options={roomTypes.map(rt => ({ 
                      value: rt.id, 
                      label: `${rt.name} - ₹${rt.baseRate}/night` 
                    }))}
                  />
                  <Select
                    label="Rate Plan"
                    required
                    value={formData.ratePlanId}
                    onChange={(e) => setFormData({ ...formData, ratePlanId: e.target.value })}
                    options={ratePlans.filter(rp => rp.isActive).map(rp => ({ 
                      value: rp.id, 
                      label: `${rp.name} (${rp.discountPercentage}% off)` 
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Check-In Date"
                    type="date"
                    required
                    value={formData.checkIn}
                    onChange={(e) => {
                      setFormData({ ...formData, checkIn: e.target.value });
                      setAvailability(null);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    label="Check-Out Date"
                    type="date"
                    required
                    value={formData.checkOut}
                    onChange={(e) => {
                      setFormData({ ...formData, checkOut: e.target.value });
                      setAvailability(null);
                    }}
                    min={formData.checkIn || new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Adults"
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: e.target.value })}
                  />
                  <Input
                    label="Children"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Booking Source"
                    required
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as BookingSource })}
                    options={[
                      { value: 'walk-in', label: 'Walk-in' },
                      { value: 'phone', label: 'Phone' },
                      { value: 'email', label: 'Email' },
                      { value: 'website', label: 'Website' },
                      { value: 'ota', label: 'OTA' },
                      { value: 'agent', label: 'Travel Agent' },
                    ]}
                  />
                  {formData.source === 'ota' && (
                    <Select
                      label="OTA Platform"
                      value={formData.otaSource}
                      onChange={(e) => setFormData({ ...formData, otaSource: e.target.value as OTASource })}
                      options={[
                        { value: '', label: 'Select OTA...' },
                        { value: 'booking.com', label: 'Booking.com' },
                        { value: 'expedia', label: 'Expedia' },
                        { value: 'airbnb', label: 'Airbnb' },
                        { value: 'makemytrip', label: 'MakeMyTrip' },
                        { value: 'goibibo', label: 'Goibibo' },
                        { value: 'agoda', label: 'Agoda' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Early check-in, late check-out, etc."
                  />
                </div>

                {/* Availability Check */}
                {availability && (
                  <div className={`p-4 rounded-lg border ${availability.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {availability.available ? (
                        <>
                          <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-900">Rooms Available</p>
                            <p className="text-sm text-green-700 mt-0.5">
                              {availability.availableRooms} room(s) available for selected dates
                              {availability.message && ` - ${availability.message}`}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Not Available</p>
                            <p className="text-sm text-red-700 mt-0.5">{availability.message}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'guest' && (
              <GuestSelector
                selectedGuestId={formData.guestId}
                onSelectGuest={(guestId: string) => setFormData({ ...formData, guestId })}
              />
            )}

            {step === 'review' && (
              <div className="space-y-6">
                {/* Booking Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Booking Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Guest</p>
                      <p className="font-medium text-gray-900">
                        {selectedGuest?.firstName} {selectedGuest?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Room Type</p>
                      <p className="font-medium text-gray-900">{selectedRoomType?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-In</p>
                      <p className="font-medium text-gray-900">{formData.checkIn}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-Out</p>
                      <p className="font-medium text-gray-900">{formData.checkOut}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Guests</p>
                      <p className="font-medium text-gray-900">
                        {formData.adults} Adult(s), {formData.children} Child(ren)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rate Plan</p>
                      <p className="font-medium text-gray-900">{selectedRatePlan?.name}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <PricingBreakdown
                  roomTypeId={formData.roomTypeId}
                  ratePlanId={formData.ratePlanId}
                  checkIn={formData.checkIn}
                  checkOut={formData.checkOut}
                />

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Staff notes..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 px-6 py-4 border-t bg-gray-50">
            <Button
              type="button"
              variant="secondary"
              onClick={step === 'details' ? onClose : handleBack}
            >
              {step === 'details' ? 'Cancel' : 'Back'}
            </Button>
            <Button
              onClick={step === 'review' ? handleSubmit : handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : step === 'review' ? 'Confirm Reservation' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
