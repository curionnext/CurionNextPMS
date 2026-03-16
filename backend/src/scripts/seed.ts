import { db } from "../db/index.js";
import { nanoid } from "nanoid";
import { hashPassword } from "../utils/password.js";

async function runSeed() {
    console.log("Starting full database wipe and seed...");

    const hotelCode = "NEXUS-MAIN";
    const hotelId = nanoid();

    // Wipe process - delete all records across all tables
    const tables = [
        db.property, db.roomTypes, db.rooms, db.floors, db.guests,
        db.reservations, db.bills, db.payments, db.taxes, db.kitchenTickets,
        db.orders, db.housekeeping, db.shifts, db.transactionLogs,
        db.users
    ];

    console.log("Wiping collections...");
    for (const table of tables) {
        if (table) {
            const all = await (table as any).getAll();
            for (const item of all) {
                await (table as any).delete(item.id);
            }
        }
    }

    console.log("Wiping complete. Seeding property setup...");

    await db.property.insert({
        id: hotelId,
        hotelId,
        hotelCode,
        name: "NexusNext Grand Hotel",
        addressLine1: "123 Hospitality Blvd",
        city: "New York",
        country: "USA",
        email: "contact@nexusnext.com",
        timezone: "America/New_York",
        updatedAt: new Date().toISOString()
    });

    await db.taxes.insert({
        id: nanoid(),
        hotelId,
        hotelCode,
        gstEnabled: true,
        cgst: 9,
        sgst: 9,
        igst: 0,
        serviceChargeEnabled: false,
        serviceChargePercentage: 0,
        luxuryTaxEnabled: false,
        luxuryTaxPercentage: 0,
        updatedAt: new Date().toISOString()
    });

    console.log("Seeding room types & rooms...");
    const typeDeluxe = {
        id: nanoid(), hotelId, hotelCode, name: "Deluxe King", shortCode: "DLX",
        baseRate: 150, occupancy: 2, extraBedRate: 50, amenities: ["WiFi", "TV"], isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const typeSuite = {
        id: nanoid(), hotelId, hotelCode, name: "Executive Suite", shortCode: "STE",
        baseRate: 350, occupancy: 4, extraBedRate: 100, amenities: ["WiFi", "TV", "Mini Bar"], isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await db.roomTypes.insert(typeDeluxe);
    await db.roomTypes.insert(typeSuite);

    const rooms = [];
    for (let i = 1; i <= 10; i++) {
        rooms.push({
            id: nanoid(), hotelId, hotelCode,
            number: `10${i}`,
            type: typeDeluxe.id,
            status: "AVAILABLE",
            rate: 150,
            floor: 1,
            maxOccupancy: 2,
            hasExtraBed: false,
            isActive: true,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
    }
    for (let i = 1; i <= 5; i++) {
        rooms.push({
            id: nanoid(), hotelId, hotelCode,
            number: `20${i}`,
            type: typeSuite.id,
            status: "AVAILABLE",
            rate: 350,
            floor: 2,
            maxOccupancy: 4,
            hasExtraBed: true,
            isActive: true,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
    }

    for (const r of rooms) await db.rooms.insert(r as any);

    console.log("Seeding guests & reservations (Past, Present, Future)...");

    // Data Generation Helpers
    const sources = ["DIRECT", "OTA", "CORPORATE", "WALK_IN", "SOCIAL"];
    const guests: any[] = [];
    const reservations: any[] = [];

    const today = new Date();
    const dateStr = (d: Date) => d.toISOString().split("T")[0];
    const offsetDate = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d;
    };

    const createGuest = (first: string, last: string) => {
        const g = {
            id: nanoid(), hotelId, hotelCode,
            firstName: first, lastName: last,
            email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
            phone: `555-010${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        guests.push(g);
        return g;
    };

    const createRes = (guest: any, arrDays: number, depDays: number, status: string, source: string, roomType: any, assignedRoom?: any) => {
        const rt = roomType.baseRate;
        const nights = depDays - arrDays;
        const subtotal = rt * nights;
        const taxes = subtotal * 0.18;
        const totalAmount = subtotal + taxes;

        const res = {
            id: nanoid(), hotelId, hotelCode, guestId: guest.id,
            roomType: roomType.id, roomId: assignedRoom?.id,
            status,
            arrivalDate: dateStr(offsetDate(arrDays)),
            departureDate: dateStr(offsetDate(depDays)),
            adults: 2, children: 0, nightlyRate: rt,
            ratePlan: "BAR", source, isWalkIn: source === "WALK_IN",
            billing: {
                currency: "USD",
                totalAmount: totalAmount,
                balanceDue: status === "CHECKED_OUT" ? 0 : totalAmount,
                charges: [
                    { type: "ROOM", amount: subtotal, totalAmount: subtotal, description: "Room Charge" },
                    { type: "TAX", amount: taxes, totalAmount: taxes, description: "Tax" }
                ]
            },
            checkInAt: status === "CHECKED_IN" || status === "CHECKED_OUT" ? offsetDate(arrDays).toISOString() : undefined,
            checkOutAt: status === "CHECKED_OUT" ? offsetDate(depDays).toISOString() : undefined,
            createdAt: offsetDate(arrDays - 5).toISOString(),
            updatedAt: new Date().toISOString()
        };
        reservations.push(res);
        return res;
    };

    // Past Checked-Out (Last 60 Days)
    for (let i = -60; i < 0; i += 2) {
        const g = createGuest(`Past${Math.abs(i)}`, "Guest");
        createRes(g, i, i + (Math.floor(Math.random() * 3) + 1), "CHECKED_OUT", sources[Math.floor(Math.random() * sources.length)], i % 4 === 0 ? typeSuite : typeDeluxe, rooms[Math.abs(i) % 10]);
    }

    // Currently In-House (Checked-In)
    for (let i = 0; i < 8; i++) {
        const g = createGuest(`Present${i}`, "InHouse");
        const room = rooms[i];
        createRes(g, -1 * (Math.floor(Math.random() * 2) + 1), Math.floor(Math.random() * 4) + 1, "CHECKED_IN", sources[Math.floor(Math.random() * sources.length)], i % 5 === 0 ? typeSuite : typeDeluxe, room);
        room.status = "OCCUPIED"; // Update local array mem
        await db.rooms.update(room.id, { status: "OCCUPIED" });
    }

    // Future Confirmed (Next 30 Days)
    for (let i = 1; i <= 30; i += 2) {
        const g = createGuest(`Future${i}`, "Booking");
        createRes(g, i, i + (Math.floor(Math.random() * 4) + 1), "CONFIRMED", sources[Math.floor(Math.random() * sources.length)], i % 3 === 0 ? typeSuite : typeDeluxe);
    }

    for (const g of guests) await db.guests.insert(g as any);
    for (const r of reservations) await db.reservations.insert(r as any);

    // Users Seeding
    const defaultPassword = await hashPassword("Password!123");

    await db.users.insert({
        id: nanoid(), hotelId, hotelCode, email: "admin@hotel.com",
        username: "admin", displayName: "System Admin", roles: ["ADMIN"], status: "ACTIVE",
        passwordHash: defaultPassword, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    await db.users.insert({
        id: nanoid(), hotelId, hotelCode, email: "manager@hotel.com",
        username: "manager", displayName: "Hotel Manager", roles: ["MANAGER"], status: "ACTIVE",
        passwordHash: defaultPassword, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    await db.users.insert({
        id: nanoid(), hotelId, hotelCode, email: "frontdesk@hotel.com",
        username: "frontdesk", displayName: "Front Desk Agent", roles: ["FRONT_DESK"], status: "ACTIVE",
        passwordHash: defaultPassword, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    await db.users.insert({
        id: nanoid(), hotelId, hotelCode, email: "housekeeping@hotel.com",
        username: "housekeeper", displayName: "Housekeeping Staff", roles: ["HOUSEKEEPING"], status: "ACTIVE",
        passwordHash: defaultPassword, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    console.log(`Seeded ${guests.length} guests, ${reservations.length} reservations.`);
    console.log("Dummy data generation complete! Start the backend server to see changes.");
}

runSeed().catch(console.error);
