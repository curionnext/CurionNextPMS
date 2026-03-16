import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { multiPropertyService } from "../../services/multiPropertyService.js";

export const multiPropertyRouter = Router();

/**
 * GET /api/multi-property/groups
 * Get all property groups
 */
multiPropertyRouter.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const groups = await multiPropertyService.getPropertyGroups();
    res.json({ success: true, data: groups });
  })
);

/**
 * GET /api/multi-property/groups/:id
 * Get specific group
 */
multiPropertyRouter.get(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const group = await multiPropertyService.getPropertyGroupById(id);
    res.json({ success: true, data: group });
  })
);

/**
 * POST /api/multi-property/groups
 * Create property group
 */
multiPropertyRouter.post(
  "/groups",
  asyncHandler(async (req, res) => {
    const { name, description, properties } = req.body;
    const group = await multiPropertyService.createPropertyGroup({
      name,
      description,
      properties
    });
    res.json({ success: true, data: group });
  })
);

/**
 * PUT /api/multi-property/groups/:id
 * Update property group
 */
multiPropertyRouter.put(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const group = await multiPropertyService.updatePropertyGroup(id, req.body);
    res.json({ success: true, data: group });
  })
);

/**
 * DELETE /api/multi-property/groups/:id
 * Delete property group
 */
multiPropertyRouter.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await multiPropertyService.deletePropertyGroup(id);
    res.json({ success: true, message: "Group deleted" });
  })
);

/**
 * GET /api/multi-property/properties
 * Get all properties
 */
multiPropertyRouter.get(
  "/properties",
  asyncHandler(async (req, res) => {
    const properties = await multiPropertyService.getAllProperties();
    res.json({ success: true, data: properties });
  })
);

/**
 * GET /api/multi-property/properties/:hotelId
 * Get specific property
 */
multiPropertyRouter.get(
  "/properties/:hotelId",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const property = await multiPropertyService.getPropertyById(hotelId);
    res.json({ success: true, data: property });
  })
);

/**
 * GET /api/multi-property/groups/:id/properties
 * Get properties in a group
 */
multiPropertyRouter.get(
  "/groups/:id/properties",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const properties = await multiPropertyService.getPropertiesInGroup(id);
    res.json({ success: true, data: properties });
  })
);

/**
 * GET /api/multi-property/properties/:hotelId/features
 * Get property features
 */
multiPropertyRouter.get(
  "/properties/:hotelId/features",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const features = await multiPropertyService.getPropertyFeatures(hotelId);
    res.json({ success: true, data: features });
  })
);

/**
 * PUT /api/multi-property/properties/:hotelId/features
 * Update property features
 */
multiPropertyRouter.put(
  "/properties/:hotelId/features",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const features = await multiPropertyService.updatePropertyFeatures(hotelId, req.body);
    res.json({ success: true, data: features });
  })
);

/**
 * GET /api/multi-property/stats
 * Get multi-property statistics
 */
multiPropertyRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await multiPropertyService.getMultiPropertyStats();
    res.json({ success: true, data: stats });
  })
);

/**
 * POST /api/multi-property/switch/:hotelId
 * Switch to different property
 */
multiPropertyRouter.post(
  "/switch/:hotelId",
  asyncHandler(async (req, res) => {
    const { hotelId } = req.params;
    const property = await multiPropertyService.switchProperty(hotelId);
    res.json({ success: true, data: property });
  })
);
