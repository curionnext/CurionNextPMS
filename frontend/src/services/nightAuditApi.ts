import api from '../lib/apiClient';

export type NightAuditStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type NightAuditStepType =
  | 'VALIDATE_SHIFT_CLOSURE'
  | 'POST_ROOM_REVENUE'
  | 'PROCESS_NO_SHOWS'
  | 'UPDATE_ROOM_STATUS'
  | 'GENERATE_REPORTS'
  | 'ROLLOVER_DATE';

export type NightAuditStep = {
  type: NightAuditStepType;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  message?: string;
  data?: Record<string, unknown>;
};

export type NightAuditSummary = {
  totalRoomsOccupied: number;
  totalRevenuePosted: number;
  noShowsProcessed: number;
  roomStatusUpdates: number;
  reportsGenerated: string[];
};

export type NightAuditResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  businessDate: string;
  status: NightAuditStatus;
  startedAt?: string;
  completedAt?: string;
  startedBy?: string;
  steps: NightAuditStep[];
  summary?: NightAuditSummary;
  errors?: string[];
  createdAt: string;
  updatedAt: string;
};

export type StartAuditRequest = {
  businessDate?: string;
};

export type CheckRequiredResponse = {
  isRequired: boolean;
};

export const nightAuditApi = {
  /**
   * Get all night audits
   */
  async fetchAudits(): Promise<NightAuditResponse[]> {
    const response = await api.get<{ data: NightAuditResponse[] }>('/night-audit');
    return response.data.data;
  },

  /**
   * Get latest audit
   */
  async fetchLatestAudit(): Promise<NightAuditResponse | null> {
    const response = await api.get<{ data: NightAuditResponse | null }>('/night-audit/latest');
    return response.data.data;
  },

  /**
   * Get audit by ID
   */
  async fetchAuditById(id: string): Promise<NightAuditResponse> {
    const response = await api.get<{ data: NightAuditResponse }>(`/night-audit/${id}`);
    return response.data.data;
  },

  /**
   * Check if audit is required
   */
  async checkAuditRequired(): Promise<CheckRequiredResponse> {
    const response = await api.get<{ data: CheckRequiredResponse }>('/night-audit/check-required');
    return response.data.data;
  },

  /**
   * Start a new night audit
   */
  async startAudit(request?: StartAuditRequest): Promise<NightAuditResponse> {
    const response = await api.post<{ data: NightAuditResponse }>('/night-audit/start', request || {});
    return response.data.data;
  },

  /**
   * Retry a failed audit
   */
  async retryAudit(id: string): Promise<NightAuditResponse> {
    const response = await api.post<{ data: NightAuditResponse }>(`/night-audit/${id}/retry`);
    return response.data.data;
  },
};
