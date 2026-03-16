import { db } from "../db/index.js";
import { nanoid } from "nanoid";
import { HttpError } from "../middlewares/errorHandler.js";
import type {
    InventoryCategoryRecord,
    InventoryItemRecord,
    StockLedgerRecord,
    InventoryTransactionRecord
} from "../types/domain.js";

const now = () => new Date().toISOString();

export const createCategory = async (hotelCode: string, name: string, description?: string) => {
    const record: InventoryCategoryRecord = {
        id: nanoid(),
        hotelId: hotelCode, // simplified for single-property context
        hotelCode,
        name,
        description,
        isActive: true,
        createdAt: now(),
        updatedAt: now()
    };

    // Note: db.inventoryCategories does not exist yet; we need to add it to db/index.ts.
    return (db as any).inventoryCategories.insert(record);
};

export const getCategories = async (hotelCode: string) => {
    const all = await (db as any).inventoryCategories.getAll() as InventoryCategoryRecord[];
    return all.filter(c => c.hotelCode === hotelCode && c.isActive);
};

export const createItem = async (input: Omit<InventoryItemRecord, "id" | "createdAt" | "updatedAt">) => {
    const record: InventoryItemRecord = {
        ...input,
        id: nanoid(),
        createdAt: now(),
        updatedAt: now()
    };
    return (db as any).inventoryItems.insert(record);
};

export const getItems = async (hotelCode: string) => {
    const all = await (db as any).inventoryItems.getAll() as InventoryItemRecord[];
    return all.filter(i => i.hotelCode === hotelCode && i.isActive);
};

export const createStore = async (hotelCode: string, name: string, type: "MAIN_STORE" | "DEPARTMENTAL" | "OUTLET", description?: string) => {
    const record = {
        id: nanoid(),
        hotelId: hotelCode,
        hotelCode,
        name,
        type,
        description,
        isActive: true,
        createdAt: now(),
        updatedAt: now()
    };
    return (db as any).stores.insert(record);
};

export const getStores = async (hotelCode: string) => {
    const all = await (db as any).stores.getAll();
    return all.filter((s: any) => s.hotelCode === hotelCode && s.isActive);
};

export const getStockLedger = async (hotelCode: string, storeId?: string) => {
    const all = await (db as any).stockLedger.getAll() as StockLedgerRecord[];
    return all.filter(s => s.hotelCode === hotelCode && (!storeId || s.storeId === storeId));
};

export const recordTransaction = async (
    hotelCode: string,
    itemId: string,
    storeId: string,
    type: "RECEIPT" | "TRANSFER" | "CONSUMPTION" | "ADJUSTMENT",
    quantityDelta: number,
    actorId?: string,
    referenceId?: string,
    notes?: string
) => {
    if (quantityDelta === 0) throw new HttpError(400, "Transaction delta cannot be zero");

    const timestamp = now();

    // 1. Record the immutable transaction log
    const txRecord: InventoryTransactionRecord = {
        id: nanoid(),
        hotelId: hotelCode,
        hotelCode,
        itemId,
        storeId,
        type,
        quantityDelta,
        referenceId,
        actorId,
        notes,
        timestamp
    };

    await (db as any).inventoryTransactions.insert(txRecord);

    // 2. Update Stock Ledger
    const ledgers = await (db as any).stockLedger.getAll() as StockLedgerRecord[];
    const existing = ledgers.find(l => l.itemId === itemId && l.storeId === storeId);

    if (existing) {
        const newQty = existing.quantityOnHand + quantityDelta;
        if (newQty < 0) {
            throw new HttpError(400, `Insufficient stock for item ${itemId} in store ${storeId}`);
        }
        await (db as any).stockLedger.update(existing.id, {
            quantityOnHand: newQty,
            lastUpdated: timestamp
        });
        return { transaction: txRecord, stockLevel: newQty };
    } else {
        // If not existing, it must be an inbound transaction creating holding.
        if (quantityDelta < 0) {
            throw new HttpError(400, `Cannot deduct non-existent stock for item ${itemId}`);
        }
        const newLedger: StockLedgerRecord = {
            id: nanoid(),
            hotelId: hotelCode,
            hotelCode,
            itemId,
            storeId,
            quantityOnHand: quantityDelta,
            lastUpdated: timestamp
        };
        await (db as any).stockLedger.insert(newLedger);
        // Add to items list if not there
        return { transaction: txRecord, stockLevel: quantityDelta };
    }
};
