import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { OTAAdapterRegistry, type RatePushData, type InventoryPushData } from "./adapters/index.js";
import type {
  OTAChannelConfig,
  OTAProvider,
  OTAReservationImport,
  OTASyncLog,
  ReservationRecord,
  GuestRecord
} from "../types/domain.js";

const otaChannelsTable = db.otaChannels;
const otaReservationImportsTable = db.otaReservationImports;
const otaSyncLogsTable = db.otaSyncLogs;
const reservationsTable = db.reservations;
const guestsTable = db.guests;
const roomTypesTable = db.roomTypes;

const now = () => new Date().toISOString();

/**
 * OTA Service
 * Handles integration with Online Travel Agencies:
 * - Channel configuration and mapping
 * - Rate and inventory synchronization
 * - Reservation import from OTAs
 * - Two-way sync with booking engines
 */
export const otaService = {
  /**
   * Get all OTA channels for a hotel
   */
  async getChannels(hotelId: string, hotelCode: string): Promise<OTAChannelConfig[]> {
    return await otaChannelsTable.find({ hotelId, hotelCode });
  },

  /**
   * Get a specific OTA channel
   */
  async getChannelById(id: string, hotelId: string): Promise<OTAChannelConfig> {
    const channel = await otaChannelsTable.findById(id);
    if (!channel || channel.hotelId !== hotelId) {
      throw new HttpError(404, "OTA channel not found");
    }
    return channel;
  },

  /**
   * Create a new OTA channel configuration
   */
  async createChannel(
    hotelId: string,
    hotelCode: string,
    input: {
      provider: OTAProvider;
      credentials: OTAChannelConfig["credentials"];
      mappings: OTAChannelConfig["mappings"];
      syncSettings: OTAChannelConfig["syncSettings"];
    }
  ): Promise<OTAChannelConfig> {
    // Validate room type mappings
    for (const mapping of input.mappings) {
      const roomType = await roomTypesTable.findOne({
        id: mapping.roomTypeId,
        hotelId,
        hotelCode
      });
      if (!roomType) {
        throw new HttpError(400, `Room type ${mapping.roomTypeId} not found`);
      }
    }

    const channel: OTAChannelConfig = {
      id: nanoid(),
      hotelId,
      hotelCode,
      provider: input.provider,
      status: "INACTIVE",
      credentials: input.credentials,
      mappings: input.mappings,
      syncSettings: input.syncSettings,
      createdAt: now(),
      updatedAt: now()
    };

    await otaChannelsTable.insert(channel);
    return channel;
  },

  /**
   * Update OTA channel configuration
   */
  async updateChannel(
    id: string,
    hotelId: string,
    updates: Partial<Omit<OTAChannelConfig, "id" | "hotelId" | "hotelCode" | "createdAt">>
  ): Promise<OTAChannelConfig> {
    const channel = await this.getChannelById(id, hotelId);

    // Validate mappings if updated
    if (updates.mappings) {
      for (const mapping of updates.mappings) {
        const roomType = await roomTypesTable.findOne({
          id: mapping.roomTypeId,
          hotelId,
          hotelCode: channel.hotelCode
        });
        if (!roomType) {
          throw new HttpError(400, `Room type ${mapping.roomTypeId} not found`);
        }
      }
    }

    const updated: OTAChannelConfig = {
      ...channel,
      ...updates,
      updatedAt: now()
    };

    await otaChannelsTable.update(id, updated);
    return updated;
  },

  /**
   * Delete OTA channel
   */
  async deleteChannel(id: string, hotelId: string): Promise<void> {
    const channel = await this.getChannelById(id, hotelId);
    await otaChannelsTable.delete(id);
  },

  /**
   * Test OTA connection using adapter
   */
  async testConnection(id: string, hotelId: string): Promise<{ success: boolean; message: string }> {
    const channel = await this.getChannelById(id, hotelId);

    try {
      // Get appropriate adapter
      const adapter = OTAAdapterRegistry.getAdapter(channel.provider);

      // Test connection using adapter
      const result = await adapter.testConnection(channel.credentials);

      if (result.success) {
        // Update channel status
        channel.status = "ACTIVE";
        channel.lastSyncAt = now();
        channel.lastError = undefined;
        channel.updatedAt = now();
        await otaChannelsTable.update(id, channel);
      } else {
        channel.status = "ERROR";
        channel.lastError = result.message;
        channel.updatedAt = now();
        await otaChannelsTable.update(id, channel);
      }

      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection test failed";
      channel.status = "ERROR";
      channel.lastError = errorMessage;
      channel.updatedAt = now();
      await otaChannelsTable.update(id, channel);

      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Sync rates to OTA using adapter
   */
  async syncRates(
    channelId: string,
    hotelId: string,
    dateRange: { from: string; to: string }
  ): Promise<OTASyncLog> {
    const channel = await this.getChannelById(channelId, hotelId);

    if (channel.status !== "ACTIVE") {
      throw new HttpError(400, "Channel is not active");
    }

    try {
      // Get appropriate adapter
      const adapter = OTAAdapterRegistry.getAdapter(channel.provider);

      // Get room types to fetch rates
      const roomTypes = await roomTypesTable.find({ hotelId, hotelCode: channel.hotelCode });

      // Prepare rate data
      const dates = this.getDateRange(dateRange.from, dateRange.to);
      const ratePushData: RatePushData[] = [];

      for (const date of dates) {
        for (const mapping of channel.mappings) {
          const roomType = roomTypes.find(rt => rt.id === mapping.roomTypeId);
          if (roomType) {
            ratePushData.push({
              date,
              roomTypeId: mapping.roomTypeId,
              otaRoomTypeId: mapping.otaRoomTypeId,
              rate: roomType.baseRate,
              currency: "INR",
              minStay: 1,
              closedToArrival: false,
              closedToDeparture: false
            });
          }
        }
      }

      // Push rates using adapter
      const result = await adapter.pushRates(channel.credentials, channel.mappings, ratePushData);

      const syncLog: OTASyncLog = {
        id: nanoid(),
        hotelId,
        hotelCode: channel.hotelCode,
        channelId: channel.id,
        provider: channel.provider,
        syncType: "RATES",
        status: result.success ? "SUCCESS" : (result.itemsFailed < result.itemsProcessed ? "PARTIAL" : "FAILED"),
        itemsProcessed: result.itemsProcessed,
        itemsFailed: result.itemsFailed,
        details: { dateRange, errors: result.errors },
        error: result.errors && result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
        syncedAt: now(),
        createdAt: now()
      };

      await otaSyncLogsTable.insert(syncLog);

      // Update channel
      channel.lastSyncAt = now();
      channel.lastError = syncLog.error;
      channel.updatedAt = now();
      await otaChannelsTable.update(channelId, channel);

      return syncLog;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Rate sync failed";

      const syncLog: OTASyncLog = {
        id: nanoid(),
        hotelId,
        hotelCode: channel.hotelCode,
        channelId: channel.id,
        provider: channel.provider,
        syncType: "RATES",
        status: "FAILED",
        itemsProcessed: 0,
        itemsFailed: 0,
        error: errorMsg,
        syncedAt: now(),
        createdAt: now()
      };

      await otaSyncLogsTable.insert(syncLog);
      throw error;
    }
  },

  /**
   * Sync inventory to OTA using adapter
   */
  async syncInventory(
    channelId: string,
    hotelId: string,
    dateRange: { from: string; to: string }
  ): Promise<OTASyncLog> {
    const channel = await this.getChannelById(channelId, hotelId);

    if (channel.status !== "ACTIVE") {
      throw new HttpError(400, "Channel is not active");
    }

    try {
      // Get appropriate adapter
      const adapter = OTAAdapterRegistry.getAdapter(channel.provider);

      // Get rooms for availability calculation
      const roomsTable = db.rooms;
      const rooms = await roomsTable.find({ hotelId, hotelCode: channel.hotelCode });

      // Prepare inventory data
      const dates = this.getDateRange(dateRange.from, dateRange.to);
      const inventoryPushData: InventoryPushData[] = [];

      for (const date of dates) {
        for (const mapping of channel.mappings) {
          // Calculate availability for this room type
          const roomsOfType = rooms.filter(r => r.roomTypeId === mapping.roomTypeId);
          const available = roomsOfType.filter(r => r.status === "AVAILABLE").length;
          const occupied = roomsOfType.filter(r => r.status === "OCCUPIED").length;
          const blocked = roomsOfType.filter(r => r.status === "OUT_OF_ORDER").length;
          const sold = occupied;

          inventoryPushData.push({
            date,
            roomTypeId: mapping.roomTypeId,
            otaRoomTypeId: mapping.otaRoomTypeId,
            available,
            sold,
            blocked
          });
        }
      }

      // Push inventory using adapter
      const result = await adapter.pushInventory(channel.credentials, channel.mappings, inventoryPushData);

      const syncLog: OTASyncLog = {
        id: nanoid(),
        hotelId,
        hotelCode: channel.hotelCode,
        channelId: channel.id,
        provider: channel.provider,
        syncType: "INVENTORY",
        status: result.success ? "SUCCESS" : (result.itemsFailed < result.itemsProcessed ? "PARTIAL" : "FAILED"),
        itemsProcessed: result.itemsProcessed,
        itemsFailed: result.itemsFailed,
        details: { dateRange, errors: result.errors },
        error: result.errors && result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
        syncedAt: now(),
        createdAt: now()
      };

      await otaSyncLogsTable.insert(syncLog);

      channel.lastSyncAt = now();
      channel.lastError = syncLog.error;
      channel.updatedAt = now();
      await otaChannelsTable.update(channelId, channel);

      return syncLog;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Inventory sync failed";

      const syncLog: OTASyncLog = {
        id: nanoid(),
        hotelId,
        hotelCode: channel.hotelCode,
        channelId: channel.id,
        provider: channel.provider,
        syncType: "INVENTORY",
        status: "FAILED",
        itemsProcessed: 0,
        itemsFailed: 0,
        error: errorMsg,
        syncedAt: now(),
        createdAt: now()
      };

      await otaSyncLogsTable.insert(syncLog);
      throw error;
    }
  },

  /**
   * Import reservation from OTA
   */
  async importReservation(
    channelId: string,
    hotelId: string,
    otaReservationData: Record<string, unknown>
  ): Promise<ReservationRecord> {
    const channel = await this.getChannelById(channelId, hotelId);

    const otaConfirmationCode = String(otaReservationData.confirmationCode || nanoid());

    // Check for duplicate
    const existing = await otaReservationImportsTable.findOne({
      hotelId,
      provider: channel.provider,
      otaConfirmationCode
    });

    if (existing && existing.status === "IMPORTED") {
      throw new HttpError(400, `Reservation ${otaConfirmationCode} already imported`);
    }

    // Parse OTA reservation data
    const guestData = otaReservationData.guest as Record<string, unknown>;
    const reservationData = otaReservationData.reservation as Record<string, unknown>;

    // Create or find guest
    let guest = await guestsTable.findOne({
      hotelId,
      email: String(guestData.email || ""),
      phone: String(guestData.phone || "")
    });

    if (!guest) {
      guest = {
        id: nanoid(),
        hotelId,
        hotelCode: channel.hotelCode,
        firstName: String(guestData.firstName || "Guest"),
        lastName: String(guestData.lastName || ""),
        email: String(guestData.email || ""),
        phone: String(guestData.phone || ""),
        visitCount: 0,
        stayHistory: [],
        idDocuments: [],
        createdAt: now(),
        updatedAt: now()
      };
      await guestsTable.insert(guest);
    }

    // Find room type mapping
    const otaRoomTypeId = String(reservationData.roomTypeId || "");
    const mapping = channel.mappings.find(m => m.otaRoomTypeId === otaRoomTypeId);

    if (!mapping) {
      throw new HttpError(400, `No mapping found for OTA room type ${otaRoomTypeId}`);
    }

    const roomType = await roomTypesTable.findById(mapping.roomTypeId);
    if (!roomType) {
      throw new HttpError(400, "Mapped room type not found");
    }

    // Create reservation
    const reservation: ReservationRecord = {
      id: nanoid(),
      hotelId,
      hotelCode: channel.hotelCode,
      guestId: guest.id,
      roomType: roomType.name,
      status: "CONFIRMED",
      arrivalDate: String(reservationData.checkIn || new Date().toISOString().split("T")[0]),
      departureDate: String(reservationData.checkOut || new Date().toISOString().split("T")[0]),
      adults: Number(reservationData.adults || 1),
      children: Number(reservationData.children || 0),
      nightlyRate: Number(reservationData.rate || roomType.baseRate),
      ratePlan: "BAR",
      source: "OTA",
      otaReference: otaConfirmationCode,
      isWalkIn: false,
      notes: `Imported from ${channel.provider}`,
      billing: (() => {
        const arrivalDate = String(reservationData.checkIn || new Date().toISOString().split("T")[0]);
        const departureDate = String(reservationData.checkOut || new Date().toISOString().split("T")[0]);
        const nightlyRate = Number(reservationData.rate || roomType.baseRate);
        const arrivalMs = new Date(arrivalDate).getTime();
        const departureMs = new Date(departureDate).getTime();
        const nights = Math.max(1, Math.ceil((departureMs - arrivalMs) / (1000 * 60 * 60 * 24)));
        const totalAmount = nightlyRate * nights;
        return {
          currency: "INR",
          totalAmount,
          balanceDue: totalAmount,
          charges: [{
            description: `Room charge (${nights} night${nights > 1 ? "s" : ""})`,
            amount: totalAmount
          }]
        };
      })(),
      createdAt: now(),
      updatedAt: now()
    };

    await reservationsTable.insert(reservation);

    // Record import
    const importRecord: OTAReservationImport = {
      id: nanoid(),
      hotelId,
      hotelCode: channel.hotelCode,
      provider: channel.provider,
      otaConfirmationCode,
      otaReservationData,
      importedReservationId: reservation.id,
      status: "IMPORTED",
      importedAt: now(),
      createdAt: now(),
      updatedAt: now()
    };

    await otaReservationImportsTable.insert(importRecord);

    return reservation;
  },

  /**
   * Get sync logs
   */
  async getSyncLogs(
    hotelId: string,
    hotelCode: string,
    filters?: { channelId?: string; syncType?: OTASyncLog["syncType"]; limit?: number }
  ): Promise<OTASyncLog[]> {
    let logs = await otaSyncLogsTable.find({ hotelId, hotelCode });

    if (filters?.channelId) {
      logs = logs.filter(log => log.channelId === filters.channelId);
    }

    if (filters?.syncType) {
      logs = logs.filter(log => log.syncType === filters.syncType);
    }

    logs.sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  },

  /**
   * Get imported reservations
   */
  async getImportedReservations(
    hotelId: string,
    hotelCode: string,
    provider?: OTAProvider
  ): Promise<OTAReservationImport[]> {
    let imports = await otaReservationImportsTable.find({ hotelId, hotelCode });

    if (provider) {
      imports = imports.filter(imp => imp.provider === provider);
    }

    return imports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /**
   * Helper: Calculate days between dates
   */
  getDaysBetween(from: string, to: string): number {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Helper: Get array of dates in range
   */
  getDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);

    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
};
