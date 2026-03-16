import { create } from 'zustand';
import { otaApi, type OTAChannelResponse, type OTASyncLogResponse, type OTAReservationImportResponse, type CreateOTAChannelRequest, type UpdateOTAChannelRequest, type SyncRequest } from '../services/otaApi';

type OTAStore = {
  channels: OTAChannelResponse[];
  currentChannel: OTAChannelResponse | null;
  syncLogs: OTASyncLogResponse[];
  importedReservations: OTAReservationImportResponse[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchChannels: () => Promise<void>;
  fetchChannelById: (id: string) => Promise<void>;
  createChannel: (payload: CreateOTAChannelRequest) => Promise<OTAChannelResponse>;
  updateChannel: (id: string, payload: UpdateOTAChannelRequest) => Promise<OTAChannelResponse>;
  deleteChannel: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<{ success: boolean; message: string }>;
  syncRates: (id: string, dateRange: SyncRequest) => Promise<OTASyncLogResponse>;
  syncInventory: (id: string, dateRange: SyncRequest) => Promise<OTASyncLogResponse>;
  fetchSyncLogs: (channelId?: string) => Promise<void>;
  fetchImportedReservations: () => Promise<void>;
  resetError: () => void;
};

export const useOTAStore = create<OTAStore>((set) => ({
  channels: [],
  currentChannel: null,
  syncLogs: [],
  importedReservations: [],
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    set({ isLoading: true, error: null });
    try {
      const channels = await otaApi.fetchChannels();
      // Ensure channels is always an array
      const safeChannels = Array.isArray(channels) ? channels : [];
      set({ channels: safeChannels, isLoading: false });
    } catch (error) {
      console.error('[OTAStore] Failed to fetch channels:', error);
      set({
        channels: [], // Reset to empty array on error
        error: error instanceof Error ? error.message : 'Failed to fetch channels',
        isLoading: false
      });
    }
  },

  fetchChannelById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const channel = await otaApi.fetchChannelById(id);
      set({ currentChannel: channel, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch channel',
        isLoading: false
      });
    }
  },

  createChannel: async (payload: CreateOTAChannelRequest) => {
    set({ isLoading: true, error: null });
    try {
      const channel = await otaApi.createChannel(payload);
      set((state) => ({
        channels: [...state.channels, channel],
        isLoading: false
      }));
      return channel;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create channel';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  updateChannel: async (id: string, payload: UpdateOTAChannelRequest) => {
    set({ isLoading: true, error: null });
    try {
      const channel = await otaApi.updateChannel(id, payload);
      set((state) => ({
        channels: state.channels.map((c) => (c.id === id ? channel : c)),
        currentChannel: state.currentChannel?.id === id ? channel : state.currentChannel,
        isLoading: false
      }));
      return channel;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update channel';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  deleteChannel: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await otaApi.deleteChannel(id);
      set((state) => ({
        channels: state.channels.filter((c) => c.id !== id),
        currentChannel: state.currentChannel?.id === id ? null : state.currentChannel,
        isLoading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete channel',
        isLoading: false
      });
    }
  },

  testConnection: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await otaApi.testConnection(id);
      set({ isLoading: false });
      
      // Refresh channels to get updated status
      const channels = await otaApi.fetchChannels();
      set({ channels });
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection test failed';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  syncRates: async (id: string, dateRange: SyncRequest) => {
    set({ isLoading: true, error: null });
    try {
      const syncLog = await otaApi.syncRates(id, dateRange);
      set((state) => ({
        syncLogs: [syncLog, ...state.syncLogs],
        isLoading: false
      }));
      return syncLog;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Rate sync failed';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  syncInventory: async (id: string, dateRange: SyncRequest) => {
    set({ isLoading: true, error: null });
    try {
      const syncLog = await otaApi.syncInventory(id, dateRange);
      set((state) => ({
        syncLogs: [syncLog, ...state.syncLogs],
        isLoading: false
      }));
      return syncLog;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Inventory sync failed';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  fetchSyncLogs: async (channelId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const syncLogs = await otaApi.fetchSyncLogs({ channelId, limit: 50 });
      set({ syncLogs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sync logs',
        isLoading: false
      });
    }
  },

  fetchImportedReservations: async () => {
    set({ isLoading: true, error: null });
    try {
      const importedReservations = await otaApi.fetchImportedReservations();
      set({ importedReservations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch imported reservations',
        isLoading: false
      });
    }
  },

  resetError: () => set({ error: null }),
}));
