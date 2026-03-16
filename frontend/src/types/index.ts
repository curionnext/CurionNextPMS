// Core PMS Types

export type UserRole = 'admin' | 'manager' | 'front-desk' | 'housekeeping' | 'guest';

export type Shift = 'morning' | 'afternoon' | 'night';

export interface Hotel {
  code: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  shift: Shift;
  shiftStartTime: string;
  hotel: Hotel;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions: Permission[];
  hotelCode: string;
  currentShift?: Shift;
  lastLogin?: string;
}

export type Permission = 
  | 'view_dashboard'
  | 'manage_reservations'
  | 'check_in'
  | 'check_out'
  | 'manage_rooms'
  | 'manage_rates'
  | 'view_reports'
  | 'manage_guests'
  | 'process_payments'
  | 'manage_housekeeping'
  | 'manage_users'
  | 'manage_property_setup'
  | 'manage_pos'
  | 'manage_inventory'
  | 'view_alerts';

// Property Setup Types
export interface HotelProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  logo?: string;
  hotelCode: string;
}

export interface RoomType {
  id: string;
  name: string;
  shortCode: string;
  capacity: number;
  baseRate: number;
  extraBedRate: number;
  amenities: string[];
  description: string;
  isActive: boolean;
}

export interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  buildingId?: string;
  sortOrder: number;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  floors: Floor[];
}

export type RoomStatus = 'vacant' | 'occupied' | 'dirty' | 'oos' | 'maintenance';

export interface RoomInventory {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  floorId: string;
  buildingId?: string;
  status: RoomStatus;
  maxOccupancy: number;
  hasExtraBed: boolean;
  isActive: boolean;
  lastCleaned?: string;
}

export interface TaxConfiguration {
  id: string;
  gstEnabled: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  serviceChargeEnabled: boolean;
  serviceChargePercentage: number;
  luxuryTaxEnabled: boolean;
  luxuryTaxPercentage: number;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  idType: 'passport' | 'driving_license' | 'national_id';
  idNumber: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  preferences?: {
    smokingPreference?: 'smoking' | 'non-smoking';
    bedType?: 'single' | 'double' | 'twin' | 'king';
    floor?: 'low' | 'mid' | 'high';
    room?: {
      viewPreference?: string;
      amenities?: string[];
      notes?: string;
    };
    food?: {
      dietaryRestrictions?: string[];
      cuisinePreferences?: string[];
      favoriteDishes?: string[];
      beveragePreferences?: string[];
      notes?: string;
    };
    additionalRequests?: string;
  };
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  roomType: string; // Room type code (e.g., 'DLX', 'STD', 'SUT')
  floor: number;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  baseRate: number;
  maxOccupancy: number;
  amenities: string[];
  lastCleaned?: string;
  notes?: string;
  roomTypeId?: string; // Link to RoomType from property setup
}

export type HousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'in-progress';

