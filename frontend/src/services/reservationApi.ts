
import api from '../lib/apiClient';

export type ReservationStatusCode = 'DRAFT' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
export type ReservationSourceCode = 'DIRECT' | 'OTA' | 'CORPORATE' | 'WALK_IN';
export type RatePlanCode = 'BAR' | 'CORPORATE' | 'PACKAGE';

export type ReservationChargeResponse = {
  description: string;
  amount: number;
};

export type ReservationBillingResponse = {
  currency: string;
  totalAmount: number;
  balanceDue: number;
  charges: ReservationChargeResponse[];
};

export type ReservationResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  guestId: string;
  roomType: string;
  roomId?: string;
  status: ReservationStatusCode;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  nightlyRate: number;
  ratePlan: RatePlanCode;
  source: ReservationSourceCode;
  otaReference?: string;
  isWalkIn: boolean;
  notes?: string;
  billing: ReservationBillingResponse;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateReservationRequest = {
  hotelId: string;
  hotelCode: string;
  guestId: string;
  roomType: string;
  roomId?: string;
  status?: ReservationStatusCode;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  nightlyRate: number;
  ratePlan: RatePlanCode;
  source: ReservationSourceCode;
  otaReference?: string;
  isWalkIn?: boolean;
  notes?: string;
  currency?: string;
};

export type UpdateReservationRequest = Partial<{
  roomId?: string;
  roomType: string;
  status: ReservationStatusCode;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  nightlyRate: number;
  ratePlan: RatePlanCode;
  source: ReservationSourceCode;
  otaReference?: string;
  isWalkIn: boolean;
  notes?: string;
  currency: string;
}>;

export type AvailabilityQuery = {
  arrivalDate: string;
  departureDate: string;
  roomType?: string;
};

export type AvailabilityResponse = {
  arrivalDate: string;
  departureDate: string;
  roomType?: string;
  availableRooms: Array<{
    id: string;
    hotelId: string;
    hotelCode: string;
    number: string;
    name?: string;
    type: string;
    roomTypeId: string;
    status: string;
    rate: number;
    floor?: number;
    floorId?: string;
    buildingId?: string;
    amenities?: string[];
    maxOccupancy?: number;
    hasExtraBed?: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  totalAvailable: number;
};

export const reservationApi = {
  async fetchReservations(): Promise<ReservationResponse[]> {
    const response = await api.get<{ reservations: ReservationResponse[] }>('/reservations');
    return response.data.reservations;
  },

  async createReservation(payload: CreateReservationRequest): Promise<ReservationResponse> {
    const response = await api.post<{ reservation: ReservationResponse }>('/reservations', payload);
    return response.data.reservation;
  },

  async updateReservation(id: string, payload: UpdateReservationRequest): Promise<ReservationResponse> {
    const response = await api.put<{ reservation: ReservationResponse }>(`/reservations/${id}`, payload);
    return response.data.reservation;
  },

  async deleteReservation(id: string): Promise<void> {
    await api.delete(`/reservations/${id}`);
  },

  async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    const response = await api.get<AvailabilityResponse>('/reservations/availability', {
      params: query,
    });
    return response.data;
  },
};
