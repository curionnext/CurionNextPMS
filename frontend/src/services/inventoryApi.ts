import api from '../lib/apiClient';

export type InventoryCategory = {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
};

export type InventoryItem = {
    id: string;
    sku: string;
    name: string;
    categoryId: string;
    unitOfMeasure: string;
    averageCost: number;
    parLevel: number;
    reorderQuantity: number;
    isActive: boolean;
};

export type StoreLocation = {
    id: string;
    name: string;
    type: "MAIN_STORE" | "DEPARTMENTAL" | "OUTLET";
    description?: string;
    isActive: boolean;
};

export type StockLedgerEntry = {
    id: string;
    itemId: string;
    storeId: string;
    quantityOnHand: number;
    lastUpdated: string;
};

export const inventoryApi = {
    getCategories: () => api.get<{ categories: InventoryCategory[] }>('/inventory/categories').then(res => res.data.categories),
    createCategory: (data: { name: string; description?: string }) => api.post<{ category: InventoryCategory }>('/inventory/categories', data).then(res => res.data.category),

    getItems: () => api.get<{ items: InventoryItem[] }>('/inventory/items').then(res => res.data.items),
    createItem: (data: Omit<InventoryItem, 'id' | 'isActive'>) => api.post<{ item: InventoryItem }>('/inventory/items', data).then(res => res.data.item),

    getStores: () => api.get<{ stores: StoreLocation[] }>('/inventory/stores').then(res => res.data.stores),
    createStore: (data: { name: string; type: string; description?: string }) => api.post<{ store: StoreLocation }>('/inventory/stores', data).then(res => res.data.store),

    getStockLedger: (storeId?: string) => api.get<{ ledger: StockLedgerEntry[] }>(`/inventory/ledger${storeId ? `?storeId=${storeId}` : ''}`).then(res => res.data.ledger),

    recordTransaction: (data: { itemId: string; storeId: string; type: string; quantityDelta: number; referenceId?: string; notes?: string }) =>
        api.post('/inventory/transactions', data).then(res => res.data),
};