export interface Reservation {
  id: string;
  confirmationNumber: string;
  guest: Guest;
  roomTypeId: string;
  roomNumbers: string[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  status: ReservationStatus;
  ratePlanId: string;
  ratePerNight: number;
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  source: BookingSource;
  otaSource?: OTASource;
  specialRequests?: string;
  notes?: string;
  checkInDetails?: CheckInDetails;
  checkOutDetails?: CheckOutDetails;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ReservationStatus = 
  | 'pending'
  | 'confirmed'
  | 'checked-in'
  | 'checked-out'
  | 'cancelled'
  | 'no-show';

export type RateType = 'bar' | 'corporate' | 'package' | 'government' | 'promotional';

export interface RatePlan {
  id: string;
  name: string;
  code: string;
  type: RateType;
  baseRate: number;
  discountPercentage: number;
  isActive: boolean;
  description?: string;
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type BookingSource = 'walk-in' | 'phone' | 'email' | 'website' | 'ota' | 'agent';

export type OTASource = 'booking.com' | 'expedia' | 'airbnb' | 'makemytrip' | 'goibibo' | 'agoda' | 'other';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'credit_card'
  | 'debit_card'
  | 'upi'
  | 'bank-transfer'
  | 'bank_transfer'
  | 'folio-transfer';

export interface IdentityDocument {
  id: string;
  type: 'passport' | 'national-id' | 'driving-license' | 'voter-id' | 'other';
  number: string;
  issuedCountry?: string;
  expiryDate?: string;
  notes?: string;
  verifiedAt: string;
}

export interface EarlyCheckInDetail {
  isEarly: boolean;
  approvedBy?: string;
  fee?: number;
  remarks?: string;
}

export interface ChargeItem {
  id: string;
  description: string;
  amount: number;
  category: 'room' | 'mini-bar' | 'restaurant' | 'laundry' | 'late-checkout' | 'early-checkin' | 'other';
  taxAmount?: number;
}

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  timestamp: string;
  collectedBy?: string;
  notes?: string;
}

export interface SettlementSummary {
  roomCharges: number;
  additionalCharges: ChargeItem[];
  taxes: number;
  discounts: number;
  payments: PaymentRecord[];
  balanceDue: number;
  refundDue: number;
  notes?: string;
}

export interface CheckInDetails {
  documents: IdentityDocument[];
  assignedRooms: string[];
  checkInTime: string;
  handledBy?: string;
  earlyCheckIn?: EarlyCheckInDetail;
  remarks?: string;
}

export interface LateCheckoutDetail {
  applied: boolean;
  fee?: number;
  reason?: string;
  approvedBy?: string;
}

export interface CheckOutDetails {
  settlement: SettlementSummary;
  lateCheckout?: LateCheckoutDetail;
  checkOutTime: string;
  handledBy?: string;
  guestFeedback?: string;
}

export interface ReservationInput {
  guestId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  ratePlanId: string;
  source: BookingSource;
  otaSource?: OTASource;
  specialRequests?: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  reservationId: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
  processedBy: string;
  notes?: string;
}

export type TransactionType = 
  | 'room_charge'
  | 'deposit'
  | 'payment'
  | 'refund'
  | 'minibar'
  | 'laundry'
  | 'restaurant'
  | 'spa'
  | 'other';

export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  reservedRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
  todayCheckIns: number;
  todayCheckOuts: number;
  totalRevenue: number;
  expectedRevenue: number;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  room: Room;
  taskType: 'cleaning' | 'maintenance' | 'inspection' | 'turndown';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  assignedStaff?: User;
  estimatedTime: number; // in minutes
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  dateRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
  generatedBy: string;
  data: unknown;
}

export type ReportType = 
  | 'occupancy'
  | 'revenue'
  | 'guest-demographics'
  | 'housekeeping'
  | 'cancellations'
  | 'no-shows';

// POS Types
export type POSMenuCategory = 'food' | 'beverage' | 'dessert' | 'other';

export interface POSMenuItem {
  id: string;
  name: string;
  category: POSMenuCategory;
  price: number;
  description?: string;
  isAvailable: boolean;
  tags?: string[];
  printerRoute?: 'main' | 'bar' | 'dessert';
}

export type POSTableStatus = 'vacant' | 'occupied' | 'reserved' | 'needs-assistance';

export interface POSTable {
  id: string;
  label: string;
  seats: number;
  status: POSTableStatus;
  activeOrderId?: string;
}

export interface POSOrderLine {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'served';
}

export interface POSAppliedCharge {
  type: 'service' | 'discount' | 'tax';
  label: string;
  amount: number;
}

export interface POSPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string;
  reference?: string;
}

export interface POSOrder {
  id: string;
  tableId?: string;
  roomNumber?: string;
  guestName?: string;
  status: 'draft' | 'sent' | 'ready' | 'completed' | 'posted';
  createdAt: string;
  updatedAt: string;
  items: POSOrderLine[];
  kotNumber?: string;
  notes?: string;
  charges: POSAppliedCharge[];
  payments: POSPayment[];
}

export interface KOTTicket {
  id: string;
  kotNumber: string;
  orderId: string;
  tableLabel?: string;
  roomNumber?: string;
  status: 'queued' | 'in-progress' | 'completed';
  items: Array<{ name: string; quantity: number; notes?: string }>;
  createdAt: string;
  printedAt?: string;
}

// Alerts
export type AlertCategory = 'late-checkout' | 'room-not-cleaned' | 'payment-pending' | 'overbooking';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRule {
  id: string;
  category: AlertCategory;
  name: string;
  description: string;
  severity: AlertSeverity;
  isActive: boolean;
}

