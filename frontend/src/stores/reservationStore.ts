import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Reservation,
  ReservationInput,
  ReservationStatus,
  RatePlan,
  IdentityDocument,
  EarlyCheckInDetail,
  ChargeItem,
  PaymentRecord,
  SettlementSummary,
  LateCheckoutDetail,
  PaymentMethod,
  Guest,
  BookingSource
} from '../types';
import { reservationApi, type ReservationResponse, type RatePlanCode, type ReservationStatusCode, type ReservationSourceCode, type UpdateReservationRequest } from '../services/reservationApi';
import { useGuestStore } from './guestStore';
import { usePropertyStore } from './propertyStore';

type StoreContext = {
  hotelId: string;
  hotelCode: string;
};

interface AvailabilityCheck {
  available: boolean;
  availableRooms: number;
  message?: string;
}

interface CheckInDocumentInput {
  type: IdentityDocument['type'];
  number: string;
  issuedCountry?: string;
  expiryDate?: string;
  notes?: string;
}

interface CheckInPayload {
  reservationId: string;
  assignedRooms: string[];
  documents: CheckInDocumentInput[];
  handledBy?: string;
  checkInTime?: string;
  earlyCheckIn?: EarlyCheckInDetail;
  remarks?: string;
}

interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
}

interface SettlementInput {
  roomCharges: number;
  additionalCharges: ChargeItem[];
  taxes: number;
  discounts: number;
  payments: PaymentInput[];
  notes?: string;
}

interface CheckOutPayload {
  reservationId: string;
  settlement: SettlementInput;
  lateCheckout?: LateCheckoutDetail;
  handledBy?: string;
  guestFeedback?: string;
  checkOutTime?: string;
}

interface ReservationState {
  context: StoreContext | null;
  isHydrated: boolean;
  error: string | null;
  reservations: Reservation[];
  ratePlans: RatePlan[];
  setContext: (context: StoreContext) => void;
  hydrateFromBackend: () => Promise<void>;
  reset: () => void;
  
  // Reservation Actions
  createReservation: (input: ReservationInput) => Promise<Reservation>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<Reservation>;
  cancelReservation: (id: string, reason?: string) => Promise<void>;
  checkIn: (payload: CheckInPayload) => Promise<Reservation>;
  checkOut: (payload: CheckOutPayload) => Promise<Reservation>;
  
  // Availability
  checkAvailability: (roomTypeId: string, checkIn: string, checkOut: string) => Promise<AvailabilityCheck>;
  
