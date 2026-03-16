import { nanoid } from "nanoid";
import type { Logger } from "pino";
import { db } from "../db/index.js";
import { hashPassword } from "../utils/password.js";
import type {
  FloorRecord,
  GuestRecord,
  ReservationRecord,
  RoomRecord,
  RoomTypeRecord,
  TaxConfig
} from "../types/domain.js";

const HOTEL_ID = "hotel-aurora";
const HOTEL_CODE = "HOTEL001";
const HOTEL_NAME = "Aurora Grand Hotel";

const now = () => new Date().toISOString();

const formatDate = (date: Date) => date.toISOString().split("T")[0];

const ensureDefaultUser = async (logger: Logger) => {
  const users = await db.users.getAll();

  if (users.length > 0) {
    return;
  }

  const timestamp = now();
  const passwordHash = await hashPassword("Password!123");

  await db.users.insert({
    hotelId: HOTEL_ID,
    hotelCode: HOTEL_CODE,
    username: "admin",
    email: "admin@auroragrand.example",
    displayName: "Aurora Admin",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "FRONT_DESK"],
    passwordHash,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  logger.info("Seeded default admin user (username: admin, password: Password!123)");
};

const ensurePropertyProfile = async (logger: Logger) => {
  const propertyProfiles = await db.property.getAll();

  if (propertyProfiles.length > 0) {
    return propertyProfiles[0];
  }

  const timestamp = now();

  const profile = await db.property.insert({
    hotelId: HOTEL_ID,
    hotelCode: HOTEL_CODE,
    name: HOTEL_NAME,
    addressLine1: "12 Sunrise Boulevard",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400001",
    phone: "+91-22-5550-0100",
    email: "frontdesk@auroragrand.example",
    timezone: "Asia/Kolkata",
    gstin: "27ABCDE1234F1Z5",
    updatedAt: timestamp
  });

  logger.info("Seeded default property profile");
  return profile;
};

const ensureTaxConfig = async (logger: Logger) => {
  const existing = await db.taxes.getAll();
  const record = existing.find((entry) => entry.hotelCode === HOTEL_CODE);

  if (record) {
    return record;
  }

  const timestamp = now();

  const config: Omit<TaxConfig, "id"> = {
    hotelId: HOTEL_ID,
    hotelCode: HOTEL_CODE,
    gstEnabled: true,
    cgst: 6,
    sgst: 6,
    igst: 0,
    serviceChargeEnabled: true,
    serviceChargePercentage: 10,
    luxuryTaxEnabled: false,
    luxuryTaxPercentage: 0,
    updatedAt: timestamp
  };

  const inserted = await db.taxes.insert(config);
  logger.info("Seeded default tax configuration");
  return inserted;
};

const ensureRoomTypes = async (logger: Logger) => {
  const existing = await db.roomTypes.getAll();
  const relevant = existing.filter((record) => record.hotelCode === HOTEL_CODE);

  if (relevant.length > 0) {
    return relevant;
  }

  const timestamp = now();
  const roomTypes: Array<Omit<RoomTypeRecord, "id">> = [
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      name: "Deluxe King Room",
      shortCode: "DLX",
      description: "Deluxe King Room",
      baseRate: 7500,
      occupancy: 2,
      extraBedRate: 1500,
      amenities: ["King Bed", "Smart TV", "Mini Bar", "WiFi"],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      name: "Standard Queen Room",
      shortCode: "STD",
      description: "Standard Queen Room",
      baseRate: 5400,
      occupancy: 2,
      extraBedRate: 1200,
      amenities: ["Queen Bed", "TV", "WiFi"],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      name: "Executive Suite",
      shortCode: "SUT",
      description: "Executive Suite",
      baseRate: 11200,
      occupancy: 4,
      extraBedRate: 2500,
      amenities: ["Living Room", "Kitchenette", "King Bed", "Jacuzzi", "WiFi"],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const inserted = await Promise.all(roomTypes.map((type) => db.roomTypes.insert(type)));
  logger.info("Seeded default room types");
  return inserted;
};

const ensureFloors = async (logger: Logger) => {
  const existing = await db.floors.getAll();
  const relevant = existing.filter((record) => record.hotelCode === HOTEL_CODE);

  if (relevant.length > 0) {
    return relevant;
  }

  const timestamp = now();
  const floors: Array<Omit<FloorRecord, "id">> = [
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: 1,
      name: "Ground Floor",
      sortOrder: 0,
      buildingId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: 2,
      name: "First Floor",
      sortOrder: 1,
      buildingId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: 3,
      name: "Second Floor",
      sortOrder: 2,
      buildingId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const inserted = await Promise.all(floors.map((floor) => db.floors.insert(floor)));
  logger.info("Seeded default floors");
  return inserted;
};

const ensureRooms = async (logger: Logger) => {
  const existing = await db.rooms.getAll();
  const relevant = existing.filter((record) => record.hotelCode === HOTEL_CODE);

  if (relevant.length > 0) {
    return relevant;
  }

  const timestamp = now();
  const [roomTypes, floors] = await Promise.all([ensureRoomTypes(logger), ensureFloors(logger)]);
  const roomTypeByCode = new Map(roomTypes.map((type) => [type.shortCode ?? type.name, type]));
  const floorByNumber = new Map(floors.map((floor) => [floor.number, floor]));

  const rooms: Array<Omit<RoomRecord, "id">> = [
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: "101",
      name: "Deluxe King 101",
      type: "DLX",
      roomTypeId: roomTypeByCode.get("DLX")?.id ?? "",
      status: "OCCUPIED",
      rate: 7500,
      floor: 1,
      floorId: floorByNumber.get(1)?.id,
      buildingId: undefined,
      amenities: ["WiFi", "Smart TV", "Mini Bar"],
      maxOccupancy: 2,
      hasExtraBed: false,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: "102",
      name: "Standard Queen 102",
      type: "STD",
      roomTypeId: roomTypeByCode.get("STD")?.id ?? "",
      status: "AVAILABLE",
      rate: 5400,
      floor: 1,
      floorId: floorByNumber.get(1)?.id,
      buildingId: undefined,
      amenities: ["WiFi", "TV"],
      maxOccupancy: 2,
      hasExtraBed: false,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: "201",
      name: "Deluxe King 201",
      type: "DLX",
      roomTypeId: roomTypeByCode.get("DLX")?.id ?? "",
      status: "DIRTY",
      rate: 7600,
      floor: 2,
      floorId: floorByNumber.get(2)?.id,
      buildingId: undefined,
      amenities: ["WiFi", "Smart TV", "Coffee Maker"],
      maxOccupancy: 2,
      hasExtraBed: false,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      number: "301",
      name: "Executive Suite 301",
      type: "SUT",
      roomTypeId: roomTypeByCode.get("SUT")?.id ?? "",
      status: "AVAILABLE",
      rate: 11200,
      floor: 3,
      floorId: floorByNumber.get(3)?.id,
      buildingId: undefined,
      amenities: ["WiFi", "Smart TV", "Living Room", "Kitchenette"],
      maxOccupancy: 4,
      hasExtraBed: true,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const sanitized = rooms.filter((room) => room.roomTypeId);
  const inserted = await Promise.all(sanitized.map((room) => db.rooms.insert(room)));
  logger.info("Seeded default rooms");
  return inserted;
};

const ensureGuests = async (logger: Logger) => {
  const existing = await db.guests.getAll();
  const relevant = existing.filter((record) => record.hotelCode === HOTEL_CODE);

  if (relevant.length > 0) {
    return relevant;
  }

  const timestamp = now();
  const guests: Array<Omit<GuestRecord, "id">> = [
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      phone: "+1-555-0123",
      addressLine1: "42 Ocean View",
      city: "New York",
      state: "NY",
      country: "USA",
      postalCode: "10001",
      preferences: ["Late checkout", "High floor"],
      tags: ["VIP"],
      notes: "Prefers sparkling water in room",
      visitCount: 3,
      stayHistory: [],
      idDocuments: [
        {
          type: "passport",
          number: "P123456789",
          capturedAt: timestamp
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      firstName: "Emma",
      lastName: "Johnson",
      email: "emma.j@example.com",
      phone: "+44-20-5550-0124",
      city: "London",
      country: "UK",
      visitCount: 1,
      stayHistory: [],
      idDocuments: [
        {
          type: "passport",
          number: "P987654321",
          capturedAt: timestamp
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      firstName: "Michael",
      lastName: "Chen",
      email: "mchen@example.com",
      phone: "+65-5550-0125",
      city: "Singapore",
      country: "Singapore",
      visitCount: 5,
      stayHistory: [],
      idDocuments: [
        {
          type: "passport",
          number: "P456789123",
          capturedAt: timestamp
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const inserted = await Promise.all(guests.map((guest) => db.guests.insert(guest)));
  logger.info("Seeded default guests");
  return inserted;
};

const calculateNights = (arrival: Date, departure: Date) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round((departure.getTime() - arrival.getTime()) / MS_PER_DAY));
};

const ensureReservations = async (logger: Logger) => {
  const existing = await db.reservations.getAll();
  const relevant = existing.filter((record) => record.hotelCode === HOTEL_CODE);

  if (relevant.length > 0) {
    return relevant;
  }

  const [rooms, guests] = await Promise.all([ensureRooms(logger), ensureGuests(logger)]);

  const guestByEmail = (email: string) => guests.find((guest) => guest.email === email);

  const today = new Date();
  const arrival1 = new Date(today.getTime());
  const departure1 = new Date(today.getTime());
  departure1.setDate(departure1.getDate() + 3);

  const arrival2 = new Date(today.getTime());
  arrival2.setDate(arrival2.getDate() + 1);
  const departure2 = new Date(arrival2.getTime());
  departure2.setDate(departure2.getDate() + 4);

  const reservationDrafts: Array<Omit<ReservationRecord, "id">> = [
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      guestId: guestByEmail("john.smith@example.com")?.id ?? guests[0].id,
      roomType: "DLX",
      roomId: rooms.find((room) => room.number === "101")?.id,
      status: "CHECKED_IN",
      arrivalDate: formatDate(arrival1),
      departureDate: formatDate(departure1),
      adults: 1,
      children: 0,
      nightlyRate: 7500,
      ratePlan: "BAR",
      source: "DIRECT",
      isWalkIn: false,
      billing: {
        currency: "INR",
        totalAmount: 7500 * calculateNights(arrival1, departure1),
        balanceDue: 0,
        charges: [
          {
            description: "Room charges",
            amount: 7500 * calculateNights(arrival1, departure1)
          }
        ]
      },
      notes: "Prefers late checkout",
      checkInAt: new Date().toISOString(),
      createdAt: now(),
      updatedAt: now()
    },
    {
      hotelId: HOTEL_ID,
      hotelCode: HOTEL_CODE,
      guestId: guestByEmail("emma.j@example.com")?.id ?? guests[1].id,
      roomType: "STD",
      roomId: rooms.find((room) => room.number === "102")?.id,
      status: "CONFIRMED",
      arrivalDate: formatDate(arrival2),
      departureDate: formatDate(departure2),
      adults: 2,
      children: 1,
      nightlyRate: 5400,
      ratePlan: "CORPORATE",
      source: "CORPORATE",
      otaReference: "CORP-9001",
      isWalkIn: false,
      billing: {
        currency: "INR",
        totalAmount: 5400 * calculateNights(arrival2, departure2),
        balanceDue: 5400 * calculateNights(arrival2, departure2),
        charges: [
          {
            description: "Room charges",
            amount: 5400 * calculateNights(arrival2, departure2)
          }
        ]
      },
      createdAt: now(),
      updatedAt: now()
    }
  ];

  const inserted = await Promise.all(reservationDrafts.map((reservation) => db.reservations.insert(reservation)));
  logger.info("Seeded default reservations");
  return inserted;
};

export const bootstrapData = async (logger: Logger) => {
  // Only create essential data - admin user and property profile
  await ensureDefaultUser(logger);
  const profile = await ensurePropertyProfile(logger);
  
  // Dummy data seeding disabled - use real data only
  // await ensureTaxConfig(logger);
  // await ensureRoomTypes(logger);
  // await ensureFloors(logger);
  // await ensureRooms(logger);
  // await ensureGuests(logger);
  // await ensureReservations(logger);

  logger.info({ hotelCode: profile.hotelCode }, "Bootstrap completed - using real data only");
};
