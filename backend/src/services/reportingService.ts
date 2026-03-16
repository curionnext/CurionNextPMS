import { HttpError } from "../middlewares/errorHandler.js";
import { db } from "../db/index.js";
import type { BillCharge, ReservationRecord } from "../types/domain.js";

const reservationsTable = db.reservations;
const roomsTable = db.rooms;
const billsTable = db.bills;
const paymentsTable = db.payments;
const housekeepingTable = db.housekeeping;

const startOfDayUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const parseDateInput = (value?: string) => {
  if (!value) {
    return startOfDayUtc(new Date());
  }

  const iso = value.length === 10 ? `${value}T00:00:00Z` : value;
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid date value");
  }

  return startOfDayUtc(parsed);
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDateKey = (value: string) => {
  if (!/\d{4}-\d{2}-\d{2}/.test(value)) {
    throw new HttpError(400, "Invalid date format");
  }

  const [year, month, day] = value.split("-").map(Number);
  return startOfDayUtc(new Date(Date.UTC(year, month - 1, day)));
};

const enumerateDateKeys = (start: Date, end: Date) => {
  if (end.getTime() < start.getTime()) {
    throw new HttpError(400, "endDate must be on or after startDate");
  }

  const keys: string[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
};

const getChargeDateKey = (charge: BillCharge) => {
  const metadata = (charge.metadata ?? {}) as { nightDate?: string };

  if (metadata?.nightDate) {
    return metadata.nightDate;
  }

  return toDateKey(new Date(charge.postedAt));
};

const sum = (values: number[]) => Number(values.reduce((acc, value) => acc + value, 0).toFixed(2));

const isActiveReservation = (reservation: ReservationRecord) =>
  reservation.status !== "CANCELLED" && reservation.status !== "NO_SHOW";

const isStayNight = (reservation: ReservationRecord, target: Date) => {
  const arrival = parseDateInput(reservation.arrivalDate);
  const departure = parseDateInput(reservation.departureDate);

  return arrival.getTime() <= target.getTime() && target.getTime() < departure.getTime();
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

export const getDashboardSummary = async (hotelCode: string, date?: string) => {
  const targetDate = parseDateInput(date);
  const dateKey = toDateKey(targetDate);

  const [rooms, reservations, bills, payments, tasks] = await Promise.all([
    roomsTable.getAll(),
    reservationsTable.getAll(),
    billsTable.getAll(),
    paymentsTable.getAll(),
    housekeepingTable.getAll()
  ]);

  const relevantRooms = rooms.filter((room) => room.hotelCode === hotelCode && room.status !== "OUT_OF_ORDER");
  const totalRooms = relevantRooms.length;

  const relevantReservations = reservations.filter(
    (reservation) => reservation.hotelCode === hotelCode && isActiveReservation(reservation)
  );

  const roomsInStay = relevantReservations.filter((reservation) => isStayNight(reservation, targetDate));
  const roomsSold = roomsInStay.length;
  const occupiedRooms = roomsInStay.filter((reservation) => reservation.status === "CHECKED_IN").length;

  const relevantBills = bills.filter((bill) => bill.hotelCode === hotelCode);
  const charges = relevantBills.flatMap((bill) => bill.charges.map((charge) => ({ charge, bill })));

  const roomCharges = charges.filter((entry) => entry.charge.type === "ROOM" && getChargeDateKey(entry.charge) === dateKey);
  const addonCharges = charges.filter((entry) => entry.charge.type === "ADDON" && getChargeDateKey(entry.charge) === dateKey);
  const otherCharges = charges.filter(
    (entry) => entry.charge.type === "ADJUSTMENT" && getChargeDateKey(entry.charge) === dateKey
  );

  const roomRevenue = sum(roomCharges.map((entry) => entry.charge.totalAmount));
  const addonRevenue = sum(addonCharges.map((entry) => entry.charge.totalAmount));
  const otherRevenue = sum(otherCharges.map((entry) => entry.charge.totalAmount));
  const totalRevenue = roundCurrency(roomRevenue + addonRevenue + otherRevenue);

  const roomsSoldForArr = roomCharges.length || roomsSold;
  const arr = roomsSoldForArr > 0 ? roundCurrency(roomRevenue / roomsSoldForArr) : 0;
  const revpar = totalRooms > 0 ? roundCurrency(roomRevenue / totalRooms) : 0;
  const occupancyPercent = totalRooms > 0 ? roundCurrency((roomsSold / totalRooms) * 100) : 0;

  const pendingTasks = tasks.filter(
    (task) => task.hotelCode === hotelCode && ["PENDING", "IN_PROGRESS", "INSPECT"].includes(task.status)
  );
  const dirtyRooms = rooms.filter((room) => room.hotelCode === hotelCode && room.status === "DIRTY").length;

  const paymentsForDay = payments.filter((payment) => {
    if (payment.hotelCode !== hotelCode) {
      return false;
    }

    const paymentDate = toDateKey(new Date(payment.receivedAt));
    return paymentDate === dateKey;
  });

  return {
    date: dateKey,
    totals: {
      occupancyPercent,
      roomsSold,
      occupiedRooms,
      totalRooms,
      arr,
      revpar,
      roomRevenue,
      addonRevenue,
      otherRevenue,
      totalRevenue,
      paymentsCollected: sum(paymentsForDay.map((payment) => payment.amount))
    },
    revenueSplit: {
      room: roomRevenue,
      addon: addonRevenue,
      other: otherRevenue
    },
    housekeeping: {
      pendingTasks: pendingTasks.length,
      dirtyRooms
    }
  };
};

export const getDailyReport = async (hotelCode: string, date?: string) => {
  const targetDate = parseDateInput(date);
  const dateKey = toDateKey(targetDate);

  const [reservations, dashboard] = await Promise.all([
    reservationsTable.getAll(),
    getDashboardSummary(hotelCode, dateKey)
  ]);

  const relevantReservations = reservations.filter(
    (reservation) => reservation.hotelCode === hotelCode && isActiveReservation(reservation)
  );

  const arrivals = relevantReservations.filter((reservation) => reservation.arrivalDate === dateKey);
  const departures = relevantReservations.filter((reservation) => reservation.departureDate === dateKey);
  const stayovers = relevantReservations.filter(
    (reservation) => isStayNight(reservation, targetDate) && reservation.arrivalDate !== dateKey
  );

  return {
    date: dateKey,
    summary: dashboard.totals,
    arrivals: {
      count: arrivals.length,
      reservations: arrivals.map((reservation) => ({
        id: reservation.id,
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        status: reservation.status,
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate
      }))
    },
    departures: {
      count: departures.length,
      reservations: departures.map((reservation) => ({
        id: reservation.id,
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        status: reservation.status,
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate
      }))
    },
    stayovers: {
      count: stayovers.length,
      reservations: stayovers.map((reservation) => ({
        id: reservation.id,
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        status: reservation.status,
        arrivalDate: reservation.arrivalDate,
        departureDate: reservation.departureDate
      }))
    }
  };
};

export const getRevenueReport = async (
  hotelCode: string,
  params: { startDate?: string; endDate?: string } = {}
) => {
  const start = parseDateInput(params.startDate);
  const end = params.endDate ? parseDateInput(params.endDate) : startOfDayUtc(new Date(start));

  const dateKeys = enumerateDateKeys(start, end);
  const [bills, payments] = await Promise.all([billsTable.getAll(), paymentsTable.getAll()]);

  const relevantBills = bills.filter((bill) => bill.hotelCode === hotelCode);
  const charges = relevantBills.flatMap((bill) => bill.charges.map((charge) => ({ charge, bill })));

  const relevantPayments = payments.filter((payment) => payment.hotelCode === hotelCode);

  const daily = dateKeys.map((key) => {
    const dailyCharges = charges.filter((entry) => key === getChargeDateKey(entry.charge));
    const roomRevenue = sum(dailyCharges.filter((entry) => entry.charge.type === "ROOM").map((entry) => entry.charge.totalAmount));
    const addonRevenue = sum(dailyCharges.filter((entry) => entry.charge.type === "ADDON").map((entry) => entry.charge.totalAmount));
    const otherRevenue = sum(dailyCharges.filter((entry) => entry.charge.type === "ADJUSTMENT").map((entry) => entry.charge.totalAmount));
    const totalRevenue = roundCurrency(roomRevenue + addonRevenue + otherRevenue);
    const paymentsCollected = sum(
      relevantPayments
        .filter((payment) => toDateKey(new Date(payment.receivedAt)) === key)
        .map((payment) => payment.amount)
    );

    return {
      date: key,
      roomRevenue,
      addonRevenue,
      otherRevenue,
      totalRevenue,
      paymentsCollected
    };
  });

  const totals = daily.reduce(
    (acc, item) => ({
      roomRevenue: roundCurrency(acc.roomRevenue + item.roomRevenue),
      addonRevenue: roundCurrency(acc.addonRevenue + item.addonRevenue),
      otherRevenue: roundCurrency(acc.otherRevenue + item.otherRevenue),
      totalRevenue: roundCurrency(acc.totalRevenue + item.totalRevenue),
      paymentsCollected: roundCurrency(acc.paymentsCollected + item.paymentsCollected)
    }),
    { roomRevenue: 0, addonRevenue: 0, otherRevenue: 0, totalRevenue: 0, paymentsCollected: 0 }
  );

  return {
    range: {
      startDate: toDateKey(start),
      endDate: toDateKey(end)
    },
    totals,
    daily
  };
};
