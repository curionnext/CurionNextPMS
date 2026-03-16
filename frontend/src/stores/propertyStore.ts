import { create } from 'zustand';
import { propertyApi } from '../services/propertyApi';
import type {
  HotelProfile,
  RoomType,
  RoomInventory,
  Floor,
  Building,
  TaxConfiguration,
  RoomStatus
} from '../types';

type StoreContext = {
  hotelId: string;
  hotelCode: string;
};

const generateId = () => Math.random().toString(36).slice(2, 11);

const formatError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface PropertyState {
  context: StoreContext | null;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  hotelProfile: HotelProfile | null;
  roomTypes: RoomType[];
  rooms: RoomInventory[];
  floors: Floor[];
  buildings: Building[];
  taxConfig: TaxConfiguration | null;
  setContext: (context: StoreContext) => void;
  hydrateFromBackend: () => Promise<HotelProfile | null>;
  reset: () => void;
  
  // Hotel Profile Actions
  updateHotelProfile: (profile: Partial<HotelProfile>) => Promise<HotelProfile | null>;
  uploadLogo: (logoUrl: string) => void;
  
  // Room Types Actions
  addRoomType: (roomType: Omit<RoomType, 'id'>) => Promise<RoomType>;
  updateRoomType: (id: string, updates: Partial<RoomType>) => Promise<RoomType>;
  deleteRoomType: (id: string) => Promise<void>;
  
  // Room Inventory Actions
  addRoom: (room: Omit<RoomInventory, 'id'>) => Promise<RoomInventory>;
  updateRoom: (id: string, updates: Partial<RoomInventory>) => Promise<RoomInventory>;
  deleteRoom: (id: string) => Promise<void>;
  bulkCreateRooms: (rooms: Omit<RoomInventory, 'id'>[]) => Promise<RoomInventory[]>;
  updateRoomStatus: (id: string, status: RoomStatus) => Promise<RoomInventory>;
  
  // Floors & Buildings Actions
  addFloor: (floor: Omit<Floor, 'id'>) => Promise<Floor>;
  updateFloor: (id: string, updates: Partial<Floor>) => Promise<Floor>;
  deleteFloor: (id: string) => Promise<void>;
  reorderFloors: (floors: Floor[]) => Promise<Floor[]>;
  addBuilding: (building: Omit<Building, 'id'>) => void;
  updateBuilding: (id: string, updates: Partial<Building>) => void;
  deleteBuilding: (id: string) => void;
  
  // Tax Configuration Actions
  updateTaxConfig: (config: Partial<TaxConfiguration>) => Promise<TaxConfiguration | null>;
}

const DEFAULT_TAX_CONFIG: TaxConfiguration = {
  id: '1',
  gstEnabled: true,
  cgst: 6,
  sgst: 6,
  igst: 12,
  serviceChargeEnabled: true,
  serviceChargePercentage: 10,
  luxuryTaxEnabled: false,
  luxuryTaxPercentage: 0
};

