import api from '../lib/apiClient';
import type {
  Floor,
  HotelProfile,
  RoomInventory,
  RoomStatus,
  RoomType,
  TaxConfiguration
} from '../types';

const ROOM_STATUS_MAP: Record<string, RoomStatus> = {
  AVAILABLE: 'vacant',
  OCCUPIED: 'occupied',
  DIRTY: 'dirty',
  OUT_OF_ORDER: 'oos'
};

const ROOM_STATUS_REVERSE_MAP: Record<RoomStatus, string> = {
  vacant: 'AVAILABLE',
  occupied: 'OCCUPIED',
  dirty: 'DIRTY',
  oos: 'OUT_OF_ORDER',
  maintenance: 'OUT_OF_ORDER'
};

type PropertyProfileResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  gstin?: string;
};

type RoomTypeResponse = {
  id: string;
  hotelCode: string;
  name: string;
  shortCode: string;
  description?: string;
  baseRate: number;
  occupancy: number;
  extraBedRate?: number;
  amenities?: string[];
  isActive?: boolean;
};

type FloorResponse = {
  id: string;
  number: number;
  name?: string;
  sortOrder?: number;
  buildingId?: string;
};

type RoomResponse = {
  id: string;
  number: string;
  name?: string;
  type: string;
  roomTypeId?: string;
  status: string;
  rate: number;
  floor?: number;
  floorId?: string;
  buildingId?: string;
  amenities?: string[];
  maxOccupancy?: number;
  hasExtraBed?: boolean;
  isActive?: boolean;
};

type TaxResponse = {
  id: string;
  gstEnabled?: boolean;
  cgst?: number;
  sgst?: number;
  igst?: number;
  serviceChargeEnabled?: boolean;
  serviceChargePercentage?: number;
  luxuryTaxEnabled?: boolean;
  luxuryTaxPercentage?: number;
};

const mapProfile = (profile: PropertyProfileResponse | null | undefined): HotelProfile | null => {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    name: profile.name,
    address: profile.addressLine1 ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    pincode: profile.postalCode ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    gstin: profile.gstin ?? '',
    hotelCode: profile.hotelCode,
    logo: undefined
  };
};

const mapRoomType = (roomType: RoomTypeResponse): RoomType => ({
  id: roomType.id,
  name: roomType.name,
  shortCode: roomType.shortCode,
  description: roomType.description ?? '',
  baseRate: roomType.baseRate,
  capacity: roomType.occupancy,
  extraBedRate: roomType.extraBedRate ?? 0,
  amenities: Array.isArray(roomType.amenities) ? roomType.amenities : [],
  isActive: roomType.isActive ?? true
});

const mapFloor = (floor: FloorResponse): Floor => ({
  id: floor.id,
  name: floor.name ?? `Floor ${floor.number}`,
  floorNumber: floor.number,
  sortOrder: typeof floor.sortOrder === 'number' ? floor.sortOrder : 0,
  buildingId: floor.buildingId
});

const mapRoom = (room: RoomResponse): RoomInventory => ({
  id: room.id,
  roomNumber: room.number,
  roomTypeId: room.roomTypeId ?? room.type,
  floorId: room.floorId ?? '',
  buildingId: room.buildingId,
  status: ROOM_STATUS_MAP[room.status] ?? 'vacant',
  maxOccupancy: room.maxOccupancy ?? 2,
  hasExtraBed: room.hasExtraBed ?? false,
  isActive: room.isActive ?? true,
  lastCleaned: undefined
});

const mapTaxConfig = (tax: TaxResponse | null | undefined): TaxConfiguration | null => {
  if (!tax) {
    return null;
  }

  return {
    id: tax.id,
    gstEnabled: tax.gstEnabled ?? true,
    cgst: tax.cgst ?? 0,
    sgst: tax.sgst ?? 0,
    igst: tax.igst ?? 0,
    serviceChargeEnabled: tax.serviceChargeEnabled ?? false,
    serviceChargePercentage: tax.serviceChargePercentage ?? 0,
    luxuryTaxEnabled: tax.luxuryTaxEnabled ?? false,
    luxuryTaxPercentage: tax.luxuryTaxPercentage ?? 0
  };
};

type PropertyProfilePayload = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  hotelCode: string;
  hotelId?: string;
};

type SaveRoomTypePayload = Omit<RoomType, 'id'>;

type SaveFloorPayload = Omit<Floor, 'id'>;

type SaveRoomPayload = {
  roomNumber: string;
  roomTypeId: string;
  status: RoomStatus;
  rate: number;
  floorId?: string;
  floorNumber?: number;
  buildingId?: string;
  maxOccupancy: number;
  hasExtraBed: boolean;
  isActive: boolean;
};

type UpdateRoomPayload = Partial<Omit<SaveRoomPayload, 'roomNumber'>> & {
  roomNumber?: string;
};

type SaveTaxPayload = TaxConfiguration;

