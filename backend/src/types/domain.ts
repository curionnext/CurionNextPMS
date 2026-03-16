import type { Role } from "./auth.js";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type UserRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  username: string;
  email: string;
  displayName: string;
  roles: Role[];
  passwordHash: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "OUT_OF_ORDER";

export type POSCategory = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
};

// Purchase & Inventory Management Domain Types

export type VendorRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  taxStatus?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  description?: string;
  type: "MAIN_STORE" | "DEPARTMENTAL" | "OUTLET";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryCategoryRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  sku: string;
  name: string;
  categoryId: string;
  unitOfMeasure: string;
  averageCost: number;
  parLevel: number;
  reorderQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockLedgerRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  itemId: string;
  storeId: string;
  quantityOnHand: number;
  lastUpdated: string;
};

export type InventoryTransactionRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  itemId: string;
  storeId: string;
  type: "RECEIPT" | "TRANSFER" | "CONSUMPTION" | "ADJUSTMENT";
  quantityDelta: number;
  referenceId?: string; // e.g. PO ID
  actorId?: string;
  notes?: string;
  timestamp: string;
};

export type PurchaseOrderLineItem = {
  itemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  taxAmount: number;
  totalAmount: number;
};

export type PurchaseOrderRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
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
  updatedAt: string;
};

export type RoomRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  number: string;
  name?: string;
  type: string;
  roomTypeId: string;
  status: RoomStatus;
  rate: number;
  floor?: number;
  floorId?: string;
  buildingId?: string;
  amenities?: string[];
  maxOccupancy?: number;
  hasExtraBed?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReservationStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type RatePlanCode = "BAR" | "CORPORATE" | "PACKAGE";

export type ReservationSource = "DIRECT" | "OTA" | "CORPORATE" | "WALK_IN" | "SOCIAL";

export type ReservationCharge = {
  description: string;
  amount: number;
};

export type ReservationBilling = {
  currency: string;
  totalAmount: number;
  balanceDue: number;
  charges: ReservationCharge[];
};

export type ReservationRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  guestId: string;
  roomType: string;
  roomId?: string;
  status: ReservationStatus;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  nightlyRate: number;
  ratePlan: RatePlanCode;
  source: ReservationSource;
  otaReference?: string;
  isWalkIn: boolean;
  notes?: string;
  billing: ReservationBilling;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GuestIdDocument = {
  type: string;
  number: string;
  issuedBy?: string;
  issuedAt?: string;
  expiresAt?: string;
  fileUrl?: string;
  capturedAt: string;
};

export type GuestRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferences?: string[];
  tags?: string[];
  notes?: string;
  visitCount: number;
  stayHistory: string[];
  idDocuments: GuestIdDocument[];
  createdAt: string;
  updatedAt: string;
};

export type ShiftRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  userId: string;
  shiftName: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PropertyProfile = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  gstin?: string;
  updatedAt: string;
};

export type RoomTypeRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  shortCode: string;
  description?: string;
  baseRate: number;
  occupancy: number;
  extraBedRate?: number;
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FloorRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  number: number;
  name?: string;
  sortOrder: number;
  buildingId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaxConfig = {
  id: string;
  hotelId: string;
  hotelCode: string;
  gstEnabled: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  serviceChargeEnabled: boolean;
  serviceChargePercentage: number;
  luxuryTaxEnabled: boolean;
  luxuryTaxPercentage: number;
  updatedAt: string;
};

export type BillChargeType = "ROOM" | "ADDON" | "ADJUSTMENT";

export type BillFolio = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type BillCharge = {
  id: string;
  folioId: string;
  type: BillChargeType;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  postedAt: string;
  metadata?: Record<string, unknown>;
};