export interface AlertItem {
  id: string;
  ruleId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ========================================
// Multi-Property & Feature Flags
// ========================================

export interface PropertyGroup {
  id: string;
  name: string;
  description?: string;
  properties: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFeatureFlags {
  nightAuditEnabled: boolean;
  otaIntegrationEnabled: boolean;
  whatsappEnabled: boolean;
  multiPropertyEnabled: boolean;
}

// ========================================
// Night Audit Types
// ========================================

export type NightAuditStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type NightAuditStepType =
  | 'VALIDATE_SHIFT_CLOSURE'
  | 'POST_ROOM_REVENUE'
  | 'PROCESS_NO_SHOWS'
  | 'UPDATE_ROOM_STATUS'
  | 'GENERATE_REPORTS'
  | 'ROLLOVER_DATE';

export interface NightAuditStep {
  type: NightAuditStepType;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface NightAuditSummary {
  totalRoomsOccupied: number;
  totalRevenuePosted: number;
  noShowsProcessed: number;
  roomStatusUpdates: number;
  reportsGenerated: string[];
}

export interface NightAudit {
  id: string;
  hotelId: string;
  hotelCode: string;
  businessDate: string;
  status: NightAuditStatus;
  startedAt?: string;
  completedAt?: string;
  startedBy?: string;
  steps: NightAuditStep[];
  summary?: NightAuditSummary;
  errors?: string[];
  createdAt: string;
  updatedAt: string;
}

// ========================================
// OTA Types
// ========================================

export type OTAProvider = 'BOOKING_COM' | 'EXPEDIA' | 'AIRBNB' | 'MAKEMYTRIP' | 'GOIBIBO';

export type OTAConnectionStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface OTARoomMapping {
  roomTypeId: string;
  otaRoomTypeId: string;
  otaRoomTypeName: string;
}

export interface OTASyncSettings {
  autoSyncRates: boolean;
  autoSyncInventory: boolean;
  autoImportReservations: boolean;
  syncIntervalMinutes: number;
}

export interface OTAChannel {
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
  mappings: OTARoomMapping[];
  syncSettings: OTASyncSettings;
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OTASyncLog {
  id: string;
  hotelId: string;
  hotelCode: string;
  channelId: string;
  provider: OTAProvider;
  syncType: 'RATES' | 'INVENTORY' | 'RESERVATIONS';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  itemsProcessed: number;
  itemsFailed: number;
  details?: Record<string, unknown>;
  error?: string;
  syncedAt: string;
  createdAt: string;
}

export interface OTAReservationImport {
  id: string;
  hotelId: string;
  hotelCode: string;
  provider: OTAProvider;
  otaConfirmationCode: string;
  otaReservationData: Record<string, unknown>;
  importedReservationId?: string;
  status: 'PENDING' | 'IMPORTED' | 'FAILED' | 'DUPLICATE';
  errorMessage?: string;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// WhatsApp Types
// ========================================

export type WhatsAppTemplateType =
  | 'BOOKING_CONFIRMATION'
  | 'CHECKIN_REMINDER'
  | 'CHECKOUT_REMINDER'
  | 'PAYMENT_REMINDER'
  | 'FEEDBACK_REQUEST'
  | 'CUSTOM';

export type WhatsAppMessageStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';

export type WhatsAppProvider = 'TWILIO' | 'META' | 'GUPSHUP' | 'OTHER';

export interface WhatsAppTemplate {
  id: string;
  hotelId: string;
  hotelCode: string;
  type: WhatsAppTemplateType;
  name: string;
  templateId: string;
  language: string;
  category: string;
  parameters: string[];
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  hotelId: string;
  hotelCode: string;
  templateId: string;
  templateType: WhatsAppTemplateType;
  recipientPhone: string;
  recipientName?: string;
  parameters: Record<string, string>;
  status: WhatsAppMessageStatus;
  relatedEntityType?: 'RESERVATION' | 'GUEST' | 'BILL';
  relatedEntityId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorMessage?: string;
  externalMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConfig {
  id: string;
  hotelId: string;
  hotelCode: string;
  isEnabled: boolean;
  provider: WhatsAppProvider;
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
  lastTestStatus?: 'SUCCESS' | 'FAILED';
  lastTestError?: string;
  createdAt: string;
  updatedAt: string;
}