export const usePropertyStore = create<PropertyState>()((set, get) => ({
  context: null,
  isLoading: false,
  isHydrated: false,
  error: null,
  hotelProfile: null,
  roomTypes: [],
  rooms: [],
  floors: [],
  buildings: [],
  taxConfig: null,

  setContext: (context) => set({ context }),

  hydrateFromBackend: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('[PropertyStore] Fetching data from backend...');
      const [profile, roomTypes, floors, rooms, taxes] = await Promise.all([
        propertyApi.fetchProfile(),
        propertyApi.fetchRoomTypes(),
        propertyApi.fetchFloors(),
        propertyApi.fetchRooms(),
        propertyApi.fetchTaxConfig()
      ]);

      console.log('[PropertyStore] Received data:', { 
        profile: profile?.name, 
        roomTypes: roomTypes.length, 
        floors: floors.length, 
        rooms: rooms.length 
      });

      const sortedFloors = [...floors].sort((a, b) => a.sortOrder - b.sortOrder);

      set({
        hotelProfile: profile,
        roomTypes,
        floors: sortedFloors,
        rooms,
        taxConfig: taxes ?? { ...DEFAULT_TAX_CONFIG },
        isHydrated: true,
        isLoading: false,
        error: null
      });

      return profile;
    } catch (error) {
      const message = formatError(error, 'Failed to load property data.');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  reset: () =>
    set({
      context: null,
      isLoading: false,
      isHydrated: false,
      error: null,
      hotelProfile: null,
      roomTypes: [],
      rooms: [],
      floors: [],
      buildings: [],
      taxConfig: null
    }),

  // Hotel Profile Actions
  updateHotelProfile: async (profile) => {
    try {
      const state = get();
      const current = state.hotelProfile ?? {
        id: '',
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
        hotelCode: state.context?.hotelCode ?? 'HOTEL001'
      };

      const saved = await propertyApi.saveProfile({
        name: profile.name ?? current.name,
        address: profile.address ?? current.address,
        city: profile.city ?? current.city,
        state: profile.state ?? current.state,
        pincode: profile.pincode ?? current.pincode,
        phone: profile.phone ?? current.phone,
        email: profile.email ?? current.email,
        gstin: profile.gstin ?? current.gstin,
        hotelCode: state.context?.hotelCode ?? current.hotelCode,
        hotelId: state.context?.hotelId
      });

      set({ hotelProfile: saved, error: null });
      return saved;
    } catch (error) {
      const message = formatError(error, 'Failed to update hotel profile.');
      set({ error: message });
      throw error;
    }
  },

  uploadLogo: (logoUrl) =>
    set((state) => ({
      hotelProfile: state.hotelProfile ? { ...state.hotelProfile, logo: logoUrl } : null
    })),

  // Room Types Actions
  addRoomType: async (roomType) => {
    try {
      const created = await propertyApi.createRoomType(roomType);
      set((state) => ({ roomTypes: [...state.roomTypes, created], error: null }));
      return created;
    } catch (error) {
      const message = formatError(error, 'Failed to create room type.');
      set({ error: message });
      throw error;
    }
  },

  updateRoomType: async (id, updates) => {
    try {
      const updated = await propertyApi.updateRoomType(id, updates);
      set((state) => ({
        roomTypes: state.roomTypes.map((rt) => (rt.id === id ? updated : rt)),
        error: null
      }));
      return updated;
    } catch (error) {
      const message = formatError(error, 'Failed to update room type.');
      set({ error: message });
      throw error;
    }
  },

  deleteRoomType: async (id) => {
    try {
      await propertyApi.deleteRoomType(id);
      set((state) => ({ roomTypes: state.roomTypes.filter((rt) => rt.id !== id), error: null }));
    } catch (error) {
      const message = formatError(error, 'Failed to delete room type.');
      set({ error: message });
      throw error;
    }
  },

  // Room Inventory Actions
  addRoom: async (room) => {
    try {
      const state = get();
      const roomType = state.roomTypes.find((rt) => rt.id === room.roomTypeId);
      const floor = state.floors.find((f) => f.id === room.floorId);

      const created = await propertyApi.createRoom({
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId,
        status: room.status,
        rate: roomType?.baseRate ?? 0,
        floorId: room.floorId,
        floorNumber: floor?.floorNumber,
        buildingId: floor?.buildingId,
        maxOccupancy: room.maxOccupancy,
        hasExtraBed: room.hasExtraBed,
        isActive: room.isActive
      });

      set((prev) => ({ rooms: [...prev.rooms, created], error: null }));
      return created;
    } catch (error) {
      const message = formatError(error, 'Failed to create room.');
      set({ error: message });
      throw error;
    }
  },

  updateRoom: async (id, updates) => {
    try {
      const state = get();
      const current = state.rooms.find((room) => room.id === id);
      if (!current) {
        throw new Error('Room not found');
      }

      const merged = { ...current, ...updates };
      const floor = state.floors.find((f) => f.id === merged.floorId);
      const targetRoomType = state.roomTypes.find((rt) => rt.id === merged.roomTypeId);

      const updated = await propertyApi.updateRoom(id, {
        roomNumber: merged.roomNumber,
        roomTypeId: merged.roomTypeId,
        status: merged.status,
        rate: targetRoomType?.baseRate ?? 0,
        floorId: merged.floorId || undefined,
        floorNumber: floor?.floorNumber,
        buildingId: floor?.buildingId,
        maxOccupancy: merged.maxOccupancy,
        hasExtraBed: merged.hasExtraBed,
        isActive: merged.isActive
      });

      set((prev) => ({
        rooms: prev.rooms.map((room) => (room.id === id ? updated : room)),
        error: null
      }));

      return updated;
    } catch (error) {
      const message = formatError(error, 'Failed to update room.');
      set({ error: message });
      throw error;
    }
  },

  deleteRoom: async (id) => {
    try {
      await propertyApi.deleteRoom(id);
      set((state) => ({ rooms: state.rooms.filter((room) => room.id !== id), error: null }));
    } catch (error) {
      const message = formatError(error, 'Failed to delete room.');
      set({ error: message });
      throw error;
    }
  },

  bulkCreateRooms: async (rooms) => {
    try {
      const createdRooms = await Promise.all(rooms.map((room) => get().addRoom(room)));
      set({ error: null });
      return createdRooms;
    } catch (error) {
      const message = formatError(error, 'Failed to create rooms.');
      set({ error: message });
      throw error;
    }
  },

  updateRoomStatus: async (id, status) => {
    try {
      const updated = await get().updateRoom(id, { status });
      return updated;
    } catch (error) {
      const message = formatError(error, 'Failed to update room status.');
      set({ error: message });
      throw error;
    }
  },

  // Floors & Buildings Actions
  addFloor: async (floor) => {
    try {
      const created = await propertyApi.createFloor(floor);
      set((state) => ({ floors: [...state.floors, created], error: null }));
      return created;
    } catch (error) {
      const message = formatError(error, 'Failed to create floor.');
      set({ error: message });
      throw error;
    }
  },

  updateFloor: async (id, updates) => {
    try {
      const updated = await propertyApi.updateFloor(id, updates);
      set((state) => ({
        floors: state.floors.map((floor) => (floor.id === id ? updated : floor)),
        error: null
      }));
      return updated;
    } catch (error) {
      const message = formatError(error, 'Failed to update floor.');
      set({ error: message });
      throw error;
    }
  },

  deleteFloor: async (id) => {
    try {
      await propertyApi.deleteFloor(id);
      set((state) => ({ floors: state.floors.filter((floor) => floor.id !== id), error: null }));
    } catch (error) {
      const message = formatError(error, 'Failed to delete floor.');
      set({ error: message });
      throw error;
    }
  },

  reorderFloors: async (floors) => {
    try {
      const updatedFloors = await Promise.all(
        floors.map((floor, index) => propertyApi.updateFloor(floor.id, { sortOrder: index }))
      );
      const sortedFloors = [...updatedFloors].sort((a, b) => a.sortOrder - b.sortOrder);
      set({ floors: sortedFloors, error: null });
      return sortedFloors;
    } catch (error) {
      const message = formatError(error, 'Failed to reorder floors.');
      set({ error: message });
      throw error;
    }
  },

  addBuilding: (building) =>
    set((state) => ({
      buildings: [...state.buildings, { ...building, id: generateId() }]
    })),

  updateBuilding: (id, updates) =>
    set((state) => ({
      buildings: state.buildings.map((building) =>
        building.id === id ? { ...building, ...updates } : building
      )
    })),

  deleteBuilding: (id) =>
    set((state) => ({
      buildings: state.buildings.filter((building) => building.id !== id)
    })),

  // Tax Configuration Actions
  updateTaxConfig: async (config) => {
    try {
      const current = get().taxConfig ?? { ...DEFAULT_TAX_CONFIG };
      const payload = { ...current, ...config } as TaxConfiguration;
      const saved = await propertyApi.saveTaxConfig(payload);
      set({ taxConfig: saved, error: null });
      return saved;
    } catch (error) {
      const message = formatError(error, 'Failed to update tax configuration.');
      set({ error: message });
      throw error;
    }
  }
}));
