import { HttpError } from "../middlewares/errorHandler.js";
import { db } from "../db/index.js";
import type {
  HousekeepingStatus,
  HousekeepingTaskRecord,
  MaintenanceRecord,
  MaintenancePriority,
  RoomRecord
} from "../types/domain.js";

const housekeepingTable = db.housekeeping;
const maintenanceTable = db.maintenance;
const roomsTable = db.rooms;

const now = () => new Date().toISOString();

const STATUS_TRANSITIONS: Record<HousekeepingStatus, HousekeepingStatus[]> = {
  PENDING: ["IN_PROGRESS", "MAINTENANCE"],
  IN_PROGRESS: ["READY", "INSPECT", "MAINTENANCE"],
  READY: ["INSPECT", "COMPLETED"],
  INSPECT: ["COMPLETED", "IN_PROGRESS"],
  COMPLETED: ["PENDING"],
  MAINTENANCE: ["IN_PROGRESS", "PENDING"]
};

const ensureRoom = async (roomId: string): Promise<RoomRecord> => {
  const room = await roomsTable.getById(roomId);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  return room;
};

const ensureTask = async (room: RoomRecord): Promise<HousekeepingTaskRecord> => {
  const tasks = await housekeepingTable.getAll();
  const existing = tasks.find((task) => task.roomId === room.id);

  if (existing) {
    return existing;
  }

  const timestamp = now();
  const record: Omit<HousekeepingTaskRecord, "id"> = {
    hotelId: room.hotelId,
    hotelCode: room.hotelCode,
    roomId: room.id,
    status: "PENDING",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return housekeepingTable.insert(record);
};

const transitionRoomStatus = async (room: RoomRecord, status: HousekeepingStatus) => {
  if (status === "MAINTENANCE") {
    await roomsTable.update(room.id, { status: "OUT_OF_ORDER", updatedAt: now() });
    return;
  }

  if (status === "COMPLETED" || status === "READY") {
    await roomsTable.update(room.id, { status: "AVAILABLE", updatedAt: now() });
    return;
  }

  if (status === "IN_PROGRESS") {
    await roomsTable.update(room.id, { status: "DIRTY", updatedAt: now() });
  }
};

export type HousekeepingRoomPayload = {
  room: RoomRecord;
  task: HousekeepingTaskRecord;
};

export const listHousekeepingRooms = async (hotelCode: string): Promise<HousekeepingRoomPayload[]> => {
  const rooms = await roomsTable.getAll();
  const relevantRooms = rooms.filter((room) => room.hotelCode === hotelCode);
  const tasks = await housekeepingTable.getAll();

  return Promise.all(
    relevantRooms.map(async (room) => {
      const existingTask = tasks.find((task) => task.roomId === room.id) ?? (await ensureTask(room));
      return { room, task: existingTask };
    })
  );
};

export type AssignHousekeepingInput = {
  roomId: string;
  assignedTo: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  notes?: string;
};

export const assignHousekeepingTask = async (input: AssignHousekeepingInput) => {
  const room = await ensureRoom(input.roomId);
  const task = await ensureTask(room);
  const timestamp = now();

  const updated = await housekeepingTable.update(task.id, {
    assignedTo: input.assignedTo,
    priority: input.priority ?? task.priority ?? "MEDIUM",
    notes: input.notes ?? task.notes,
    status: task.status === "PENDING" ? "IN_PROGRESS" : task.status,
    updatedAt: timestamp
  });

  if (updated.status === "IN_PROGRESS") {
    await transitionRoomStatus(room, "IN_PROGRESS");
  }

  return updated;
};

export type UpdateHousekeepingStatusInput = {
  roomId: string;
  status: HousekeepingStatus;
  notes?: string;
};

export const updateHousekeepingStatus = async (input: UpdateHousekeepingStatusInput) => {
  const room = await ensureRoom(input.roomId);
  const task = await ensureTask(room);

  if (task.status === input.status) {
    return task;
  }

  const allowed = STATUS_TRANSITIONS[task.status] ?? [];

  if (!allowed.includes(input.status)) {
    throw new HttpError(400, `Cannot transition from ${task.status} to ${input.status}`);
  }

  const updated = await housekeepingTable.update(task.id, {
    status: input.status,
    notes: input.notes ?? task.notes,
    updatedAt: now()
  });

  await transitionRoomStatus(room, input.status);

  return updated;
};

export type MaintenanceInput = {
  roomId: string;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  reportedBy?: string;
};

export const createMaintenanceRequest = async (input: MaintenanceInput) => {
  if (!input.title) {
    throw new HttpError(400, "Maintenance title is required");
  }

  const room = await ensureRoom(input.roomId);
  const task = await ensureTask(room);
  const timestamp = now();

  const record: Omit<MaintenanceRecord, "id"> = {
    hotelId: room.hotelId,
    hotelCode: room.hotelCode,
    roomId: room.id,
    title: input.title,
    description: input.description,
    priority: input.priority,
    reportedBy: input.reportedBy,
    status: "OPEN",
    reportedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const maintenance = await maintenanceTable.insert(record);

  await housekeepingTable.update(task.id, {
    status: "MAINTENANCE",
    updatedAt: timestamp
  });

  await transitionRoomStatus(room, "MAINTENANCE");

  return maintenance;
};
