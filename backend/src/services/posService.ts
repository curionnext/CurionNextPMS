import { nanoid } from "nanoid";
import { HttpError } from "../middlewares/errorHandler.js";
import { db } from "../db/index.js";
import type {
  KitchenTicketRecord,
  MenuItemRecord,
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  ReservationRecord
} from "../types/domain.js";
import { addAddonCharge } from "./billingService.js";

const menuTable = db.menu;
const ordersTable = db.orders;
const kitchenTable = db.kitchenTickets;
const reservationsTable = db.reservations;

const now = () => new Date().toISOString();

const ensureMenuItem = async (id: string) => {
  const menuItem = await menuTable.getById(id);

  if (!menuItem) {
    throw new HttpError(404, "Menu item not found");
  }

  return menuItem;
};

export type MenuItemInput = {
  hotelId: string;
  hotelCode: string;
  name: string;
  category: string;
  price: number;
  isAvailable?: boolean;
};

export type UpdateMenuItemInput = Partial<Omit<MenuItemInput, "hotelId" | "hotelCode" | "name">> & {
  name?: string;
};

export const listMenuItems = async (hotelCode: string) => {
  const items = await menuTable.getAll();
  return items.filter((item) => item.hotelCode === hotelCode);
};

export const createMenuItem = async (input: MenuItemInput) => {
  if (input.price <= 0) {
    throw new HttpError(400, "Price must be positive");
  }

  const items = await menuTable.getAll();
  const duplicate = items.find(
    (item) => item.hotelCode === input.hotelCode && item.name.toLowerCase() === input.name.toLowerCase()
  );

  if (duplicate) {
    throw new HttpError(409, "Menu item with this name already exists");
  }

  const timestamp = now();
  const record: Omit<MenuItemRecord, "id"> = {
    hotelId: input.hotelId,
    hotelCode: input.hotelCode,
    name: input.name,
    category: input.category,
    price: input.price,
    isAvailable: input.isAvailable ?? true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return menuTable.insert(record);
};

export const updateMenuItem = async (id: string, input: UpdateMenuItemInput) => {
  const menuItem = await ensureMenuItem(id);

  const price = input.price ?? menuItem.price;

  if (price <= 0) {
    throw new HttpError(400, "Price must be positive");
  }

  const updated = await menuTable.update(id, {
    name: input.name ?? menuItem.name,
    category: input.category ?? menuItem.category,
    price,
    isAvailable: input.isAvailable ?? menuItem.isAvailable,
    updatedAt: now()
  });

  return updated;
};

export const deleteMenuItem = async (id: string) => {
  await ensureMenuItem(id);
  await menuTable.delete(id);
};

export type OrderItemInput = {
  menuItemId: string;
  quantity: number;
  notes?: string;
};

export type CreateOrderInput = {
  hotelId: string;
  hotelCode: string;
  source: OrderRecord["source"];
  tableId?: string;
  reservationId?: string;
  guestName?: string;
  items: OrderItemInput[];
};

const buildOrderItems = async (hotelCode: string, items: OrderItemInput[]): Promise<OrderItemRecord[]> => {
  if (!items.length) {
    throw new HttpError(400, "Order must contain at least one item");
  }

  const built: OrderItemRecord[] = [];

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new HttpError(400, "Item quantity must be positive");
    }

    const menuItem = await ensureMenuItem(item.menuItemId);

    if (menuItem.hotelCode !== hotelCode) {
      throw new HttpError(400, "Menu item does not belong to this property");
    }

    if (!menuItem.isAvailable) {
      throw new HttpError(400, `Menu item ${menuItem.name} is not available`);
    }

    const totalPrice = Number((menuItem.price * item.quantity).toFixed(2));

    built.push({
      id: nanoid(),
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      totalPrice,
      notes: item.notes
    });
  }

  return built;
};

const computeOrderTotal = (items: OrderItemRecord[]) =>
  Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));

const createKot = async (order: OrderRecord) => {
  const kot: Omit<KitchenTicketRecord, "id"> = {
    orderId: order.id,
    hotelId: order.hotelId,
    hotelCode: order.hotelCode,
    items: order.items,
    status: "QUEUED",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };

  return kitchenTable.insert(kot);
};

