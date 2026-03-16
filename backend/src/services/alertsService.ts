import { db } from "../db/index.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type {
  AlertContext,
  AlertRecord,
  AlertType,
  ReservationRecord,
  RoomRecord,
  HousekeepingTaskRecord
} from "../types/domain.js";

type AlertTrigger = {
  type: AlertType;
  message: string;
  context?: AlertContext;
  metadata?: Record<string, unknown>;
};

const alertsTable = db.alerts;
const reservationsTable = db.reservations;
const roomsTable = db.rooms;
const housekeepingTable = db.housekeeping;

const now = () => new Date().toISOString();
const startOfDayUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return startOfDayUtc(new Date(Date.UTC(year, month - 1, day)));
};

const isStayNight = (reservation: ReservationRecord, day: Date) => {
  const arrival = parseDateKey(reservation.arrivalDate);
  const departure = parseDateKey(reservation.departureDate);
  return arrival.getTime() <= day.getTime() && day.getTime() < departure.getTime();
};

const buildFingerprint = (type: AlertType, context?: AlertContext) => {
  const reservationId = context?.reservationId ?? "";
  const roomId = context?.roomId ?? "";
  const date = context?.date ?? "";
  return [type, reservationId, roomId, date].join("|");
};

const resolveHotelId = (hotelCode: string, reservations: ReservationRecord[], rooms: RoomRecord[]) => {
  const fromReservation = reservations.find((reservation) => reservation.hotelCode === hotelCode);
  if (fromReservation) {
    return fromReservation.hotelId;
  }

  const fromRoom = rooms.find((room) => room.hotelCode === hotelCode);
  if (fromRoom) {
    return fromRoom.hotelId;
  }

  return hotelCode;
};

const evaluateLateCheckoutAlerts = (reservations: ReservationRecord[], todayKey: string): AlertTrigger[] => {
  return reservations
    .filter((reservation) => reservation.status === "CHECKED_IN" && reservation.departureDate < todayKey)
    .map((reservation) => ({
      type: "LATE_CHECKOUT" as const,
      message: `Reservation ${reservation.id} is past departure and still checked in`,
      context: {
        reservationId: reservation.id,
        roomId: reservation.roomId
      },
      metadata: {
        departureDate: reservation.departureDate
      }
    }));
};

const evaluateDirtyRoomAlerts = (rooms: RoomRecord[], tasks: HousekeepingTaskRecord[]): AlertTrigger[] => {
  const thresholdMs = 3 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const results: AlertTrigger[] = [];

  for (const task of tasks) {
    if (!["PENDING", "IN_PROGRESS"].includes(task.status)) continue;

    const room = rooms.find((candidate) => candidate.id === task.roomId);
    if (!room || room.status !== "DIRTY") continue;

    const updatedAt = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
    const ageMs = nowMs - updatedAt;

    if (ageMs < thresholdMs) continue;

    const ageMinutes = Math.round(ageMs / (60 * 1000));

    results.push({
      type: "DIRTY_ROOM" as const,
      message: `Room ${room.number ?? room.id} has been dirty for ${ageMinutes} minutes`,
      context: {
        roomId: room.id
      },
      metadata: {
        roomNumber: room.number,
        taskId: task.id,
        ageMinutes
      }
    });
  }

  return results;
};

const evaluatePaymentPendingAlerts = (reservations: ReservationRecord[], todayKey: string): AlertTrigger[] => {
  return reservations
    .filter((reservation) => {
      // Don't show alerts for checked-out or cancelled reservations
      if (reservation.status === "CHECKED_OUT" || reservation.status === "CANCELLED" || reservation.status === "NO_SHOW") {
        return false;
      }
      const balanceDue = reservation.billing?.balanceDue ?? 0;
      const isPastDeparture = reservation.departureDate <= todayKey;
      return balanceDue > 0.01 && isPastDeparture;
    })
    .map((reservation) => ({
      type: "PAYMENT_PENDING" as const,
      message: `Reservation ${reservation.id} has an outstanding balance of ${reservation.billing.balanceDue.toFixed(2)}`,
      context: {
        reservationId: reservation.id
      },
      metadata: {
        balanceDue: reservation.billing.balanceDue,
        currency: reservation.billing.currency
      }
    }));
};