export type BillRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  reservationId: string;
  folios: BillFolio[];
  charges: BillCharge[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CREDIT" | "OTHER";

export type PaymentRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  reservationId: string;
  folioId: string;
  amount: number;
  currency: string;
  mode: PaymentMode;
  reference?: string;
  receivedAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type HousekeepingStatus = "PENDING" | "IN_PROGRESS" | "READY" | "INSPECT" | "COMPLETED" | "MAINTENANCE";

export type HousekeepingTaskRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  roomId: string;
  assignedTo?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  status: HousekeepingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type MaintenanceRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  roomId: string;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  reportedBy?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  reportedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemRecord = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
};

export type OrderStatus = "DRAFT" | "PLACED" | "PREPARING" | "READY" | "SERVED" | "POSTED" | "VOID";

export type OrderRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  source: "RESTAURANT" | "BAR" | "ROOM_SERVICE" | "POS";
  tableId?: string;
  reservationId?: string;
  guestName?: string;
  items: OrderItemRecord[];
  status: OrderStatus;
  totalAmount: number;
  kotNumber?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type KitchenTicketRecord = {
  id: string;
  orderId: string;
  hotelId: string;
  hotelCode: string;
  items: OrderItemRecord[];
  status: "QUEUED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
};

export type AlertType = "LATE_CHECKOUT" | "DIRTY_ROOM" | "PAYMENT_PENDING" | "OVERBOOKING_RISK";

export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export type AlertContext = {
  reservationId?: string;
  roomId?: string;
  date?: string;
};

export type AlertRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  type: AlertType;
  status: AlertStatus;
  fingerprint: string;
  message: string;
  context?: AlertContext;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
};

// ========================================
// Multi-Property Support Types
// ========================================

export type PropertyGroup = {
  id: string;
  name: string;
  description?: string;
  properties: string[]; // hotelIds
  createdAt: string;
  updatedAt: string;
};

export type PropertyFeatureFlags = {
  nightAuditEnabled: boolean;
  otaIntegrationEnabled: boolean;
  whatsappEnabled: boolean;
  multiPropertyEnabled: boolean;
};

// Extend PropertyProfile with feature flags
export type PropertyProfileExtended = PropertyProfile & {
  features?: PropertyFeatureFlags;
  groupId?: string;
};

// ========================================
// Night Audit Types
// ========================================

export type NightAuditStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type NightAuditRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  businessDate: string; // YYYY-MM-DD
  status: NightAuditStatus;
  startedAt?: string;
  completedAt?: string;
  startedBy?: string;
  steps: NightAuditStep[];
  summary?: NightAuditSummary;
  errors?: string[];
  createdAt: string;
  updatedAt: string;
};

export type NightAuditStepType =
  | "VALIDATE_SHIFT_CLOSURE"
  | "POST_ROOM_REVENUE"
  | "PROCESS_NO_SHOWS"
  | "UPDATE_ROOM_STATUS"
  | "GENERATE_REPORTS"
  | "ROLLOVER_DATE";

export type NightAuditStep = {
  type: NightAuditStepType;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  startedAt?: string;
  completedAt?: string;
  message?: string;
  data?: Record<string, unknown>;
};

export type NightAuditSummary = {
  totalRoomsOccupied: number;
  totalRevenuePosted: number;
  noShowsProcessed: number;
  roomStatusUpdates: number;
  reportsGenerated: string[];
};

// ========================================
// OTA Integration Types
// ========================================

export type OTAProvider = "BOOKING_COM" | "EXPEDIA" | "AIRBNB" | "MAKEMYTRIP" | "GOIBIBO";

export type OTAConnectionStatus = "ACTIVE" | "INACTIVE" | "ERROR";