export const propertyApi = {
  async fetchProfile(): Promise<HotelProfile | null> {
    const response = await api.get<{ profile: PropertyProfileResponse | null }>('/property/profile');
    return mapProfile(response.data.profile);
  },

  async saveProfile(payload: PropertyProfilePayload): Promise<HotelProfile | null> {
    const response = await api.put<{ profile: PropertyProfileResponse }>('/property/profile', {
      hotelId: payload.hotelId,
      name: payload.name,
      addressLine1: payload.address,
      city: payload.city,
      state: payload.state,
      postalCode: payload.pincode,
      phone: payload.phone,
      email: payload.email,
      gstin: payload.gstin,
      hotelCode: payload.hotelCode
    });
    return mapProfile(response.data.profile);
  },

  async fetchRoomTypes(): Promise<RoomType[]> {
    const response = await api.get<{ roomTypes: RoomTypeResponse[] }>('/property/room-types');
    return response.data.roomTypes.map(mapRoomType);
  },

  async createRoomType(payload: SaveRoomTypePayload): Promise<RoomType> {
    const response = await api.post<{ roomType: RoomTypeResponse }>('/property/room-types', {
      name: payload.name,
      shortCode: payload.shortCode,
      description: payload.description,
      baseRate: payload.baseRate,
      occupancy: payload.capacity,
      extraBedRate: payload.extraBedRate,
      amenities: payload.amenities,
      isActive: payload.isActive
    });
    return mapRoomType(response.data.roomType);
  },

  async updateRoomType(id: string, payload: Partial<SaveRoomTypePayload>): Promise<RoomType> {
    const response = await api.put<{ roomType: RoomTypeResponse }>(`/property/room-types/${id}`, {
      name: payload.name,
      shortCode: payload.shortCode,
      description: payload.description,
      baseRate: payload.baseRate,
      occupancy: payload.capacity,
      extraBedRate: payload.extraBedRate,
      amenities: payload.amenities,
      isActive: payload.isActive
    });
    return mapRoomType(response.data.roomType);
  },

  async deleteRoomType(id: string): Promise<void> {
    await api.delete(`/property/room-types/${id}`);
  },

  async fetchFloors(): Promise<Floor[]> {
    const response = await api.get<{ floors: FloorResponse[] }>('/property/floors');
    return response.data.floors.map(mapFloor);
  },

  async createFloor(payload: SaveFloorPayload): Promise<Floor> {
    const response = await api.post<{ floor: FloorResponse }>('/property/floors', {
      number: payload.floorNumber,
      name: payload.name,
      sortOrder: payload.sortOrder,
      buildingId: payload.buildingId
    });
    return mapFloor(response.data.floor);
  },

  async updateFloor(id: string, payload: Partial<SaveFloorPayload>): Promise<Floor> {
    const response = await api.put<{ floor: FloorResponse }>(`/property/floors/${id}`, {
      number: payload.floorNumber,
      name: payload.name,
      sortOrder: payload.sortOrder,
      buildingId: payload.buildingId
    });
    return mapFloor(response.data.floor);
  },

  async deleteFloor(id: string): Promise<void> {
    await api.delete(`/property/floors/${id}`);
  },

  async fetchRooms(): Promise<RoomInventory[]> {
    const response = await api.get<{ rooms: RoomResponse[] }>('/property/rooms');
    return response.data.rooms.map(mapRoom);
  },

  async createRoom(payload: SaveRoomPayload): Promise<RoomInventory> {
    const response = await api.post<{ room: RoomResponse }>('/property/rooms', {
      number: payload.roomNumber,
      roomTypeId: payload.roomTypeId,
      status: ROOM_STATUS_REVERSE_MAP[payload.status],
      rate: payload.rate,
      floor: payload.floorNumber,
      floorId: payload.floorId,
      buildingId: payload.buildingId,
      amenities: [],
      maxOccupancy: payload.maxOccupancy,
      hasExtraBed: payload.hasExtraBed,
      isActive: payload.isActive
    });
    return mapRoom(response.data.room);
  },

  async updateRoom(id: string, payload: UpdateRoomPayload): Promise<RoomInventory> {
    const response = await api.put<{ room: RoomResponse }>(`/property/rooms/${id}`, {
      number: payload.roomNumber,
      roomTypeId: payload.roomTypeId,
      status: payload.status ? ROOM_STATUS_REVERSE_MAP[payload.status] : undefined,
      rate: payload.rate,
      floor: payload.floorNumber,
      floorId: payload.floorId,
      buildingId: payload.buildingId,
      maxOccupancy: payload.maxOccupancy,
      hasExtraBed: payload.hasExtraBed,
      isActive: payload.isActive
    });
    return mapRoom(response.data.room);
  },

  async deleteRoom(id: string): Promise<void> {
    await api.delete(`/property/rooms/${id}`);
  },

  async fetchTaxConfig(): Promise<TaxConfiguration | null> {
    const response = await api.get<{ taxes: TaxResponse | null }>('/property/taxes');
    return mapTaxConfig(response.data.taxes);
  },

  async saveTaxConfig(payload: SaveTaxPayload): Promise<TaxConfiguration | null> {
    const response = await api.put<{ taxes: TaxResponse }>('/property/taxes', {
      gstEnabled: payload.gstEnabled,
      cgst: payload.cgst,
      sgst: payload.sgst,
      igst: payload.igst,
      serviceChargeEnabled: payload.serviceChargeEnabled,
      serviceChargePercentage: payload.serviceChargePercentage,
      luxuryTaxEnabled: payload.luxuryTaxEnabled,
      luxuryTaxPercentage: payload.luxuryTaxPercentage
    });
    return mapTaxConfig(response.data.taxes);
  }
};
