import { useMemo, useState } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { Search, Loader2, Plus, IdCard, BedDouble, AlertTriangle, Clock } from 'lucide-react';
import { useReservationStore } from '../../../stores/reservationStore';
import { usePropertyStore } from '../../../stores/propertyStore';
import { useTransactionLogStore } from '../../../stores/transactionLogStore';
import { cn } from '../../../utils';
import type { Reservation } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Stepper } from './Stepper';
import { CreateReservationModal } from '../../reservations/components/CreateReservationModal';

interface DocumentForm {
  id: string;
  type: 'passport' | 'national-id' | 'driving-license' | 'voter-id' | 'other';
  number: string;
  issuedCountry: string;
  expiryDate: string;
  notes: string;
}

const DOCUMENT_OPTIONS: { value: DocumentForm['type']; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'national-id', label: 'National ID' },
  { value: 'driving-license', label: 'Driving License' },
  { value: 'voter-id', label: 'Voter ID' },
  { value: 'other', label: 'Other' },
];

const EARLY_CHECKIN_HOUR = 14; // 2 PM official check-in time

const createDocument = (): DocumentForm => ({
  id: Math.random().toString(36).substr(2, 9),
  type: 'passport',
  number: '',
  issuedCountry: 'India',
  expiryDate: '',
  notes: '',
});

const steps = [
  { title: 'Find Reservation', description: 'Search arrivals or create walk-in booking' },
  { title: 'Verify Identity', description: 'Capture guest identification details' },
  { title: 'Assign Room', description: 'Confirm room allocation and adjustments' },
  { title: 'Review & Confirm', description: 'Finalize check-in and hand over keys' },
];

