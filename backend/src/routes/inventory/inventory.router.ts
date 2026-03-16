import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
    createCategory,
    getCategories,
    createItem,
    getItems,
    createStore,
    getStores,
    getStockLedger,
    recordTransaction
} from "../../services/inventoryService.js";

const BACK_OFFICE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const;

export const inventoryRouter = Router();

const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1),
        description: z.string().optional()
    })
});

const createItemSchema = z.object({
    body: z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        categoryId: z.string().min(1),
        unitOfMeasure: z.string().min(1),
        averageCost: z.number().min(0),
        parLevel: z.number().min(0),
        reorderQuantity: z.number().min(1)
    })
});

const createStoreSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        type: z.enum(["MAIN_STORE", "DEPARTMENTAL", "OUTLET"]),
        description: z.string().optional()
    })
});

const transactionSchema = z.object({
    body: z.object({
        itemId: z.string().min(1),
        storeId: z.string().min(1),
        type: z.enum(["RECEIPT", "TRANSFER", "CONSUMPTION", "ADJUSTMENT"]),
        quantityDelta: z.number().refine(val => val !== 0, {
            message: "Delta cannot be zero",
        }),
        referenceId: z.string().optional(),
        notes: z.string().optional()
    })
});

inventoryRouter.get(
    "/categories",
    authenticate,
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const categories = await getCategories(hotelCode);
        res.json({ categories });
    })
);

inventoryRouter.post(
    "/categories",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(createCategorySchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const category = await createCategory(hotelCode, req.body.name, req.body.description);
        res.status(201).json({ category });
    })
);

inventoryRouter.get(
    "/items",
    authenticate,
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const items = await getItems(hotelCode);
        res.json({ items });
    })
);

inventoryRouter.post(
    "/items",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(createItemSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const item = await createItem({ hotelId: hotelCode, hotelCode, ...req.body, isActive: true });
        res.status(201).json({ item });
    })
);

inventoryRouter.get(
    "/stores",
    authenticate,
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const stores = await getStores(hotelCode);
        res.json({ stores });
    })
);

inventoryRouter.post(
    "/stores",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(createStoreSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const store = await createStore(hotelCode, req.body.name, req.body.type, req.body.description);
        res.status(201).json({ store });
    })
);

inventoryRouter.get(
    "/ledger",
    authenticate,
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const storeId = req.query.storeId as string | undefined;
        const ledger = await getStockLedger(hotelCode, storeId);
        res.json({ ledger });
    })
);

inventoryRouter.post(
    "/transactions",
    authenticate,
    authorize([...BACK_OFFICE_ROLES]),
    validateRequest(transactionSchema),
    asyncHandler(async (req, res) => {
        const hotelCode = req.user!.hotelCode;
        const result = await recordTransaction(
            hotelCode,
            req.body.itemId,
            req.body.storeId,
            req.body.type,
            req.body.quantityDelta,
            req.user!.userId,
            req.body.referenceId,
            req.body.notes
        );
        res.status(201).json(result);
    })
);
