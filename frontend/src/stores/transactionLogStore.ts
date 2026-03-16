import { create } from 'zustand';
import { transactionLogApi, type TransactionLog, type CreateTransactionLogRequest } from '../services/transactionLogApi';
import { useAuthStore } from './authStore';

interface TransactionLogState {
  logs: TransactionLog[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  logTransaction: (data: Omit<CreateTransactionLogRequest, 'userId' | 'userName'>) => Promise<void>;
  fetchLogs: (filters?: any) => Promise<void>;
  fetchEntityLogs: (entityType: string, entityId: string) => Promise<void>;
  clearError: () => void;
}

export const useTransactionLogStore = create<TransactionLogState>((set) => ({
  logs: [],
  isLoading: false,
  error: null,

  logTransaction: async (data) => {
    try {
      const { user } = useAuthStore.getState();
      
      if (!user) {
        console.warn('Cannot log transaction: No user authenticated');
        return;
      }

      await transactionLogApi.create({
        ...data,
      });

      // Optionally refresh logs after creating
      // await get().fetchLogs();
    } catch (error) {
      console.error('Failed to log transaction:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  },

  fetchLogs: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const logs = await transactionLogApi.getAll(filters);
      set({ logs, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch transaction logs',
        isLoading: false 
      });
    }
  },

  fetchEntityLogs: async (entityType, entityId) => {
    set({ isLoading: true, error: null });
    try {
      const logs = await transactionLogApi.getByEntity(entityType, entityId);
      set({ logs, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch entity logs',
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
