import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { inventoryApi } from '../services/inventoryApi';
import type { InventoryCategory, InventoryItem, StockLedgerEntry, StoreLocation } from '../services/inventoryApi';
import { purchasingApi } from '../services/purchasingApi';
import type { PurchaseOrder, Vendor } from '../services/purchasingApi';

interface InventoryState {
    categories: InventoryCategory[];
    items: InventoryItem[];
    stores: StoreLocation[];
    stockLedger: StockLedgerEntry[];
    vendors: Vendor[];
    purchaseOrders: PurchaseOrder[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchInventoryData: () => Promise<void>;
    createCategory: (data: { name: string; description?: string }) => Promise<void>;
    createItem: (data: Omit<InventoryItem, 'id' | 'isActive'>) => Promise<void>;
    createStore: (data: { name: string; type: string; description?: string }) => Promise<void>;
    recordTransaction: (data: Parameters<typeof inventoryApi.recordTransaction>[0]) => Promise<void>;

    fetchPurchasingData: () => Promise<void>;
    createVendor: (data: Omit<Vendor, 'id' | 'isActive'>) => Promise<void>;
    createPurchaseOrder: (data: Parameters<typeof purchasingApi.createOrder>[0]) => Promise<void>;
    updatePOStatus: (id: string, status: string) => Promise<void>;
    receivePO: (id: string, data: Parameters<typeof purchasingApi.receiveOrder>[1]) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>()(
    devtools(
        (set) => ({
            categories: [],
            items: [],
            stores: [],
            stockLedger: [],
            vendors: [],
            purchaseOrders: [],
            isLoading: false,
            error: null,

            fetchInventoryData: async () => {
                set({ isLoading: true, error: null });
                try {
                    const [categories, items, stores, stockLedger] = await Promise.all([
                        inventoryApi.getCategories(),
                        inventoryApi.getItems(),
                        inventoryApi.getStores(),
                        inventoryApi.getStockLedger()
                    ]);
                    set({ categories, items, stores, stockLedger, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message || 'Failed to fetch inventory data', isLoading: false });
                }
            },

            createCategory: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const category = await inventoryApi.createCategory(data);
                    set(state => ({ categories: [...state.categories, category], isLoading: false }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to create category', isLoading: false });
                }
            },

            createItem: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const item = await inventoryApi.createItem(data);
                    set(state => ({ items: [...state.items, item], isLoading: false }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to create item', isLoading: false });
                }
            },

            createStore: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const store = await inventoryApi.createStore(data);
                    set(state => ({ stores: [...state.stores, store], isLoading: false }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to create store', isLoading: false });
                }
            },

            recordTransaction: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    await inventoryApi.recordTransaction(data);
                    // Refresh ledger after a transaction
                    const stockLedger = await inventoryApi.getStockLedger();
                    set({ stockLedger, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message || 'Failed to record transaction', isLoading: false });
                }
            },

            fetchPurchasingData: async () => {
                set({ isLoading: true, error: null });
                try {
                    const [vendors, purchaseOrders] = await Promise.all([
                        purchasingApi.getVendors(),
                        purchasingApi.getOrders()
                    ]);
                    set({ vendors, purchaseOrders, isLoading: false });
                } catch (error: any) {
                    set({ error: error.message || 'Failed to fetch purchasing data', isLoading: false });
                }
            },

            createVendor: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const vendor = await purchasingApi.createVendor(data);
                    set(state => ({ vendors: [...state.vendors, vendor], isLoading: false }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to create vendor', isLoading: false });
                }
            },

            createPurchaseOrder: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const order = await purchasingApi.createOrder(data);
                    set(state => ({ purchaseOrders: [...state.purchaseOrders, order], isLoading: false }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to create PO', isLoading: false });
                }
            },

            updatePOStatus: async (id, status) => {
                set({ isLoading: true, error: null });
                try {
                    const updatedOrder = await purchasingApi.updateOrderStatus(id, status);
                    set(state => ({
                        purchaseOrders: state.purchaseOrders.map(po => po.id === id ? updatedOrder : po),
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to update PO status', isLoading: false });
                }
            },

            receivePO: async (id, data) => {
                set({ isLoading: true, error: null });
                try {
                    const updatedOrder = await purchasingApi.receiveOrder(id, data);
                    const stockLedger = await inventoryApi.getStockLedger(); // Refresh ledger
                    set(state => ({
                        purchaseOrders: state.purchaseOrders.map(po => po.id === id ? updatedOrder : po),
                        stockLedger,
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ error: error.message || 'Failed to receive PO items', isLoading: false });
                }
            }
        }),
        { name: 'InventoryStore' }
    )
);
