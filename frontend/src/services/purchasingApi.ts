import api from '../lib/apiClient';

export type Vendor = {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    paymentTerms?: string;
    taxStatus?: string;
    isActive: boolean;
};

export type PurchaseOrderLineItem = {
    itemId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
    taxAmount: number;
    totalAmount: number;
};

export type PurchaseOrder = {
    id: string;
    poNumber: string;
    vendorId: string;
    status: "DRAFT" | "APPROVED" | "SENT" | "PARTIALLY_RECEIVED" | "COMPLETED" | "CANCELLED";
    expectedDelivery?: string;
    items: PurchaseOrderLineItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    notes?: string;
    createdAt: string;
};

export const purchasingApi = {
    getVendors: () => api.get<{ vendors: Vendor[] }>('/purchasing/vendors').then(res => res.data.vendors),
    createVendor: (data: Omit<Vendor, 'id' | 'isActive'>) => api.post<{ vendor: Vendor }>('/purchasing/vendors', data).then(res => res.data.vendor),

    getOrders: () => api.get<{ orders: PurchaseOrder[] }>('/purchasing/orders').then(res => res.data.orders),
    createOrder: (data: { vendorId: string; items: { itemId: string, quantityOrdered: number, unitPrice: number, taxAmount: number }[], expectedDelivery?: string, notes?: string }) =>
        api.post<{ order: PurchaseOrder }>('/purchasing/orders', data).then(res => res.data.order),

    updateOrderStatus: (id: string, status: string) => api.put<{ order: PurchaseOrder }>(`/purchasing/orders/${id}/status`, { status }).then(res => res.data.order),

    receiveOrder: (id: string, data: { storeId: string, receivedItems: { itemId: string, quantityReceived: number }[] }) =>
        api.post<{ order: PurchaseOrder }>(`/purchasing/orders/${id}/receive`, data).then(res => res.data.order),
};