export function CheckInFlow() {
  const { reservations, checkIn } = useReservationStore();
  const { rooms, updateRoomStatus } = usePropertyStore();
  const { logTransaction } = useTransactionLogStore();

  const [step, setStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [documents, setDocuments] = useState<DocumentForm[]>([createDocument()]);
  const [assignedRoom, setAssignedRoom] = useState<string>('');
  const [earlyCheckInApplied, setEarlyCheckInApplied] = useState(false);
  const [earlyFee, setEarlyFee] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [handledBy, setHandledBy] = useState('Front Desk');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  const arrivals = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return reservations
      .filter((res) => res.status === 'confirmed' || res.status === 'pending')
      .filter((res) => {
        const checkInDate = parseISO(res.checkIn);
        const arrivalWindow = new Date();
        arrivalWindow.setDate(arrivalWindow.getDate() + 1);
        return checkInDate <= arrivalWindow;
      })
      .filter((res) => {
        if (!lower) return true;
        const guestName = `${res.guest.firstName} ${res.guest.lastName}`.toLowerCase();
        return (
          res.confirmationNumber.toLowerCase().includes(lower) ||
          guestName.includes(lower) ||
          res.guest.email?.toLowerCase().includes(lower) ||
          res.guest.phone?.toLowerCase().includes(lower)
        );
      })
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  }, [reservations, searchTerm]);

  const availableRooms = useMemo(() => {
    if (!selectedReservation) return [];
    return rooms
      .filter((room) => room.roomTypeId === selectedReservation.roomTypeId)
      .filter((room) => room.status === 'vacant' || room.status === 'dirty')
      .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
  }, [rooms, selectedReservation]);

  const isEarlyCheckIn = useMemo(() => {
    if (!selectedReservation) return false;
    const today = new Date();
    if (!isToday(parseISO(selectedReservation.checkIn))) return false;
    const cutoff = new Date(`${selectedReservation.checkIn}T${String(EARLY_CHECKIN_HOUR).padStart(2, '0')}:00:00`);
    return today < cutoff;
  }, [selectedReservation]);

  const resetFlow = () => {
    setStep(0);
    setSearchTerm('');
    setSelectedReservation(null);
    setDocuments([createDocument()]);
    setAssignedRoom('');
    setEarlyCheckInApplied(false);
    setEarlyFee('0');
    setRemarks('');
    setHandledBy('Front Desk');
    setIsSubmitting(false);
  };

  const handleSelectReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setAssignedRoom(reservation.roomNumbers[0] || '');
    setStep(1);
  };

  const updateDocument = (id: string, updates: Partial<DocumentForm>) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)));
  };

  const addDocument = () => setDocuments((prev) => [...prev, createDocument()]);

  const removeDocument = (id: string) => {
    setDocuments((prev) => (prev.length > 1 ? prev.filter((doc) => doc.id !== id) : prev));
  };

  const handleConfirm = async () => {
    if (!selectedReservation) return;
    if (!assignedRoom) return;

    const validDocs = documents.filter((doc) => doc.number.trim().length > 0);
    setIsSubmitting(true);

    try {
      await checkIn({
        reservationId: selectedReservation.id,
        assignedRooms: [assignedRoom],
        documents: validDocs.map((doc) => ({
          type: doc.type,
          number: doc.number,
          issuedCountry: doc.issuedCountry,
          expiryDate: doc.expiryDate || undefined,
          notes: doc.notes || undefined,
        })),
        handledBy,
        earlyCheckIn: earlyCheckInApplied
          ? {
              isEarly: true,
              fee: Number(earlyFee) || 0,
              remarks: remarks || undefined,
            }
          : undefined,
        remarks: remarks || undefined,
      });

      // Log check-in transaction
      await logTransaction({
        eventType: 'CHECK_IN',
        entityType: 'RESERVATION',
        entityId: selectedReservation.id,
        description: `Guest checked in: ${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName} to room ${assignedRoom}`,
        metadata: {
          confirmationNumber: selectedReservation.confirmationNumber,
          guestName: `${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}`,
          roomNumber: assignedRoom,
          earlyCheckIn: earlyCheckInApplied,
          earlyCheckInFee: earlyCheckInApplied ? Number(earlyFee) : 0,
          handledBy,
        },
        previousState: { status: selectedReservation.status },
        newState: { status: 'checked-in', assignedRoom },
      });

      const room = rooms.find((r) => r.roomNumber === assignedRoom);
      if (room) {
        await updateRoomStatus(room.id, 'occupied');
        // Log room status change
        await logTransaction({
          eventType: 'ROOM_STATUS_CHANGED',
          entityType: 'ROOM',
          entityId: room.id,
          description: `Room ${assignedRoom} marked as occupied`,
          metadata: {
            roomNumber: assignedRoom,
            reservationId: selectedReservation.id,
          },
          previousState: { status: room.status },
          newState: { status: 'occupied' },
        });
      }

      setSuccessMessage(`Checked-in ${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}`);
      setStep(3);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to complete check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToDocuments = !!selectedReservation;
  const canProceedToAssignment = documents.some((doc) => doc.number.trim().length > 0);
  const canProceedToReview = assignedRoom.length > 0;

  return (
    <div className="space-y-6">
      <Stepper steps={steps} currentStep={step} />

      {step === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-md relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by confirmation #, guest, email, phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button onClick={() => setShowWalkInModal(true)} className="h-12 px-6 text-base">
              <Plus className="mr-2 h-5 w-5" /> Walk-in Check-in
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {arrivals.map((reservation) => (
              <button
                key={reservation.id}
                onClick={() => handleSelectReservation(reservation)}
                className="flex flex-col items-start rounded-xl border border-gray-200 p-5 text-left transition hover:border-primary-400 hover:shadow-md"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {reservation.confirmationNumber}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(parseISO(reservation.checkIn), 'MMM d')}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-gray-900">
                  {reservation.guest.firstName} {reservation.guest.lastName}
                </p>
                <p className="text-sm text-gray-500">{reservation.guest.phone || reservation.guest.email}</p>
                <div className="mt-4 flex w-full items-center justify-between text-sm text-gray-600">
                  <span>Room Type: {reservation.roomTypeId}</span>
                  <span>{reservation.adults} adult(s)</span>
                </div>
              </button>
            ))}

            {arrivals.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <Search className="h-10 w-10 text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-700">No arrivals match your search.</p>
                <p className="text-xs text-gray-500">Create a walk-in reservation to continue.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 1 && selectedReservation && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-gray-900">Reservation</p>
            <p className="text-sm text-gray-600">
              {selectedReservation.confirmationNumber} • {selectedReservation.guest.firstName}{' '}
              {selectedReservation.guest.lastName}
            </p>
          </div>

          <div className="space-y-4">
            {documents.map((doc, index) => (
              <div key={doc.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <IdCard className="h-4 w-4" /> ID Document #{index + 1}
                  </div>
                  {documents.length > 1 && (
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    label="Document Type"
                    value={doc.type}
                    onChange={(e) => updateDocument(doc.id, { type: e.target.value as DocumentForm['type'] })}
                    options={DOCUMENT_OPTIONS}
                  />
                  <Input
                    label="Document Number"
                    value={doc.number}
                    onChange={(e) => updateDocument(doc.id, { number: e.target.value })}
                    placeholder="Enter ID number"
                  />
                  <Input
                    label="Issuing Country"
                    value={doc.issuedCountry}
                    onChange={(e) => updateDocument(doc.id, { issuedCountry: e.target.value })}
                    placeholder="Country"
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    value={doc.expiryDate}
                    onChange={(e) => updateDocument(doc.id, { expiryDate: e.target.value })}
                  />
                </div>
                <Input
                  label="Notes"
                  value={doc.notes}
                  onChange={(e) => updateDocument(doc.id, { notes: e.target.value })}
                  placeholder="Any additional remarks"
                  className="mt-3"
                />
              </div>
            ))}
          </div>

          <Button onClick={addDocument} variant="secondary" className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Document
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <Button variant="ghost" onClick={() => setStep(0)} className="text-base">
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToDocuments}
              className="min-w-[200px] h-12 text-base"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && selectedReservation && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <BedDouble className="h-5 w-5" /> Room Assignment
            </div>
            <p className="text-xs text-gray-500">
              Preferred: {selectedReservation.roomNumbers[0] || 'Not assigned'}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {availableRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setAssignedRoom(room.roomNumber)}
                className={cn(
                  'rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-400',
                  assignedRoom === room.roomNumber
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-400'
                )}
              >
                <p className="text-lg font-semibold text-gray-900">Room {room.roomNumber}</p>
                <p className="text-sm text-gray-600">Status: {room.status}</p>
              </button>
            ))}
          </div>

          {availableRooms.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
              No rooms available in inventory. Assign manually in notes.
            </div>
          )}

          {isEarlyCheckIn && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Early Check-in detected</p>
                <p className="mt-1 text-amber-700">
                  Official check-in is {EARLY_CHECKIN_HOUR.toString().padStart(2, '0')}:00 hrs. Apply charges if applicable.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
                    <input
                      type="checkbox"
                      checked={earlyCheckInApplied}
                      onChange={(e) => setEarlyCheckInApplied(e.target.checked)}
                    />
                    Apply early check-in fee
                  </label>
                  <Input
                    label="Fee"
                    type="number"
                    min="0"
                    value={earlyFee}
                    onChange={(e) => setEarlyFee(e.target.value)}
                    disabled={!earlyCheckInApplied}
                  />
                  <Input
                    label="Handled By"
                    value={handledBy}
                    onChange={(e) => setHandledBy(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <Input
            label="Front Desk Notes"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add special instructions, luggage tags, upgrades, etc."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <Button variant="ghost" onClick={() => setStep(1)} className="text-base">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canProceedToAssignment}
              className="min-w-[200px] h-12 text-base"
            >
              Review
            </Button>
          </div>
        </div>
      )}

      {step === 3 && selectedReservation && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          {successMessage ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Check-in Completed</p>
              <p className="mt-1">{successMessage}</p>
              <Button onClick={resetFlow} className="mt-4 w-full md:w-auto">
                Start Next Check-in
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs uppercase text-gray-500">Guest</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedReservation.guest.firstName} {selectedReservation.guest.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedReservation.guest.phone}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs uppercase text-gray-500">Reservation</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{selectedReservation.confirmationNumber}</p>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(selectedReservation.checkIn), 'MMM d')} - {format(parseISO(selectedReservation.checkOut), 'MMM d')} • {selectedReservation.nights} nights
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-800">Assigned Room</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">Room {assignedRoom || 'TBD'}</p>
                {earlyCheckInApplied && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
                    <Clock className="h-4 w-4" /> Early check-in fee applied: ₹{Number(earlyFee || '0').toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep(2)} className="text-base">
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isSubmitting || !canProceedToReview}
                  className="min-w-[220px] h-12 text-base"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> Completing...
                    </span>
                  ) : (
                    'Complete Check-in'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {showWalkInModal && (
        <CreateReservationModal
          onClose={() => setShowWalkInModal(false)}
          onSuccess={() => {
            setShowWalkInModal(false);
            setStep(0);
          }}
        />
      )}
    </div>
  );
}

