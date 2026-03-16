import { apiClient } from '../lib/apiClient';
import type {
  NightAudit,
  OTAChannel,
  OTASyncLog,
  OTAReservationImport,
  OTAProvider,
  WhatsAppConfig,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppTemplateType,
  PropertyGroup,
  PropertyFeatureFlags,
  HotelProfile
} from '../types';

// ========================================
// Night Audit API
// ========================================

export const nightAuditApi = {
  async getAudits(): Promise<NightAudit[]> {
    const response = await apiClient.get('/night-audit');
    return response.data.data;
  },

  async getLatestAudit(): Promise<NightAudit | null> {
    const response = await apiClient.get('/night-audit/latest');
    return response.data.data;
  },

  async checkRequired(): Promise<boolean> {
    const response = await apiClient.get('/night-audit/check-required');
    return response.data.data.isRequired;
  },

  async getAuditById(id: string): Promise<NightAudit> {
    const response = await apiClient.get(`/night-audit/${id}`);
    return response.data.data;
  },

  async startAudit(businessDate?: string): Promise<NightAudit> {
    const response = await apiClient.post('/night-audit/start', { businessDate });
    return response.data.data;
  },

  async retryAudit(id: string): Promise<NightAudit> {
    const response = await apiClient.post(`/night-audit/${id}/retry`);
    return response.data.data;
  }
};

// ========================================
// OTA API
// ========================================

export const otaApi = {
  async getChannels(): Promise<OTAChannel[]> {
    const response = await apiClient.get('/ota/channels');
    return response.data.data;
  },

  async getChannelById(id: string): Promise<OTAChannel> {
    const response = await apiClient.get(`/ota/channels/${id}`);
    return response.data.data;
  },

  async createChannel(channel: {
    provider: OTAProvider;
    credentials: OTAChannel['credentials'];
    mappings: OTAChannel['mappings'];
    syncSettings: OTAChannel['syncSettings'];
  }): Promise<OTAChannel> {
    const response = await apiClient.post('/ota/channels', channel);
    return response.data.data;
  },

  async updateChannel(id: string, updates: Partial<OTAChannel>): Promise<OTAChannel> {
    const response = await apiClient.put(`/ota/channels/${id}`, updates);
    return response.data.data;
  },

  async deleteChannel(id: string): Promise<void> {
    await apiClient.delete(`/ota/channels/${id}`);
  },

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/ota/channels/${id}/test`);
    return response.data.data;
  },

  async syncRates(id: string, dateRange: { from: string; to: string }): Promise<OTASyncLog> {
    const response = await apiClient.post(`/ota/channels/${id}/sync-rates`, dateRange);
    return response.data.data;
  },

  async syncInventory(id: string, dateRange: { from: string; to: string }): Promise<OTASyncLog> {
    const response = await apiClient.post(`/ota/channels/${id}/sync-inventory`, dateRange);
    return response.data.data;
  },

  async importReservation(id: string, otaReservationData: Record<string, unknown>): Promise<any> {
    const response = await apiClient.post(`/ota/channels/${id}/import-reservation`, {
      otaReservationData
    });
    return response.data.data;
  },

  async getSyncLogs(filters?: {
    channelId?: string;
    syncType?: 'RATES' | 'INVENTORY' | 'RESERVATIONS';
    limit?: number;
  }): Promise<OTASyncLog[]> {
    const response = await apiClient.get('/ota/sync-logs', { params: filters });
    return response.data.data;
  },

  async getImportedReservations(provider?: OTAProvider): Promise<OTAReservationImport[]> {
    const response = await apiClient.get('/ota/imported-reservations', {
      params: { provider }
    });
    return response.data.data;
  }
};

// ========================================
// WhatsApp API
// ========================================

export const whatsappApi = {
  async getConfig(): Promise<WhatsAppConfig | null> {
    const response = await apiClient.get('/whatsapp/config');
    return response.data.data;
  },

  async updateConfig(config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const response = await apiClient.put('/whatsapp/config', config);
    return response.data.data;
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/whatsapp/test-connection');
    return response.data.data;
  },

  async getTemplates(): Promise<WhatsAppTemplate[]> {
    const response = await apiClient.get('/whatsapp/templates');
    return response.data.data;
  },

  async getTemplateById(id: string): Promise<WhatsAppTemplate> {
    const response = await apiClient.get(`/whatsapp/templates/${id}`);
    return response.data.data;
  },

  async createTemplate(template: Omit<WhatsAppTemplate, 'id' | 'hotelId' | 'hotelCode' | 'createdAt' | 'updatedAt'>): Promise<WhatsAppTemplate> {
    const response = await apiClient.post('/whatsapp/templates', template);
    return response.data.data;
  },

  async updateTemplate(id: string, updates: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate> {
    const response = await apiClient.put(`/whatsapp/templates/${id}`, updates);
    return response.data.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/whatsapp/templates/${id}`);
  },

  async sendMessage(data: {
    templateId: string;
    recipientPhone: string;
    recipientName?: string;
    parameters: Record<string, string>;
    relatedEntityType?: 'RESERVATION' | 'GUEST' | 'BILL';
    relatedEntityId?: string;
  }): Promise<WhatsAppMessage> {
    const response = await apiClient.post('/whatsapp/send', data);
    return response.data.data;
  },

  async getMessages(filters?: {
    status?: WhatsAppMessage['status'];
    templateType?: WhatsAppTemplateType;
    relatedEntityId?: string;
    limit?: number;
  }): Promise<WhatsAppMessage[]> {
    const response = await apiClient.get('/whatsapp/messages', { params: filters });
    return response.data.data;
  },

  async sendBookingConfirmation(reservationId: string): Promise<WhatsAppMessage | null> {
    const response = await apiClient.post(`/whatsapp/send-booking-confirmation/${reservationId}`);
    return response.data.data;
  },

  async sendCheckinReminder(reservationId: string): Promise<WhatsAppMessage | null> {
    const response = await apiClient.post(`/whatsapp/send-checkin-reminder/${reservationId}`);
    return response.data.data;
  },

  async processAutomatedMessages(): Promise<{ sent: number; skipped: number }> {
    const response = await apiClient.post('/whatsapp/process-automated');
    return response.data.data;
  }
};