export const createOrder = async (input: CreateOrderInput) => {
  const items = await buildOrderItems(input.hotelCode, input.items);
  const totalAmount = computeOrderTotal(items);
  const timestamp = now();
  const orderId = nanoid();

  const record: OrderRecord = {
    id: orderId,
    hotelId: input.hotelId,
    hotelCode: input.hotelCode,
    source: input.source,
    tableId: input.tableId,
    reservationId: input.reservationId,
    guestName: input.guestName,
    items,
    status: "PLACED",
    totalAmount,
    kotNumber: `KOT-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const inserted = await ordersTable.insert(record);
  await createKot(inserted);

  return inserted;
};

const ensureOrder = async (orderId: string): Promise<OrderRecord> => {
  const order = await ordersTable.getById(orderId);

  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  return order;
};

const ensureReservation = async (reservationId: string): Promise<ReservationRecord> => {
  const reservation = await reservationsTable.getById(reservationId);

  if (!reservation) {
    throw new HttpError(404, "Reservation not found");
  }

  return reservation;
};

export const listOrders = async (hotelCode: string) => {
  const orders = await ordersTable.getAll();
  return orders.filter((order) => order.hotelCode === hotelCode);
};

export type UpdateOrderStatusInput = {
  orderId: string;
  status: OrderStatus;
};

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PLACED", "VOID"],
  PLACED: ["PREPARING", "READY", "VOID", "POSTED"],
  PREPARING: ["READY", "VOID", "POSTED"],
  READY: ["SERVED", "VOID", "POSTED"],
  SERVED: ["POSTED"],
  POSTED: [],
  VOID: []
};

export const updateOrderStatus = async (input: UpdateOrderStatusInput) => {
  const order = await ensureOrder(input.orderId);

  if (order.status === input.status) {
    return order;
  }

  const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];

  if (!allowed.includes(input.status)) {
    throw new HttpError(400, `Cannot change order status from ${order.status} to ${input.status}`);
  }

  const updated = await ordersTable.update(order.id, {
    status: input.status,
    updatedAt: now()
  });

  if (input.status === "READY" || input.status === "PREPARING") {
    const tickets = await kitchenTable.getAll();
    const ticket = tickets.find((item) => item.orderId === order.id);

    if (ticket) {
      const nextStatus = input.status === "READY" ? "COMPLETED" : "IN_PROGRESS";
      await kitchenTable.update(ticket.id, { status: nextStatus, updatedAt: now() });
    }
  }

  return updated;
};

export type RoomPostingInput = {
  orderId: string;
  reservationId: string;
  folioId?: string;
  folioName?: string;
};

export const postOrderToRoom = async (input: RoomPostingInput) => {
  const order = await ensureOrder(input.orderId);

  if (order.status === "POSTED") {
    throw new HttpError(400, "Order already posted to a room");
  }

  const reservation = await ensureReservation(input.reservationId);

  if (order.hotelCode !== reservation.hotelCode) {
    throw new HttpError(400, "Order and reservation belong to different properties");
  }

  const description = `POS Order ${order.id}`;

  await addAddonCharge({
    reservationId: reservation.id,
    description,
    amount: order.totalAmount,
    folioId: input.folioId,
    folioName: input.folioName,
    metadata: {
      source: order.source,
      orderId: order.id,
      items: order.items
    }
  });

  const updated = await ordersTable.update(order.id, {
    reservationId: reservation.id,
    status: "POSTED",
    postedAt: now(),
    updatedAt: now()
  });

  const tickets = await kitchenTable.getAll();
  const ticket = tickets.find((item) => item.orderId === order.id);

  if (ticket) {
    await kitchenTable.update(ticket.id, { status: "COMPLETED", updatedAt: now() });
  }

  return updated;
};

export const getKotQueue = async (hotelCode: string) => {
  const tickets = await kitchenTable.getAll();
  return tickets.filter((ticket) => ticket.hotelCode === hotelCode && ticket.status !== "COMPLETED");
};
