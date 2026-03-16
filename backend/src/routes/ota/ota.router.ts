import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { otaService } from "../../services/otaService.js";

export const otaRouter = Router();

/**
 * GET /api/ota/channels
 * Get all OTA channels
 */
otaRouter.get(
  "/channels",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const channels = await otaService.getChannels(hotelId, hotelCode);
    res.json({ success: true, data: channels });
  })
);

/**
 * GET /api/ota/channels/:id
 * Get specific channel
 */
otaRouter.get(
  "/channels/:id",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const channel = await otaService.getChannelById(id, hotelId);
    res.json({ success: true, data: channel });
  })
);

/**
 * POST /api/ota/channels
 * Create new OTA channel
 */
otaRouter.post(
  "/channels",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const { provider, credentials, mappings, syncSettings } = req.body;
    
    const channel = await otaService.createChannel(hotelId, hotelCode, {
      provider,
      credentials,
      mappings,
      syncSettings
    });
    
    res.json({ success: true, data: channel });
  })
);

/**
 * PUT /api/ota/channels/:id
 * Update OTA channel
 */
otaRouter.put(
  "/channels/:id",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const updates = req.body;
    
    const channel = await otaService.updateChannel(id, hotelId, updates);
    res.json({ success: true, data: channel });
  })
);

/**
 * DELETE /api/ota/channels/:id
 * Delete OTA channel
 */
otaRouter.delete(
  "/channels/:id",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    await otaService.deleteChannel(id, hotelId);
    res.json({ success: true, message: "Channel deleted" });
  })
);

/**
 * POST /api/ota/channels/:id/test
 * Test OTA connection
 */
otaRouter.post(
  "/channels/:id/test",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const result = await otaService.testConnection(id, hotelId);
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/ota/channels/:id/sync-rates
 * Sync rates to OTA
 */
otaRouter.post(
  "/channels/:id/sync-rates",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const { from, to } = req.body;
    
    const syncLog = await otaService.syncRates(id, hotelId, { from, to });
    res.json({ success: true, data: syncLog });
  })
);

/**
 * POST /api/ota/channels/:id/sync-inventory
 * Sync inventory to OTA
 */
otaRouter.post(
  "/channels/:id/sync-inventory",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const { from, to } = req.body;
    
    const syncLog = await otaService.syncInventory(id, hotelId, { from, to });
    res.json({ success: true, data: syncLog });
  })
);

/**
 * POST /api/ota/channels/:id/import-reservation
 * Import reservation from OTA
 */
otaRouter.post(
  "/channels/:id/import-reservation",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.user!;
    const { id } = req.params;
    const { otaReservationData } = req.body;
    
    const reservation = await otaService.importReservation(id, hotelId, otaReservationData);
    res.json({ success: true, data: reservation });
  })
);

/**
 * GET /api/ota/sync-logs
 * Get sync logs
 */
otaRouter.get(
  "/sync-logs",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const { channelId, syncType, limit } = req.query;
    
    const logs = await otaService.getSyncLogs(hotelId, hotelCode, {
      channelId: channelId as string,
      syncType: syncType as any,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    res.json({ success: true, data: logs });
  })
);

/**
 * GET /api/ota/imported-reservations
 * Get imported reservations
 */
otaRouter.get(
  "/imported-reservations",
  asyncHandler(async (req, res) => {
    const { hotelId, hotelCode } = req.user!;
    const { provider } = req.query;
    
    const imports = await otaService.getImportedReservations(
      hotelId, 
      hotelCode, 
      provider as any
    );
    
    res.json({ success: true, data: imports });
  })
);
