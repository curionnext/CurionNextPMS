import { create } from 'zustand';
import type { Guest } from '../types';
import { guestApi, type GuestDraft, type GuestUpdatePayload } from '../services/guestApi';

const formatError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
};

type StoreContext = {
  hotelId: string;
  hotelCode: string;
};

interface GuestState {
  context: StoreContext | null;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  guests: Guest[];
  setContext: (context: StoreContext) => void;
  hydrateFromBackend: () => Promise<void>;
  reset: () => void;

  addGuest: (guest: GuestDraft) => Promise<Guest>;
  updateGuest: (id: string, updates: GuestUpdatePayload) => Promise<Guest>;
  deleteGuest: (id: string) => Promise<void>;
  searchGuests: (query: string) => Guest[];
}

export const useGuestStore = create<GuestState>()((set, get) => ({
  context: null,
  isHydrated: false,
  isLoading: false,
  error: null,
  guests: [],

  setContext: (context) => set({ context }),

  hydrateFromBackend: async () => {
    const { context } = get();

    if (!context) {
      set({ guests: [], isHydrated: true, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      console.log('[GuestStore] Fetching guests from backend...');
      const guests = await guestApi.fetchGuests();
      console.log('[GuestStore] Received guests:', guests.length);
      set({ guests, isHydrated: true, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        isHydrated: true,
        error: formatError(error, 'Failed to load guests.')
      });
      throw error;
    }
  },

  reset: () =>
    set({
      context: null,
      isHydrated: false,
      isLoading: false,
      error: null,
      guests: []
    }),

  addGuest: async (guest) => {
    const { context } = get();

    if (!context) {
      throw new Error('Guest context not set.');
    }

    set({ isLoading: true, error: null });

    try {
      const created = await guestApi.createGuest(context, guest);
      set((state) => ({
        guests: [...state.guests, created],
        isLoading: false
      }));
      return created;
    } catch (error) {
      const message = formatError(error, 'Failed to create guest.');
      set({ isLoading: false, error: message });
      throw error instanceof Error ? error : new Error(message);
    }
  },

  updateGuest: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const updated = await guestApi.updateGuest(id, updates);
      set((state) => ({
        guests: state.guests.map((guest) => (guest.id === id ? updated : guest)),
        isLoading: false
      }));
      return updated;
    } catch (error) {
      const message = formatError(error, 'Failed to update guest.');
      set({ isLoading: false, error: message });
      throw error instanceof Error ? error : new Error(message);
    }
  },

  deleteGuest: async () => {
    throw new Error('Guest deletion is not supported.');
  },

  searchGuests: (query) => {
    const { guests } = get();
    const lowerQuery = query.toLowerCase();

    return guests.filter(
      (guest) =>
        guest.firstName.toLowerCase().includes(lowerQuery) ||
        guest.lastName.toLowerCase().includes(lowerQuery) ||
        guest.email.toLowerCase().includes(lowerQuery) ||
        guest.phone.includes(query)
    );
  }
}));
