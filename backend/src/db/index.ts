import { createPrismaTable } from "./prismaTable.js";
import type {
  FloorRecord,
  BillRecord,
  PaymentRecord,
  HousekeepingTaskRecord,
  MaintenanceRecord,
  MenuItemRecord,
  OrderRecord,
  KitchenTicketRecord,
  AlertRecord,
  GuestRecord,
  PropertyProfile,
  ReservationRecord,
  RoomRecord,
  RoomTypeRecord,
  ShiftRecord,
  TaxConfig,
  UserRecord,
  NightAuditRecord,
  OTAChannelConfig,
  OTAReservationImport,
  OTASyncLog,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppConfig,
  PropertyGroup,
  TransactionLogRecord
} from "../types/domain.js";

const users = createPrismaTable<UserRecord>("user");
const rooms = createPrismaTable<RoomRecord>("room");
const reservations = createPrismaTable<ReservationRecord>("reservation");
const shifts = createPrismaTable<ShiftRecord>("shift");
const property = createPrismaTable<PropertyProfile>("property");
const roomTypes = createPrismaTable<RoomTypeRecord>("roomType");
const floors = createPrismaTable<FloorRecord>("floor");
const taxes = createPrismaTable<TaxConfig>("taxConfig");
const guests = createPrismaTable<GuestRecord>("guest");
const bills = createPrismaTable<BillRecord>("bill");
const payments = createPrismaTable<PaymentRecord>("payment");
const housekeeping = createPrismaTable<HousekeepingTaskRecord>("housekeepingTask");
const maintenance = createPrismaTable<MaintenanceRecord>("maintenanceRequest");
const menu = createPrismaTable<MenuItemRecord>("menuItem");
const orders = createPrismaTable<OrderRecord>("order");
const kitchenTickets = createPrismaTable<KitchenTicketRecord>("order"); // KOTs usually mapped to Orders in simplified schemas
const alerts = createPrismaTable<AlertRecord>("alert");

// New feature tables
const nightAudits = createPrismaTable<NightAuditRecord>("nightAudit");
const otaChannels = createPrismaTable<OTAChannelConfig>("oTAChannel");
const otaReservationImports = createPrismaTable<OTAReservationImport>("oTAReservationImport");
const otaSyncLogs = createPrismaTable<OTASyncLog>("oTASyncLog");
const whatsappTemplates = createPrismaTable<WhatsAppTemplate>("whatsAppTemplate");
const whatsappMessages = createPrismaTable<WhatsAppMessage>("whatsAppMessage");
const whatsappConfig = createPrismaTable<WhatsAppConfig>("whatsAppConfig");
const propertyGroups = createPrismaTable<PropertyGroup>("propertyGroup");
const transactionLogs = createPrismaTable<TransactionLogRecord>("transactionLog");

// Inventory Tables
const vendors = createPrismaTable<any>("vendor");
const inventoryCategories = createPrismaTable<any>("inventoryCategory");
const inventoryItems = createPrismaTable<any>("inventoryItem");
const stores = createPrismaTable<any>("store");
const stockLedger = createPrismaTable<any>("stockLedger");
const inventoryTransactions = createPrismaTable<any>("stockLedger"); // Simplified mapping for now
const purchaseOrders = createPrismaTable<any>("purchaseOrder");

export const db = {
  users,
  rooms,
  reservations,
  shifts,
  property,
  roomTypes,
  floors,
  taxes,
  guests,
  bills,
  payments,
  housekeeping,
  maintenance,
  menu,
  orders,
  kitchenTickets,
  alerts,
  nightAudits,
  otaChannels,
  otaReservationImports,
  otaSyncLogs,
  whatsappTemplates,
  whatsappMessages,
  whatsappConfig,
  propertyGroups,
  transactionLogs,
  vendors,
  inventoryCategories,
  inventoryItems,
  stores,
  stockLedger,
  inventoryTransactions,
  purchaseOrders
};

export type Database = typeof db;
export type TableName = keyof Database;
export const getTable = <K extends TableName>(name: K): Database[K] => db[name];
