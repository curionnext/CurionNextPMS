import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { whatsappService } from "../../services/whatsappService.js";

export const whatsappRouter = Router();

/**
 * GET /api/whatsapp/config
 * Get WhatsApp configuration
 */
whatsappRouter.get(
  "/config",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const config = await whatsappService.getConfig(hotelId, hotelCode);
    res.json({ success: true, data: config });
  })
);

/**
 * PUT /api/whatsapp/config
 * Update WhatsApp configuration
 */
whatsappRouter.put(
  "/config",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const config = await whatsappService.upsertConfig(hotelId, hotelCode, req.body);
    res.json({ success: true, data: config });
  })
);

/**
 * POST /api/whatsapp/test-connection
 * Test WhatsApp connection
 */
whatsappRouter.post(
  "/test-connection",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const result = await whatsappService.testConnection(hotelId, hotelCode);
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/whatsapp/templates
 * Get all templates
 */
whatsappRouter.get(
  "/templates",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const templates = await whatsappService.getTemplates(hotelId, hotelCode);
    res.json({ success: true, data: templates });
  })
);

/**
 * GET /api/whatsapp/templates/:id
 * Get specific template
 */
whatsappRouter.get(
  "/templates/:id",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const template = await whatsappService.getTemplateById(id, hotelId);
    res.json({ success: true, data: template });
  })
);

/**
 * POST /api/whatsapp/templates
 * Create new template
 */
whatsappRouter.post(
  "/templates",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const template = await whatsappService.createTemplate(hotelId, hotelCode, req.body);
    res.json({ success: true, data: template });
  })
);

/**
 * PUT /api/whatsapp/templates/:id
 * Update template
 */
whatsappRouter.put(
  "/templates/:id",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const template = await whatsappService.updateTemplate(id, hotelId, req.body);
    res.json({ success: true, data: template });
  })
);

/**
 * DELETE /api/whatsapp/templates/:id
 * Delete template
 */
whatsappRouter.delete(
  "/templates/:id",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    await whatsappService.deleteTemplate(id, hotelId);
    res.json({ success: true, message: "Template deleted" });
  })
);

/**
 * POST /api/whatsapp/send
 * Send WhatsApp message
 */
whatsappRouter.post(
  "/send",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const message = await whatsappService.sendMessage(hotelId, hotelCode, req.body);
    res.json({ success: true, data: message });
  })
);

/**
 * GET /api/whatsapp/messages
 * Get messages
 */
whatsappRouter.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const { status, templateType, relatedEntityId, limit } = req.query;
    
    const messages = await whatsappService.getMessages(hotelId, hotelCode, {
      status: status as any,
      templateType: templateType as any,
      relatedEntityId: relatedEntityId as string,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.json({ success: true, data: messages });
  })
);

/**
 * POST /api/whatsapp/send-booking-confirmation/:reservationId
 * Send booking confirmation
 */
whatsappRouter.post(
  "/send-booking-confirmation/:reservationId",
  asyncHandler(async (req, res) => {
    const { reservationId } = req.params;
    const message = await whatsappService.sendBookingConfirmation(reservationId);
    res.json({ success: true, data: message });
  })
);

/**
 * POST /api/whatsapp/send-checkin-reminder/:reservationId
 * Send check-in reminder
 */
whatsappRouter.post(
  "/send-checkin-reminder/:reservationId",
  asyncHandler(async (req, res) => {
    const { reservationId } = req.params;
    const message = await whatsappService.sendCheckinReminder(reservationId);
    res.json({ success: true, data: message });
  })
);

/**
 * POST /api/whatsapp/process-automated
 * Process automated messages
 */
whatsappRouter.post(
  "/process-automated",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const result = await whatsappService.processAutomatedMessages(hotelId, hotelCode);
    res.json({ success: true, data: result });
  })
);