export type OTAChannelConfig = {
  id: string;
  hotelId: string;
  hotelCode: string;
  provider: OTAProvider;
  status: OTAConnectionStatus;
  credentials: {
    apiKey?: string;
    hotelId?: string;
    propertyId?: string;
    username?: string;
    password?: string;
    endpoint?: string;
  };
  mappings: {
    roomTypeId: string;
    otaRoomTypeId: string;
    otaRoomTypeName: string;
  }[];
  syncSettings: {
    autoSyncRates: boolean;
    autoSyncInventory: boolean;
    autoImportReservations: boolean;
    syncIntervalMinutes: number;
  };
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type OTAReservationImport = {
  id: string;
  hotelId: string;
  hotelCode: string;
  provider: OTAProvider;
  otaConfirmationCode: string;
  otaReservationData: Record<string, unknown>;
  importedReservationId?: string;
  status: "PENDING" | "IMPORTED" | "FAILED" | "DUPLICATE";
  errorMessage?: string;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OTASyncLog = {
  id: string;
  hotelId: string;
  hotelCode: string;
  channelId: string;
  provider: OTAProvider;
  syncType: "RATES" | "INVENTORY" | "RESERVATIONS";
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  itemsProcessed: number;
  itemsFailed: number;
  details?: Record<string, unknown>;
  error?: string;
  syncedAt: string;
  createdAt: string;
};

// ========================================
// WhatsApp Automation Types
// ========================================

export type WhatsAppTemplateType =
  | "BOOKING_CONFIRMATION"
  | "CHECKIN_REMINDER"
  | "CHECKOUT_REMINDER"
  | "PAYMENT_REMINDER"
  | "FEEDBACK_REQUEST"
  | "CUSTOM";

export type WhatsAppMessageStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export type WhatsAppTemplate = {
  id: string;
  hotelId: string;
  hotelCode: string;
  type: WhatsAppTemplateType;
  name: string;
  templateId: string; // WhatsApp Business API template ID
  language: string;
  category: string;
  parameters: string[]; // List of parameter names like ["guestName", "checkInDate"]
  content: string; // Template content with {{1}}, {{2}} placeholders
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppMessage = {
  id: string;
  hotelId: string;
  hotelCode: string;
  templateId: string;
  templateType: WhatsAppTemplateType;
  recipientPhone: string;
  recipientName?: string;
  parameters: Record<string, string>;
  status: WhatsAppMessageStatus;
  relatedEntityType?: "RESERVATION" | "GUEST" | "BILL";
  relatedEntityId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorMessage?: string;
  externalMessageId?: string; // WhatsApp message ID
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppConfig = {
  id: string;
  hotelId: string;
  hotelCode: string;
  isEnabled: boolean;
  provider: "TWILIO" | "META" | "GUPSHUP" | "OTHER";
  credentials: {
    accountSid?: string;
    authToken?: string;
    phoneNumberId?: string;
    accessToken?: string;
    apiKey?: string;
    apiEndpoint?: string;
  };
  automationSettings: {
    sendBookingConfirmation: boolean;
    sendCheckinReminder: boolean;
    checkinReminderHoursBefore: number;
    sendCheckoutReminder: boolean;
    checkoutReminderHoursBefore: number;
    sendPaymentReminder: boolean;
    sendFeedbackRequest: boolean;
  };
  lastTestedAt?: string;
  lastTestStatus?: "SUCCESS" | "FAILED";
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionEventType =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "RESERVATION_CREATED"
  | "RESERVATION_UPDATED"
  | "RESERVATION_CANCELLED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_REFUNDED"
  | "ROOM_STATUS_CHANGED"
  | "GUEST_CREATED"
  | "GUEST_UPDATED"
  | "BILL_GENERATED"
  | "SHIFT_OPENED"
  | "SHIFT_CLOSED"
  | "SYSTEM_CONFIG_CHANGED"
  | "OTHER";

export type TransactionEntityType =
  | "USER"
  | "RESERVATION"
  | "GUEST"
  | "ROOM"
  | "PAYMENT"
  | "BILL"
  | "SHIFT"
  | "PROPERTY"
  | "SYSTEM"
  | "OTHER";

export type TransactionLogRecord = {
  id: string;
  hotelId: string;
  hotelCode: string;
  eventType: TransactionEventType;
  entityType: TransactionEntityType;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
};