  // Rate Plans
  addRatePlan: (plan: Omit<RatePlan, 'id'>) => void;
  updateRatePlan: (id: string, updates: Partial<RatePlan>) => void;
  deleteRatePlan: (id: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatError = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const DEFAULT_RATE_PLANS: RatePlan[] = [
  {
    id: 'RP001',
    name: 'Best Available Rate',
    code: 'BAR',
    type: 'bar',
    baseRate: 7500,
    discountPercentage: 0,
    isActive: true,
    description: 'Standard public rate'
  },
  {
    id: 'RP002',
    name: 'Corporate Rate',
    code: 'CORPORATE',
    type: 'corporate',
    baseRate: 7000,
    discountPercentage: 15,
    isActive: true,
    description: '20% discount for corporate bookings'
  },
  {
    id: 'RP003',
    name: 'Weekend Package',
    code: 'PACKAGE',
    type: 'package',
    baseRate: 6800,
    discountPercentage: 10,
    isActive: true,
    description: 'Special weekend package with breakfast'
  }
];

const calculateNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const normalizeDocuments = (docs: CheckInDocumentInput[]): IdentityDocument[] =>
  docs.map((doc) => ({
    id: generateId(),
    type: doc.type,
    number: doc.number,
    issuedCountry: doc.issuedCountry,
    expiryDate: doc.expiryDate,
    notes: doc.notes,
    verifiedAt: new Date().toISOString(),
  }));

const createPaymentRecords = (payments: PaymentInput[], handledBy?: string): PaymentRecord[] =>
  payments.map((payment) => ({
    id: generateId(),
    method: payment.method,
    amount: payment.amount,
    reference: payment.reference,
    timestamp: new Date().toISOString(),
    collectedBy: handledBy,
    notes: payment.notes,
  }));

const buildSettlementSummary = (input: SettlementInput, handledBy?: string): SettlementSummary => {
  const additionalTotal = input.additionalCharges.reduce((sum, item) =>
    sum + item.amount + (item.taxAmount || 0), 0);
  const payments = createPaymentRecords(input.payments, handledBy);
  const totalCharges = input.roomCharges + additionalTotal + input.taxes - input.discounts;
  const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balanceDue = Math.max(Number((totalCharges - paymentsTotal).toFixed(2)), 0);
  const refundDue = Math.max(Number((paymentsTotal - totalCharges).toFixed(2)), 0);

  const summary: SettlementSummary = {
    roomCharges: input.roomCharges,
    additionalCharges: input.additionalCharges,
    taxes: input.taxes,
    discounts: input.discounts,
    payments,
    balanceDue,
    refundDue,
  };

  if (input.notes) {
    summary.notes = input.notes;
  }

  return summary;
};

const STATUS_FROM_BACKEND: Record<ReservationStatusCode, ReservationStatus> = {
  DRAFT: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked-in',
  CHECKED_OUT: 'checked-out',
  CANCELLED: 'cancelled'
};

const STATUS_TO_BACKEND: Record<ReservationStatus, ReservationStatusCode> = {
  pending: 'DRAFT',
  confirmed: 'CONFIRMED',
  'checked-in': 'CHECKED_IN',
  'checked-out': 'CHECKED_OUT',
  cancelled: 'CANCELLED',
  'no-show': 'CANCELLED'
};

const SOURCE_FROM_BACKEND: Record<ReservationSourceCode, BookingSource> = {
  DIRECT: 'website',
  OTA: 'ota',
  CORPORATE: 'agent',
  WALK_IN: 'walk-in'
};

const SOURCE_TO_BACKEND: Record<BookingSource, ReservationSourceCode> = {
  'walk-in': 'WALK_IN',
  'phone': 'DIRECT',
  'email': 'DIRECT',
  'website': 'DIRECT',
  'ota': 'OTA',
  'agent': 'CORPORATE'
};

const normalizeRatePlanCode = (code: string): RatePlanCode => {
  switch (code.toUpperCase()) {
    case 'BAR':
      return 'BAR';
    case 'CORPORATE':
    case 'CORP':
      return 'CORPORATE';
    case 'PACKAGE':
    case 'PKG':
    case 'WEEKEND':
      return 'PACKAGE';
    default:
      return 'BAR';
  }
};

const resolvePaymentStatus = (totalAmount: number, balanceDue: number, amountPaid: number): Reservation['paymentStatus'] => {
  if (amountPaid > totalAmount) {
    return 'refunded';
  }
  if (balanceDue <= 0) {
    return 'paid';
  }
  if (balanceDue >= totalAmount) {
    return 'unpaid';
  }
  return 'partial';
};

const buildGuestFallback = (id: string, timestamps: { createdAt: string; updatedAt: string }): Guest => ({
  id,
  firstName: 'Guest',
  lastName: '',
  email: '',
  phone: '',
  nationality: '',
  idType: 'passport',
  idNumber: '',
  totalSpent: 0,
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt
});

export const useReservationStore = create<ReservationState>()(
  persist(
    (set, get) => {
      const mapFromBackend = (record: ReservationResponse): Reservation => {
        const guests = useGuestStore.getState().guests;
        const { rooms, roomTypes } = usePropertyStore.getState();
        const ratePlans = get().ratePlans;

        const guest = guests.find((entry) => entry.id === record.guestId) ?? buildGuestFallback(record.guestId, { createdAt: record.createdAt, updatedAt: record.updatedAt });
        const roomType = roomTypes.find((entry) => entry.shortCode === record.roomType || entry.id === record.roomType);
        const room = record.roomId ? rooms.find((entry) => entry.id === record.roomId) : undefined;
        const nights = calculateNights(record.arrivalDate, record.departureDate);
        const subtotal = record.nightlyRate * nights;
        const totalAmount = record.billing?.totalAmount ?? subtotal;
        const balanceDue = record.billing?.balanceDue ?? totalAmount;
        const amountPaid = Math.max(totalAmount - balanceDue, 0);
        const tax = Math.max(totalAmount - subtotal, 0);
        const ratePlan = ratePlans.find((plan) => normalizeRatePlanCode(plan.code) === record.ratePlan);
        const ratePlanId = ratePlan ? ratePlan.id : ratePlans[0]?.id ?? 'RP001';

        return {
          id: record.id,
          confirmationNumber: record.otaReference ?? record.id.toUpperCase(),
          guest,
          roomTypeId: roomType?.id ?? record.roomType,
          roomNumbers: room ? [room.roomNumber] : [],
          checkIn: record.arrivalDate,
          checkOut: record.departureDate,
          adults: record.adults,
          children: record.children,
          nights,
          status: STATUS_FROM_BACKEND[record.status] ?? 'pending',
          ratePlanId,
          ratePerNight: record.nightlyRate,
          subtotal,
          tax,
          totalAmount,
          paymentStatus: resolvePaymentStatus(totalAmount, balanceDue, amountPaid),
          amountPaid,
          source: SOURCE_FROM_BACKEND[record.source] ?? 'website',
          otaSource: record.source === 'OTA' ? 'other' : undefined,
          specialRequests: record.notes,
          notes: record.notes,
          checkInDetails: record.checkInAt
            ? {
                documents: [],
                assignedRooms: room ? [room.roomNumber] : [],
                checkInTime: record.checkInAt,
                handledBy: undefined,
                earlyCheckIn: undefined,
                remarks: undefined
              }
            : undefined,
          checkOutDetails: record.checkOutAt
            ? {
                settlement: {
                  roomCharges: subtotal,
                  additionalCharges: [],
                  taxes: tax,
                  discounts: 0,
                  payments: [],
                  balanceDue,
                  refundDue: amountPaid > totalAmount ? amountPaid - totalAmount : 0,
                  notes: record.notes
                },
                lateCheckout: undefined,
                checkOutTime: record.checkOutAt,
                handledBy: undefined,
                guestFeedback: undefined
              }
            : undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          createdBy: 'system'
        };
      };

      const resolveRatePlanCodeById = (ratePlanId: string | undefined): RatePlanCode => {
        if (!ratePlanId) {
          return 'BAR';
        }
        const ratePlan = get().ratePlans.find((entry) => entry.id === ratePlanId);
        return normalizeRatePlanCode(ratePlan?.code ?? 'BAR');
      };

      return {
      context: null,
      isHydrated: false,
      error: null,
      reservations: [],
      ratePlans: DEFAULT_RATE_PLANS.map((plan) => ({ ...plan })),

      setContext: (context) => set({ context }),

      hydrateFromBackend: async () => {
        try {
          set({ isHydrated: false, error: null });
          console.log('[ReservationStore] Fetching reservations from backend...');
          const records = await reservationApi.fetchReservations();
          console.log('[ReservationStore] Received reservations:', records.length);
          const reservations = records.map(mapFromBackend);
          set({ reservations, isHydrated: true, error: null });
        } catch (error) {
          const message = formatError(error, 'Failed to load reservations.');
          set({ error: message, isHydrated: false });
          throw error;
        }
      },

      reset: () =>
        set({
          context: null,
          isHydrated: false,
          error: null,
          reservations: [],
          ratePlans: DEFAULT_RATE_PLANS.map((plan) => ({ ...plan }))
        }),
      
      createReservation: async (input: ReservationInput) => {
        const state = get();
        if (!state.context) {
          throw new Error('Reservation context unavailable. Please login again.');
        }

        const availability = await state.checkAvailability(input.roomTypeId, input.checkIn, input.checkOut);
        if (!availability.available) {
          throw new Error(availability.message || 'Room not available for the selected dates');
        }

        const ratePlan = state.ratePlans.find((rp) => rp.id === input.ratePlanId);
        if (!ratePlan) {
          throw new Error('Invalid rate plan selected');
        }

        const property = usePropertyStore.getState();
        const roomType = property.roomTypes.find((entry) => entry.id === input.roomTypeId);
        if (!roomType) {
          throw new Error('Unknown room type selected');
        }

        const baseRate = roomType.baseRate || ratePlan.baseRate;
        const nightlyRate = Math.max(
          Math.round(baseRate * (1 - ratePlan.discountPercentage / 100)),
          0
        );

        const payload = {
          hotelId: state.context.hotelId,
          hotelCode: state.context.hotelCode,
          guestId: input.guestId,
          roomType: roomType.shortCode,
          arrivalDate: input.checkIn,
          departureDate: input.checkOut,
          adults: input.adults,
          children: input.children,
          nightlyRate,
          ratePlan: normalizeRatePlanCode(ratePlan.code),
          source: SOURCE_TO_BACKEND[input.source] ?? 'DIRECT',
          otaReference: input.otaSource,
          isWalkIn: input.source === 'walk-in',
          notes: input.specialRequests ?? input.notes,
          currency: 'INR'
        };

        try {
          const created = await reservationApi.createReservation(payload);
          const reservation = mapFromBackend(created);
          set((prev) => ({ reservations: [...prev.reservations, reservation], error: null }));
          return reservation;
        } catch (error) {
          const message = formatError(error, 'Failed to create reservation.');
          set({ error: message });
          throw error;
        }
      },
      
      updateReservation: async (id, updates) => {
        const existing = get().reservations.find((entry) => entry.id === id);
        if (!existing) {
          throw new Error('Reservation not found');
        }

        const payload: UpdateReservationRequest = {};

        if (updates.checkIn) {
          payload.arrivalDate = updates.checkIn;
        }
        if (updates.checkOut) {
          payload.departureDate = updates.checkOut;
        }
        if (typeof updates.adults === 'number') {
          payload.adults = updates.adults;
        }
        if (typeof updates.children === 'number') {
          payload.children = updates.children;
        }
        if (updates.status) {
          payload.status = STATUS_TO_BACKEND[updates.status];
        }
        if (updates.ratePerNight !== undefined) {
          payload.nightlyRate = updates.ratePerNight;
        }
        if (updates.ratePlanId) {
          payload.ratePlan = resolveRatePlanCodeById(updates.ratePlanId);
        }
        if (updates.source) {
          payload.source = SOURCE_TO_BACKEND[updates.source];
        }
        if (updates.otaSource) {
          payload.otaReference = updates.otaSource;
        }
        if (updates.notes !== undefined || updates.specialRequests !== undefined) {
          payload.notes = updates.notes ?? updates.specialRequests ?? '';
        }
        if (updates.roomTypeId) {
          const property = usePropertyStore.getState();
          const roomType = property.roomTypes.find((entry) => entry.id === updates.roomTypeId);
          if (roomType) {
            payload.roomType = roomType.shortCode;
          }
        }
        if (updates.roomNumbers && updates.roomNumbers.length > 0) {
          const property = usePropertyStore.getState();
          const room = property.rooms.find((entry) => entry.roomNumber === updates.roomNumbers?.[0]);
          if (room) {
            payload.roomId = room.id;
          }
        }

        let updated: Reservation;

        if (Object.keys(payload).length === 0) {
          updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        } else {
          try {
            const record = await reservationApi.updateReservation(id, payload);
            const mapped = mapFromBackend(record);
            updated = {
              ...mapped,
              checkInDetails: updates.checkInDetails ?? existing.checkInDetails,
              checkOutDetails: updates.checkOutDetails ?? existing.checkOutDetails,
              notes: updates.notes ?? mapped.notes
            };
          } catch (error) {
            const message = formatError(error, 'Failed to update reservation.');
            set({ error: message });
            throw error;
          }
        }

        set((state) => ({
          reservations: state.reservations.map((res) => (res.id === id ? { ...res, ...updated } : res)),
          error: null
        }));

        return updated;
      },
      
      cancelReservation: async (id, reason) => {
        const existing = get().reservations.find((entry) => entry.id === id);
        if (!existing) {
          throw new Error('Reservation not found');
        }

        const mergedNotes = reason
          ? `${existing.notes ? `${existing.notes}\n` : ''}Cancellation reason: ${reason}`.trim()
          : existing.notes;

        await get().updateReservation(id, {
          status: 'cancelled',
          notes: mergedNotes
        });
      },
      
      checkIn: async ({ reservationId, assignedRooms, documents, handledBy, checkInTime, earlyCheckIn, remarks }) => {
        const property = usePropertyStore.getState();
        const targetRoomNumber = assignedRooms[0];
        const room = targetRoomNumber ? property.rooms.find((entry) => entry.roomNumber === targetRoomNumber) : undefined;

        try {
          const record = await reservationApi.updateReservation(reservationId, {
            status: 'CHECKED_IN',
            roomId: room?.id
          });

          const mapped = mapFromBackend(record);
          const normalizedDocs = normalizeDocuments(documents);
          const timestamp = checkInTime || new Date().toISOString();

          const updated: Reservation = {
            ...mapped,
            roomNumbers: assignedRooms.length ? assignedRooms : mapped.roomNumbers,
            checkInDetails: {
              documents: normalizedDocs,
              assignedRooms: assignedRooms.length ? assignedRooms : mapped.roomNumbers,
              checkInTime: timestamp,
              handledBy,
              earlyCheckIn,
              remarks
            }
          };

          set((state) => ({
            reservations: state.reservations.map((res) => (res.id === reservationId ? updated : res)),
            error: null
          }));

          return updated;
        } catch (error) {
          const message = formatError(error, 'Failed to check in reservation.');
          set({ error: message });
          throw error;
        }
      },
      
      checkOut: async ({ reservationId, settlement, lateCheckout, handledBy, guestFeedback, checkOutTime }) => {
        const summary = buildSettlementSummary(settlement, handledBy);
        const paymentsTotal = summary.payments.reduce((sum, payment) => sum + payment.amount, 0);

        try {
          const record = await reservationApi.updateReservation(reservationId, {
            status: 'CHECKED_OUT'
          });

          const mapped = mapFromBackend(record);
          const updated: Reservation = {
            ...mapped,
            amountPaid: paymentsTotal,
            paymentStatus:
              summary.balanceDue > 0
                ? 'partial'
                : summary.refundDue > 0
                  ? 'refunded'
                  : 'paid',
            checkOutDetails: {
              settlement: summary,
              lateCheckout,
              checkOutTime: checkOutTime || new Date().toISOString(),
              handledBy,
              guestFeedback
            }
          };

          set((state) => ({
            reservations: state.reservations.map((res) => (res.id === reservationId ? updated : res)),
            error: null
          }));

          return updated;
        } catch (error) {
          const message = formatError(error, 'Failed to check out reservation.');
          set({ error: message });
          throw error;
        }
      },
      
      checkAvailability: async (roomTypeId, checkIn, checkOut) => {
        const property = usePropertyStore.getState();
        const roomType = property.roomTypes.find((entry) => entry.id === roomTypeId);

        if (!roomType) {
          return {
            available: false,
            availableRooms: 0,
            message: 'Unknown room type'
          };
        }

        try {
          const result = await reservationApi.checkAvailability({
            arrivalDate: checkIn,
            departureDate: checkOut,
            roomType: roomType.shortCode
          });

          if (result.totalAvailable <= 0) {
            return {
              available: false,
              availableRooms: 0,
              message: 'No rooms available for selected dates'
            };
          }

          if (result.totalAvailable <= 2) {
            return {
              available: true,
              availableRooms: result.totalAvailable,
              message: `Only ${result.totalAvailable} room(s) remaining`
            };
          }

          return {
            available: true,
            availableRooms: result.totalAvailable
          };
        } catch (error) {
          return {
            available: false,
            availableRooms: 0,
            message: formatError(error, 'Failed to check availability')
          };
        }
      },
      
      addRatePlan: (plan) => {
        set((state) => ({
          ratePlans: [...state.ratePlans, { ...plan, id: generateId() }],
        }));
      },
      
      updateRatePlan: (id, updates) => {
        set((state) => ({
          ratePlans: state.ratePlans.map((rp) =>
            rp.id === id ? { ...rp, ...updates } : rp
          ),
        }));
      },
      
      deleteRatePlan: (id) => {
        set((state) => ({
          ratePlans: state.ratePlans.filter((rp) => rp.id !== id),
        }));
      }
      };
    },
    {
      name: 'reservation-storage',
    }
  )
);