// ========================================
// Multi-Property API
// ========================================

export const multiPropertyApi = {
  async getPropertyGroups(): Promise<PropertyGroup[]> {
    const response = await apiClient.get('/multi-property/groups');
    return response.data.data;
  },

  async getPropertyGroupById(id: string): Promise<PropertyGroup> {
    const response = await apiClient.get(`/multi-property/groups/${id}`);
    return response.data.data;
  },

  async createPropertyGroup(group: {
    name: string;
    description?: string;
    properties: string[];
  }): Promise<PropertyGroup> {
    const response = await apiClient.post('/multi-property/groups', group);
    return response.data.data;
  },

  async updatePropertyGroup(id: string, updates: Partial<PropertyGroup>): Promise<PropertyGroup> {
    const response = await apiClient.put(`/multi-property/groups/${id}`, updates);
    return response.data.data;
  },

  async deletePropertyGroup(id: string): Promise<void> {
    await apiClient.delete(`/multi-property/groups/${id}`);
  },

  async getAllProperties(): Promise<HotelProfile[]> {
    const response = await apiClient.get('/multi-property/properties');
    return response.data.data;
  },

  async getPropertyById(hotelId: string): Promise<HotelProfile> {
    const response = await apiClient.get(`/multi-property/properties/${hotelId}`);
    return response.data.data;
  },

  async getPropertiesInGroup(groupId: string): Promise<HotelProfile[]> {
    const response = await apiClient.get(`/multi-property/groups/${groupId}/properties`);
    return response.data.data;
  },

  async getPropertyFeatures(hotelId: string): Promise<PropertyFeatureFlags> {
    const response = await apiClient.get(`/multi-property/properties/${hotelId}/features`);
    return response.data.data;
  },

  async updatePropertyFeatures(hotelId: string, features: Partial<PropertyFeatureFlags>): Promise<PropertyFeatureFlags> {
    const response = await apiClient.put(`/multi-property/properties/${hotelId}/features`, features);
    return response.data.data;
  },

  async getMultiPropertyStats(): Promise<{
    totalProperties: number;
    totalGroups: number;
    featureAdoption: Record<keyof PropertyFeatureFlags, number>;
  }> {
    const response = await apiClient.get('/multi-property/stats');
    return response.data.data;
  },

  async switchProperty(hotelId: string): Promise<HotelProfile> {
    const response = await apiClient.post(`/multi-property/switch/${hotelId}`);
    return response.data.data;
  }
};
