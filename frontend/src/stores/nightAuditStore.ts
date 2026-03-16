import { create } from 'zustand';
import { nightAuditApi, type NightAuditResponse } from '../services/nightAuditApi';

type NightAuditStore = {
  audits: NightAuditResponse[];
  currentAudit: NightAuditResponse | null;
  isLoading: boolean;
  isAuditRequired: boolean;
  error: string | null;

  // Actions
  fetchAudits: () => Promise<void>;
  fetchLatestAudit: () => Promise<void>;
  fetchAuditById: (id: string) => Promise<void>;
  checkAuditRequired: () => Promise<void>;
  startAudit: (businessDate?: string) => Promise<NightAuditResponse>;
  retryAudit: (id: string) => Promise<NightAuditResponse>;
  resetError: () => void;
};

export const useNightAuditStore = create<NightAuditStore>((set) => ({
  audits: [],
  currentAudit: null,
  isLoading: false,
  isAuditRequired: true,
  error: null,

  fetchAudits: async () => {
    set({ isLoading: true, error: null });
    try {
      const audits = await nightAuditApi.fetchAudits();
      set({ audits, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch audits',
        isLoading: false 
      });
    }
  },

  fetchLatestAudit: async () => {
    set({ isLoading: true, error: null });
    try {
      const audit = await nightAuditApi.fetchLatestAudit();
      set({ currentAudit: audit, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch latest audit',
        isLoading: false 
      });
    }
  },

  fetchAuditById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const audit = await nightAuditApi.fetchAuditById(id);
      set({ currentAudit: audit, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch audit',
        isLoading: false 
      });
    }
  },

  checkAuditRequired: async () => {
    set({ error: null });
    try {
      const { isRequired } = await nightAuditApi.checkAuditRequired();
      set({ isAuditRequired: isRequired });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to check audit requirement'
      });
    }
  },

  startAudit: async (businessDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const audit = await nightAuditApi.startAudit({ businessDate });
      set({ 
        currentAudit: audit, 
        isLoading: false,
        isAuditRequired: false 
      });
      return audit;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start audit';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  retryAudit: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const audit = await nightAuditApi.retryAudit(id);
      set({ currentAudit: audit, isLoading: false });
      return audit;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to retry audit';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  resetError: () => set({ error: null }),
}));
