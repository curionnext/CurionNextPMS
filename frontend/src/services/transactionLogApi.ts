import { apiClient } from '../lib/apiClient';

export type TransactionEventType =
  | 'RESERVATION_CREATED'
  | 'RESERVATION_UPDATED'
  | 'RESERVATION_CANCELLED'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REFUNDED'
  | 'ROOM_STATUS_CHANGED'
  | 'GUEST_CREATED'
  | 'GUEST_UPDATED'
  | 'RATE_PLAN_CHANGED'
  | 'BILL_GENERATED'
  | 'INVOICE_PRINTED'
  | 'NIGHT_AUDIT_STARTED'
  | 'NIGHT_AUDIT_COMPLETED'
  | 'SHIFT_STARTED'
  | 'SHIFT_CLOSED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'SETTINGS_CHANGED'
  | 'OTA_SYNC'
  | 'WHATSAPP_SENT'
  | 'REPORT_GENERATED';

export interface TransactionLog {
  id: string;
  hotelId: string;
  hotelCode: string;
  eventType: TransactionEventType;
  entityType: 'RESERVATION' | 'GUEST' | 'ROOM' | 'PAYMENT' | 'BILL' | 'USER' | 'SYSTEM' | 'SHIFT' | 'PROPERTY' | 'OTHER';
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateTransactionLogRequest {
  eventType: TransactionEventType;
  entityType: TransactionLog['entityType'];
  entityId: string;
  description: string;
  metadata?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
}

export interface TransactionLogFilters {
  eventType?: TransactionEventType;
  entityType?: TransactionLog['entityType'];
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

class TransactionLogApi {
  async create(data: CreateTransactionLogRequest): Promise<TransactionLog> {
    const response = await apiClient.post('/transaction-logs', data);
    return response.data;
  }

  async getAll(filters?: TransactionLogFilters): Promise<TransactionLog[]> {
    const response = await apiClient.get('/transaction-logs', { params: filters });
    return response.data;
  }

  async getById(id: string): Promise<TransactionLog> {
    const response = await apiClient.get(`/transaction-logs/${id}`);
    return response.data;
  }

  async getByEntity(entityType: string, entityId: string): Promise<TransactionLog[]> {
    const response = await apiClient.get('/transaction-logs/entity', {
      params: { entityType, entityId }
    });
    return response.data;
  }

  async getAuditTrail(entityId: string): Promise<TransactionLog[]> {
    const response = await apiClient.get(`/transaction-logs/audit-trail/${entityId}`);
    return response.data;
  }
}

export const transactionLogApi = new TransactionLogApi();
