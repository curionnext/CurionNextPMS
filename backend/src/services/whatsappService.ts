import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type {
  WhatsAppTemplate,
  WhatsAppTemplateType,
  WhatsAppMessage,
  WhatsAppConfig,
  ReservationRecord,
  GuestRecord
} from "../types/domain.js";

const whatsappTemplatesTable = db.whatsappTemplates;
const whatsappMessagesTable = db.whatsappMessages;
const whatsappConfigTable = db.whatsappConfig;
const reservationsTable = db.reservations;
const guestsTable = db.guests;

const now = () => new Date().toISOString();

/**
 * WhatsApp Service
 * Handles WhatsApp Business API integration:
 * - Template management
 * - Message sending with dynamic parameters
 * - Automated messages for booking lifecycle
 * - Message status tracking
 */
export const whatsappService = {
  /**
   * Get WhatsApp configuration
   */
  async getConfig(hotelId: string, hotelCode: string): Promise<WhatsAppConfig | null> {
    const configs = await whatsappConfigTable.find({ hotelId, hotelCode });
    return configs.length > 0 ? configs[0] : null;
  },

  /**
   * Create or update WhatsApp configuration
   */
  async upsertConfig(
    hotelId: string,
    hotelCode: string,
    input: Omit<WhatsAppConfig, "id" | "hotelId" | "hotelCode" | "createdAt" | "updatedAt">
  ): Promise<WhatsAppConfig> {
    const existing = await this.getConfig(hotelId, hotelCode);

    if (existing) {
      const updated: WhatsAppConfig = {
        ...existing,
        ...input,
        updatedAt: now()
      };
      await whatsappConfigTable.update(existing.id, updated);
      return updated;
    }

    const config: WhatsAppConfig = {
      id: nanoid(),
      hotelId,
      hotelCode,
      ...input,
      createdAt: now(),
      updatedAt: now()
    };

    await whatsappConfigTable.insert(config);
    return config;
  },

  /**
   * Test WhatsApp connection
   */
  async testConnection(hotelId: string, hotelCode: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig(hotelId, hotelCode);

    if (!config) {
      throw new HttpError(404, "WhatsApp configuration not found");
    }

    if (!config.isEnabled) {
      throw new HttpError(400, "WhatsApp is not enabled");
    }

    // Simulate connection test
    // In production, this would make actual API call to WhatsApp Business API
    const hasValidCredentials =
      (config.provider === "TWILIO" && config.credentials.accountSid && config.credentials.authToken) ||
      (config.provider === "META" && config.credentials.accessToken && config.credentials.phoneNumberId) ||
      (config.provider === "GUPSHUP" && config.credentials.apiKey);

    if (!hasValidCredentials) {
      config.lastTestStatus = "FAILED";
      config.lastTestError = "Invalid credentials";
      config.lastTestedAt = now();
      config.updatedAt = now();
      await whatsappConfigTable.update(config.id, config);

      return {
        success: false,
        message: "Invalid credentials configuration"
      };
    }

    config.lastTestStatus = "SUCCESS";
    config.lastTestError = undefined;
    config.lastTestedAt = now();
    config.updatedAt = now();
    await whatsappConfigTable.update(config.id, config);

    return {
      success: true,
      message: "Successfully connected to WhatsApp Business API"
    };
  },

  /**
   * Get all templates
   */
  async getTemplates(hotelId: string, hotelCode: string): Promise<WhatsAppTemplate[]> {
    return await whatsappTemplatesTable.find({ hotelId, hotelCode });
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string, hotelId: string): Promise<WhatsAppTemplate> {
    const template = await whatsappTemplatesTable.findById(id);
    if (!template || template.hotelId !== hotelId) {
      throw new HttpError(404, "Template not found");
    }
    return template;
  },

  /**
   * Create template
   */
  async createTemplate(
    hotelId: string,
    hotelCode: string,
    input: Omit<WhatsAppTemplate, "id" | "hotelId" | "hotelCode" | "createdAt" | "updatedAt">
  ): Promise<WhatsAppTemplate> {
    const template: WhatsAppTemplate = {
      id: nanoid(),
      hotelId,
      hotelCode,
      ...input,
      createdAt: now(),
      updatedAt: now()
    };

    await whatsappTemplatesTable.insert(template);
    return template;
  },

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    hotelId: string,
    updates: Partial<Omit<WhatsAppTemplate, "id" | "hotelId" | "hotelCode" | "createdAt">>
  ): Promise<WhatsAppTemplate> {
    const template = await this.getTemplateById(id, hotelId);

    const updated: WhatsAppTemplate = {
      ...template,
      ...updates,
      updatedAt: now()
    };

    await whatsappTemplatesTable.update(id, updated);
    return updated;
  },

  /**
   * Delete template
   */
  async deleteTemplate(id: string, hotelId: string): Promise<void> {
    await this.getTemplateById(id, hotelId);
    await whatsappTemplatesTable.delete(id);
  },

  /**
   * Send message
   */
  async sendMessage(
    hotelId: string,
    hotelCode: string,
    input: {
      templateId: string;
      recipientPhone: string;
      recipientName?: string;
      parameters: Record<string, string>;
      relatedEntityType?: "RESERVATION" | "GUEST" | "BILL";
      relatedEntityId?: string;
    }
  ): Promise<WhatsAppMessage> {
    const config = await this.getConfig(hotelId, hotelCode);
    if (!config || !config.isEnabled) {
      throw new HttpError(400, "WhatsApp is not enabled for this property");
    }

    const template = await this.getTemplateById(input.templateId, hotelId);
    if (!template.isActive) {
      throw new HttpError(400, "Template is not active");
    }

    // Validate parameters
    for (const param of template.parameters) {
      if (!input.parameters[param]) {
        throw new HttpError(400, `Missing required parameter: ${param}`);
      }
    }

    const message: WhatsAppMessage = {
      id: nanoid(),
      hotelId,
      hotelCode,
      templateId: template.id,
      templateType: template.type,
      recipientPhone: input.recipientPhone,
      recipientName: input.recipientName,
      parameters: input.parameters,
      status: "QUEUED",
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      createdAt: now(),
      updatedAt: now()
    };

    await whatsappMessagesTable.insert(message);

    // Simulate sending (in production, this would call WhatsApp API)
    setTimeout(async () => {
      try {
        await this.updateMessageStatus(message.id, "SENT");
      } catch (err) {
        // Log error but don't crash — message is already queued
        console.error(`[WhatsApp] Failed to update message status for ${message.id}:`, err);
        try {
          await this.updateMessageStatus(message.id, "FAILED");
        } catch {
          // Best-effort failure recording
        }
      }
    }, 1000);

    return message;
  },

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: WhatsAppMessage["status"],
    errorMessage?: string
  ): Promise<void> {
    const message = await whatsappMessagesTable.findById(messageId);
    if (!message) return;

    message.status = status;
    message.updatedAt = now();

    if (status === "SENT") {
      message.sentAt = now();
    } else if (status === "DELIVERED") {
      message.deliveredAt = now();
    } else if (status === "READ") {
      message.readAt = now();
    } else if (status === "FAILED") {
      message.failedAt = now();
      message.errorMessage = errorMessage;
    }

    await whatsappMessagesTable.update(messageId, message);
  },

  /**
   * Get messages
   */
  async getMessages(
    hotelId: string,
    hotelCode: string,
    filters?: {
      status?: WhatsAppMessage["status"];
      templateType?: WhatsAppTemplateType;
      relatedEntityId?: string;
      limit?: number;
    }
  ): Promise<WhatsAppMessage[]> {
    let messages = await whatsappMessagesTable.find({ hotelId, hotelCode });

    if (filters?.status) {
      messages = messages.filter(m => m.status === filters.status);
    }

    if (filters?.templateType) {
      messages = messages.filter(m => m.templateType === filters.templateType);
    }

    if (filters?.relatedEntityId) {
      messages = messages.filter(m => m.relatedEntityId === filters.relatedEntityId);
    }

    messages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (filters?.limit) {
      messages = messages.slice(0, filters.limit);
    }

    return messages;
  },

  /**
   * Send booking confirmation (automated)
   */
  async sendBookingConfirmation(reservationId: string): Promise<WhatsAppMessage | null> {
    const reservation = await reservationsTable.findById(reservationId);
    if (!reservation) return null;

    const guest = await guestsTable.findById(reservation.guestId);
    if (!guest || !guest.phone) return null;

    const config = await this.getConfig(reservation.hotelId, reservation.hotelCode);
    if (!config || !config.isEnabled || !config.automationSettings.sendBookingConfirmation) {
      return null;
    }

    const templates = await this.getTemplates(reservation.hotelId, reservation.hotelCode);
    const template = templates.find(t => t.type === "BOOKING_CONFIRMATION" && t.isActive);

    if (!template) return null;

    const parameters: Record<string, string> = {
      guestName: `${guest.firstName} ${guest.lastName || ""}`.trim(),
      confirmationNumber: reservation.id.slice(0, 8).toUpperCase(),
      checkInDate: new Date(reservation.arrivalDate).toLocaleDateString(),
      checkOutDate: new Date(reservation.departureDate).toLocaleDateString(),
      roomType: reservation.roomType,
      hotelName: reservation.hotelCode
    };

    return await this.sendMessage(reservation.hotelId, reservation.hotelCode, {
      templateId: template.id,
      recipientPhone: guest.phone,
      recipientName: parameters.guestName,
      parameters,
      relatedEntityType: "RESERVATION",
      relatedEntityId: reservation.id
    });
  },

  /**
   * Send check-in reminder (automated)
   */
  async sendCheckinReminder(reservationId: string): Promise<WhatsAppMessage | null> {
    const reservation = await reservationsTable.findById(reservationId);
    if (!reservation || reservation.status !== "CONFIRMED") return null;

    const guest = await guestsTable.findById(reservation.guestId);
    if (!guest || !guest.phone) return null;

    const config = await this.getConfig(reservation.hotelId, reservation.hotelCode);
    if (!config || !config.isEnabled || !config.automationSettings.sendCheckinReminder) {
      return null;
    }

    const templates = await this.getTemplates(reservation.hotelId, reservation.hotelCode);
    const template = templates.find(t => t.type === "CHECKIN_REMINDER" && t.isActive);

    if (!template) return null;

    const parameters: Record<string, string> = {
      guestName: `${guest.firstName} ${guest.lastName || ""}`.trim(),
      checkInDate: new Date(reservation.arrivalDate).toLocaleDateString(),
      checkInTime: "2:00 PM",
      hotelName: reservation.hotelCode
    };

    return await this.sendMessage(reservation.hotelId, reservation.hotelCode, {
      templateId: template.id,
      recipientPhone: guest.phone,
      recipientName: parameters.guestName,
      parameters,
      relatedEntityType: "RESERVATION",
      relatedEntityId: reservation.id
    });
  },

  /**
   * Process automated messages (should be called by scheduler)
   */
  async processAutomatedMessages(hotelId: string, hotelCode: string): Promise<{
    sent: number;
    skipped: number;
  }> {
    const config = await this.getConfig(hotelId, hotelCode);
    if (!config || !config.isEnabled) {
      return { sent: 0, skipped: 0 };
    }

    let sent = 0;
    let skipped = 0;

    // Get upcoming check-ins
    if (config.automationSettings.sendCheckinReminder) {
      const hoursBeforeCheckin = config.automationSettings.checkinReminderHoursBefore;
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + hoursBeforeCheckin);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const upcomingReservations = await reservationsTable.find({
        hotelId,
        hotelCode,
        status: "CONFIRMED",
        arrivalDate: targetDateStr
      });

      for (const reservation of upcomingReservations) {
        // Check if reminder already sent
        const existingMessage = await whatsappMessagesTable.findOne({
          hotelId,
          relatedEntityId: reservation.id,
          templateType: "CHECKIN_REMINDER"
        });

        if (!existingMessage) {
          const message = await this.sendCheckinReminder(reservation.id);
          if (message) sent++;
          else skipped++;
        }
      }
    }

    return { sent, skipped };
  }
};
