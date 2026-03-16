import { db } from "../db/index.js";
import { nanoid } from "nanoid";

async function runInventorySeed() {
    console.log("Starting Inventory & Purchasing data seed...");

    const hotelCode = "NEXUS-MAIN";
    const hotelId = "NEXUS-MAIN-ID"; // Assume existing

    // Wipe only inventory tables
    const tables = [
        db.vendors, db.inventoryCategories, db.inventoryItems,
        db.stores, db.stockLedger, db.inventoryTransactions, db.purchaseOrders
    ];

    for (const table of tables) {
        if (table) {
            const all = await (table as any).getAll();
            for (const item of all) {
                await (table as any).delete(item.id);
            }
        }
    }

    console.log("Wiped old inventory data. Seeding new data...");

    // 1. Vendors
    const vendors = [
        { id: nanoid(), hotelId, hotelCode, name: "Sysco Foods", contactPerson: "John Sysco", email: "orders@sysco.ex", phone: "555-0199", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, name: "EcoLabs Cleaning", contactPerson: "Sarah Eco", email: "sales@ecolab.ex", phone: "555-0299", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, name: "Premium Linens Co", contactPerson: "Mike Weaver", email: "mike@linens.ex", phone: "555-0399", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    for (const v of vendors) await db.vendors.insert(v as any);

    // 2. Categories
    const categories = [
        { id: nanoid(), hotelId, hotelCode, name: "Food & Beverage", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, name: "Housekeeping", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, name: "Linens", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    for (const c of categories) await db.inventoryCategories.insert(c as any);

    // 3. Stores
    const stores = [
        { id: nanoid(), hotelId, hotelCode, name: "Main Warehouse", type: "MAIN_STORE", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, name: "Kitchen Freezers", type: "DEPARTMENTAL", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, name: "Housekeeping Cart Floor 1", type: "OUTLET", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    for (const s of stores) await db.stores.insert(s as any);

    // 4. Items
    const items = [
        { id: nanoid(), hotelId, hotelCode, sku: "FB-BEEF-01", name: "Premium Ground Beef", categoryId: categories[0].id, unitOfMeasure: "kg", averageCost: 12.50, parLevel: 50, reorderQuantity: 20, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, sku: "FB-COKE-01", name: "Coca-Cola Cans (24pk)", categoryId: categories[0].id, unitOfMeasure: "pack", averageCost: 8.00, parLevel: 20, reorderQuantity: 10, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, sku: "HK-SOAP-01", name: "Guest Soap Bars", categoryId: categories[1].id, unitOfMeasure: "box", averageCost: 25.00, parLevel: 10, reorderQuantity: 5, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: nanoid(), hotelId, hotelCode, sku: "LN-TOWEL-01", name: "Bath Towel (White)", categoryId: categories[2].id, unitOfMeasure: "piece", averageCost: 15.00, parLevel: 200, reorderQuantity: 50, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    for (const i of items) await db.inventoryItems.insert(i as any);

    // 5. Stock Ledger (Initial Balances)
    const ledgers = [
        { id: nanoid(), hotelId, hotelCode, itemId: items[0].id, storeId: stores[1].id, quantityOnHand: 45, lastUpdated: new Date().toISOString() }, // Low stock (Par is 50)
        { id: nanoid(), hotelId, hotelCode, itemId: items[1].id, storeId: stores[0].id, quantityOnHand: 50, lastUpdated: new Date().toISOString() }, // Healthy
        { id: nanoid(), hotelId, hotelCode, itemId: items[2].id, storeId: stores[2].id, quantityOnHand: 8, lastUpdated: new Date().toISOString() }, // Low stock
    ];
    for (const l of ledgers) await db.stockLedger.insert(l as any);

    // 6. A Draft Purchase Order
    const po = {
        id: nanoid(), hotelId, hotelCode, poNumber: "PO-001099", vendorId: vendors[0].id, status: "DRAFT",
        items: [
            { itemId: items[0].id, quantityOrdered: 20, quantityReceived: 0, unitPrice: 12.50, taxAmount: 0, totalAmount: 250 }
        ],
        subtotal: 250, taxTotal: 0, grandTotal: 250, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await db.purchaseOrders.insert(po as any);

    console.log("Inventory seeding complete!");
}

runInventorySeed().catch(console.error);
