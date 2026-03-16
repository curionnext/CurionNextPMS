import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
    createVendor,
    getVendors,
    createPurchaseOrder,
    getPurchaseOrders,
    updatePurchaseOrderStatus,
    receivePurchaseOrder
} from "../../services/purchasingService.js";

const BACK_OFFICE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const;

export const purchasingRouter = Router();

const createVendorSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        paymentTerms: z.string().optional(),
        taxStatus: z.string().optional(),
        notes: z.string().optional()
    })
});

const createPOSchema = z.object({
    body: z.object({
        vendorId: z.string().min(1),
        expectedDelivery: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
            itemId: z.string().min(1),
            quantityOrdered: z.number().min(1),
            quantityReceived: z.number().default(0),
            unitPrice: z.number().min(0),
            taxAmount: z.number().min(0)
        })).min(1)
    })
});

const updatePOStatusSchema = z.object({
    body: z.object({
        status: z.enum(["APPROVED", "SENT", "CANCELLED"])
    })
});

const receivePOSchema = z.object({
    body: z.object({
        storeId: z.string().min(1),
        receivedItems: z.array(z.object({
            itemId: z.string().min(1),
            quantityReceived: z.number().min(1)
        })).min(1)
    })
});

purchasingRouter.get(
    "/vendors",
    authenticate,
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const vendors = await getVendors(hotelCode);
        res.json({ vendors });
    })
);

purchasingRouter.post(
    "/vendors",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(createVendorSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const vendor = await createVendor(hotelCode, { hotelId: hotelCode, hotelCode, isActive: true, ...req.body });
        res.status(201).json({ vendor });
    })
);

purchasingRouter.get(
    "/orders",
    authenticate,
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const orders = await getPurchaseOrders(hotelCode);
        res.json({ orders });
    })
);

purchasingRouter.post(
    "/orders",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(createPOSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const order = await createPurchaseOrder(
            hotelCode,
            req.body.vendorId,
            req.body.items,
            req.body.expectedDelivery,
            req.body.notes
        );
        res.status(201).json({ order });
    })
);

purchasingRouter.put(
    "/orders/:id/status",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(updatePOStatusSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const order = await updatePurchaseOrderStatus(hotelCode, req.params.id, req.body.status);
        res.json({ order });
    })
);

purchasingRouter.post(
    "/orders/:id/receive",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(receivePOSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const order = await receivePurchaseOrder(
            hotelCode,
            req.params.id,
            req.body.storeId,
            req.body.receivedItems,
            req.user!.userId
        );
        res.json({ order });
    })
);
