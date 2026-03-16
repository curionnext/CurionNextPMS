import api from '../lib/apiClient';

export type OTAProvider = 'BOOKING_COM' | 'EXPEDIA' | 'AIRBNB' | 'MAKEMYTRIP' | 'GOIBIBO';
export type OTAConnectionStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';
export type OTASyncType = 'RATES' | 'INVENTORY' | 'RESERVATIONS';
export type OTASyncStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';

export type OTAChannelCredentials = {
  apiKey?: string;
  hotelId?: string;
  propertyId?: string;
  username?: string;
  password?: string;
  endpoint?: string;
};

export type OTARoomMapping = {
  roomTypeId: string;
  otaRoomTypeId: string;
  otaRoomTypeName: string;
};

export type OTASyncSettings = {
  autoSyncRates: boolean;
  autoSyncInventory: boolean;
  autoImportReservations: boolean;
  syncIntervalMinutes: number;
};

export type OTAChannelResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  provider: OTAProvider;
  status: OTAConnectionStatus;
  credentials: OTAChannelCredentials;
  mappings: OTARoomMapping[];
  syncSettings: OTASyncSettings;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateOTAChannelRequest = {
  provider: OTAProvider;
  credentials: OTAChannelCredentials;
  mappings: OTARoomMapping[];
  syncSettings: OTASyncSettings;
};

export type UpdateOTAChannelRequest = Partial<Omit<OTAChannelResponse, 'id' | 'hotelId' | 'hotelCode' | 'createdAt'>>;

export type OTASyncLogResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  channelId: string;
  provider: OTAProvider;
  syncType: OTASyncType;
  status: OTASyncStatus;
  itemsProcessed: number;
  itemsFailed: number;
  details?: Record<string, unknown>;
  error?: string;
  syncedAt: string;
  createdAt: string;
};

export type OTAReservationImportResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  provider: OTAProvider;
  otaConfirmationCode: string;
  otaReservationData: Record<string, unknown>;
  importedReservationId?: string;
  status: 'PENDING' | 'IMPORTED' | 'FAILED' | 'DUPLICATE';
  errorMessage?: string;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TestConnectionResponse = {
  success: boolean;
  message: string;
};

export type SyncRequest = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

export const otaApi = {
  /**
   * Get all OTA channels
   */
  async fetchChannels(): Promise<OTAChannelResponse[]> {
    const response = await api.get<{ data: OTAChannelResponse[] }>('/ota/channels');
    return response.data.data;
  },

  /**
   * Get channel by ID
   */
  async fetchChannelById(id: string): Promise<OTAChannelResponse> {
    const response = await api.get<{ data: OTAChannelResponse }>(`/ota/channels/${id}`);
    return response.data.data;
  },

  /**
   * Create new OTA channel
   */
  async createChannel(payload: CreateOTAChannelRequest): Promise<OTAChannelResponse> {
    const response = await api.post<{ data: OTAChannelResponse }>('/ota/channels', payload);
    return response.data.data;
  },

  /**
   * Update OTA channel
   */
  async updateChannel(id: string, payload: UpdateOTAChannelRequest): Promise<OTAChannelResponse> {
    const response = await api.put<{ data: OTAChannelResponse }>(`/ota/channels/${id}`, payload);
    return response.data.data;
  },

  /**
   * Delete OTA channel
   */
  async deleteChannel(id: string): Promise<void> {
    await api.delete(`/ota/channels/${id}`);
  },

  /**
   * Test OTA connection
   */
  async testConnection(id: string): Promise<TestConnectionResponse> {
    const response = await api.post<{ data: TestConnectionResponse }>(`/ota/channels/${id}/test`);
    return response.data.data;
  },

  /**
   * Sync rates to OTA
   */
  async syncRates(id: string, dateRange: SyncRequest): Promise<OTASyncLogResponse> {
    const response = await api.post<{ data: OTASyncLogResponse }>(`/ota/channels/${id}/sync-rates`, dateRange);
    return response.data.data;
  },

  /**
   * Sync inventory to OTA
   */
  async syncInventory(id: string, dateRange: SyncRequest): Promise<OTASyncLogResponse> {
    const response = await api.post<{ data: OTASyncLogResponse }>(`/ota/channels/${id}/sync-inventory`, dateRange);
    return response.data.data;
  },

  /**
   * Import reservation from OTA
   */
  async importReservation(id: string, otaReservationData: Record<string, unknown>): Promise<any> {
    const response = await api.post(`/ota/channels/${id}/import-reservation`, { otaReservationData });
    return response.data.data;
  },

  /**
   * Get sync logs
   */
  async fetchSyncLogs(filters?: {
    channelId?: string;
    syncType?: OTASyncType;
    limit?: number;
  }): Promise<OTASyncLogResponse[]> {
    const response = await api.get<{ data: OTASyncLogResponse[] }>('/ota/sync-logs', {
      params: filters
    });
    return response.data.data;
  },

  /**
   * Get imported reservations
   */
  async fetchImportedReservations(provider?: OTAProvider): Promise<OTAReservationImportResponse[]> {
    const response = await api.get<{ data: OTAReservationImportResponse[] }>('/ota/imported-reservations', {
      params: { provider }
    });
    return response.data.data;
  },
};