const evaluateOverbookingAlerts = (reservations: ReservationRecord[], rooms: RoomRecord[]): AlertTrigger[] => {
  const today = startOfDayUtc(new Date());
  const inventory = rooms.filter((room) => room.status !== "OUT_OF_ORDER").length;

  if (inventory === 0) {
    return [];
  }

  const alerts: Array<{
    type: "OVERBOOKING_RISK";
    message: string;
    context: AlertContext;
    metadata: Record<string, unknown>;
  }> = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + offset);
    const dateKey = toDateKey(day);

    const roomsSold = reservations.filter((reservation) => {
      if (reservation.status === "CANCELLED" || reservation.status === "NO_SHOW") {
        return false;
      }

      return isStayNight(reservation, day);
    }).length;

    if (roomsSold > inventory) {
      alerts.push({
        type: "OVERBOOKING_RISK",
        message: `Overbooking risk on ${dateKey}: ${roomsSold} rooms sold vs ${inventory} available`,
        context: {
          date: dateKey
        },
        metadata: {
          date: dateKey,
          roomsSold,
          inventory
        }
      });
    }
  }

  return alerts;
};

const mergeTriggers = <T extends { type: AlertType; context?: AlertContext }>(triggers: T[]): T[] => {
  const seen = new Map<string, T>();

  triggers.forEach((trigger) => {
    const fingerprint = buildFingerprint(trigger.type, trigger.context);
    if (!seen.has(fingerprint)) {
      seen.set(fingerprint, trigger);
    }
  });

  return Array.from(seen.values());
};

const sortAlerts = (alerts: AlertRecord[]) =>
  alerts.sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));

export const syncAlertsForHotel = async (hotelCode: string) => {
  const [alerts, reservations, rooms, tasks] = await Promise.all([
    alertsTable.getAll(),
    reservationsTable.getAll(),
    roomsTable.getAll(),
    housekeepingTable.getAll()
  ]);

  const relevantReservations = reservations.filter((reservation) => reservation.hotelCode === hotelCode);
  const relevantRooms = rooms.filter((room) => room.hotelCode === hotelCode);
  const relevantTasks = tasks.filter((task) => task.hotelCode === hotelCode);
  const relevantAlerts = alerts.filter((alert) => alert.hotelCode === hotelCode);

  const todayKey = toDateKey(startOfDayUtc(new Date()));

  const triggers = mergeTriggers([
    ...evaluateLateCheckoutAlerts(relevantReservations, todayKey),
    ...evaluateDirtyRoomAlerts(relevantRooms, relevantTasks),
    ...evaluatePaymentPendingAlerts(relevantReservations, todayKey),
    ...evaluateOverbookingAlerts(relevantReservations, relevantRooms)
  ]);

  const activeFingerprints = new Set(triggers.map((trigger) => buildFingerprint(trigger.type, trigger.context)));
  const existingActive = new Map(
    relevantAlerts
      .filter((alert) => alert.status === "ACTIVE" || alert.status === "ACKNOWLEDGED")
      .map((alert) => [alert.fingerprint, alert])
  );

  const hotelId = resolveHotelId(hotelCode, relevantReservations, relevantRooms);

  for (const trigger of triggers) {
    const fingerprint = buildFingerprint(trigger.type, trigger.context);

    if (!existingActive.has(fingerprint)) {
      const timestamp = now();

      await alertsTable.insert({
        hotelId,
        hotelCode,
        type: trigger.type,
        status: "ACTIVE",
        fingerprint,
        message: trigger.message,
        context: trigger.context,
        metadata: trigger.metadata,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
  }

  const timestamp = now();

  await Promise.all(
    relevantAlerts
      .filter((alert) => (alert.status === "ACTIVE" || alert.status === "ACKNOWLEDGED") && !activeFingerprints.has(alert.fingerprint))
      .map((alert) =>
        alertsTable.update(alert.id, {
          status: "RESOLVED",
          resolvedAt: timestamp,
          updatedAt: timestamp
        })
      )
  );

  const updatedAlerts = await alertsTable.getAll();
  const hotelAlerts = updatedAlerts.filter((alert) => alert.hotelCode === hotelCode);

  const active = sortAlerts(hotelAlerts.filter((alert) => alert.status === "ACTIVE"));
  const acknowledged = sortAlerts(hotelAlerts.filter((alert) => alert.status === "ACKNOWLEDGED"));
  const resolved = sortAlerts(hotelAlerts.filter((alert) => alert.status === "RESOLVED"));

  return {
    active,
    acknowledged,
    resolved
  };
};

export const acknowledgeAlert = async (hotelCode: string, alertId: string, acknowledgedBy?: string) => {
  const alert = await alertsTable.getById(alertId);

  if (!alert || alert.hotelCode !== hotelCode) {
    throw new HttpError(404, "Alert not found");
  }

  if (alert.status === "RESOLVED") {
    throw new HttpError(400, "Alert already resolved");
  }

  const timestamp = now();
  const updates: Partial<AlertRecord> = {
    status: "ACKNOWLEDGED",
    acknowledgedAt: timestamp,
    updatedAt: timestamp
  };

  if (acknowledgedBy) {
    updates.metadata = { ...(alert.metadata ?? {}), acknowledgedBy };
  }

  const updated = await alertsTable.update(alert.id, updates);
  return updated;
};
