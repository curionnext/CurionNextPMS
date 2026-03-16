import { db } from "../db/index.js";
import { nanoid } from "nanoid";
import { HttpError } from "../middlewares/errorHandler.js";
import { recordTransaction } from "./inventoryService.js";
import type {
    VendorRecord,
    PurchaseOrderRecord,
    PurchaseOrderLineItem
} from "../types/domain.js";

const now = () => new Date().toISOString();

export const createVendor = async (hotelCode: string, input: Omit<VendorRecord, "id" | "createdAt" | "updatedAt">) => {
    const record: VendorRecord = {
        ...input,
        id: nanoid(),
        createdAt: now(),
        updatedAt: now()
    };
    return (db as any).vendors.insert(record);
};

export const getVendors = async (hotelCode: string) => {
    const all = await (db as any).vendors.getAll() as VendorRecord[];
    return all.filter(v => v.hotelCode === hotelCode && v.isActive);
};

export const createPurchaseOrder = async (
    hotelCode: string,
    vendorId: string,
    items: PurchaseOrderLineItem[],
    expectedDelivery?: string,
    notes?: string
) => {
    if (!items || items.length === 0) {
        throw new HttpError(400, "Purchase order must contain at least one item.");
    }

    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
        subtotal += item.unitPrice * item.quantityOrdered;
        taxTotal += item.taxAmount;
        item.totalAmount = (item.unitPrice * item.quantityOrdered) + item.taxAmount;
    }

    const record: PurchaseOrderRecord = {
        id: nanoid(),
        hotelId: hotelCode,
        hotelCode,
        poNumber: `PO-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`,
        vendorId,
        status: "DRAFT",
        expectedDelivery,
        items,
        subtotal,
        taxTotal,
        grandTotal: subtotal + taxTotal,
        notes,
        createdAt: now(),
        updatedAt: now()
    };

    return (db as any).purchaseOrders.insert(record);
};

export const getPurchaseOrders = async (hotelCode: string) => {
    const all = await (db as any).purchaseOrders.getAll() as PurchaseOrderRecord[];
    return all.filter(po => po.hotelCode === hotelCode);
};

export const updatePurchaseOrderStatus = async (
    hotelCode: string,
    poId: string,
    status: PurchaseOrderRecord["status"]
) => {
    const po = await (db as any).purchaseOrders.getById(poId) as PurchaseOrderRecord | undefined;
    if (!po || po.hotelCode !== hotelCode) {
        throw new HttpError(404, "Purchase Order not found");
    }

    // State machine logic
    if (po.status === "COMPLETED" || po.status === "CANCELLED") {
        throw new HttpError(400, "Cannot change status of a completed or cancelled PO");
    }

    po.status = status;
    po.updatedAt = now();

    return (db as any).purchaseOrders.update(poId, po);
};

export const receivePurchaseOrder = async (
    hotelCode: string,
    poId: string,
    storeId: string,
    receivedItems: { itemId: string; quantityReceived: number }[],
    actorId?: string
) => {
    const po = await (db as any).purchaseOrders.getById(poId) as PurchaseOrderRecord | undefined;
    if (!po || po.hotelCode !== hotelCode) {
        throw new HttpError(404, "Purchase Order not found");
    }

    if (po.status !== "APPROVED" && po.status !== "SENT" && po.status !== "PARTIALLY_RECEIVED") {
        throw new HttpError(400, `Cannot receive items for a PO in status ${po.status}`);
    }

    let allCompleted = true;

    for (const requested of receivedItems) {
        const lineItem = po.items.find(i => i.itemId === requested.itemId);
        if (!lineItem) {
            throw new HttpError(400, `Item ${requested.itemId} not found in this PO`);
        }

        if (requested.quantityReceived > 0) {
            lineItem.quantityReceived = (lineItem.quantityReceived || 0) + requested.quantityReceived;

            // Log to inventory via GRN (Goods Receipt Note) logic
            await recordTransaction(
                hotelCode,
                lineItem.itemId,
                storeId,
                "RECEIPT",
                requested.quantityReceived,
                actorId,
                po.id, // Reference the PO
                `Received against PO ${po.poNumber}`
            );
        }

        if (lineItem.quantityReceived < lineItem.quantityOrdered) {
            allCompleted = false;
        }
    }

    po.status = allCompleted ? "COMPLETED" : "PARTIALLY_RECEIVED";
    po.updatedAt = now();

    return (db as any).purchaseOrders.update(poId, po);
};
