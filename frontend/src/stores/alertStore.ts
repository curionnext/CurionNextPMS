import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addMinutes, addDays, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import type { AlertItem, AlertRule, AlertCategory } from '../types';
import { useReservationStore } from './reservationStore';
import { usePropertyStore } from './propertyStore';
import { formatCurrency } from '../utils';

interface AlertState {
  rules: AlertRule[];
  alerts: AlertItem[];
  lastEvaluationAt?: string;

  evaluateRules: () => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  acknowledgeAlert: (id: string, userName: string) => void;
  dismissAlert: (id: string) => void;
  getUnreadCount: () => number;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'ALRT-R1',
    category: 'late-checkout',
    name: 'Late checkout',
    description: 'Guests past their scheduled checkout time',
    severity: 'high',
    isActive: true,
  },
  {
    id: 'ALRT-R2',
    category: 'room-not-cleaned',
    name: 'Room awaiting cleaning',
    description: 'Dirty rooms pending beyond SLA',
    severity: 'medium',
    isActive: true,
  },
  {
    id: 'ALRT-R3',
    category: 'payment-pending',
    name: 'Payment pending',
    description: 'Reservations with outstanding folios',
    severity: 'high',
    isActive: true,
  },
  {
    id: 'ALRT-R4',
    category: 'overbooking',
    name: 'Potential overbooking',
    description: 'Occupancy exceeds available inventory',
    severity: 'critical',
    isActive: true,
  },
];

const buildAlert = (rule: AlertRule, title: string, message: string): AlertItem => ({
  id: generateId(),
  ruleId: rule.id,
  category: rule.category,
  severity: rule.severity,
  title,
  message,
  createdAt: new Date().toISOString(),
  isRead: false,
});

const roomAgingThresholdMinutes = 90;

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_RULES,
      alerts: [],
      lastEvaluationAt: undefined,

      evaluateRules: () => {
        const state = get();
        const activeRules = state.rules.filter((rule) => rule.isActive);
        if (!activeRules.length) {
          return;
        }

        const reservations = useReservationStore.getState().reservations;
        const rooms = usePropertyStore.getState().rooms;

        const nextAlerts: AlertItem[] = [];

        const ensureAlert = (category: AlertCategory, title: string, message: string) => {
          const rule = activeRules.find((entry) => entry.category === category);
          if (!rule) {
            return;
          }

          const existing = state.alerts.find((alert) => alert.ruleId === rule.id && alert.message === message && !alert.acknowledgedAt);
          if (existing) {
            nextAlerts.push(existing);
            return;
          }

          nextAlerts.push(buildAlert(rule, title, message));
        };

        // Late checkout detection
        const now = new Date();
        reservations
          .filter((reservation) => reservation.status === 'checked-in')
          .forEach((reservation) => {
            const checkoutTime = addMinutes(parseISO(`${reservation.checkOut}T12:00:00`), 0);
            if (isBefore(checkoutTime, now)) {
              const delta = Math.floor((now.getTime() - checkoutTime.getTime()) / (1000 * 60));
              ensureAlert(
                'late-checkout',
                `Late checkout · ${reservation.guest.firstName}`,
                `Reservation ${reservation.confirmationNumber} is ${delta} minutes past checkout.`
              );
            }
          });

        // Room not cleaned beyond threshold
        rooms
          .filter((room) => room.status === 'dirty')
          .forEach((room) => {
            const lastCleaned = room.lastCleaned ? parseISO(room.lastCleaned) : undefined;
            const overdue = !lastCleaned || isAfter(new Date(), addMinutes(lastCleaned, roomAgingThresholdMinutes));
            if (overdue) {
              ensureAlert(
                'room-not-cleaned',
                `Room ${room.roomNumber} pending cleaning`,
                `Housekeeping delay for room ${room.roomNumber}.`
              );
            }
          });

        // Payment pending for checked-out or due-out
        reservations
          .filter((reservation) => reservation.paymentStatus !== 'paid')
          .filter((reservation) => ['checked-out', 'confirmed'].includes(reservation.status))
          .forEach((reservation) => {
            const balance = Math.max(reservation.totalAmount - reservation.amountPaid, 0);
            ensureAlert(
              'payment-pending',
              `Payment pending · ${reservation.guest.firstName}`,
              `Balance due ${formatCurrency(balance)} for reservation ${reservation.confirmationNumber}.`
            );
          });

        // Overbooking detection per day
        const occupancyMap = new Map<string, number>();
        reservations.forEach((reservation) => {
          if ( reservation.status === 'cancelled' || reservation.status === 'no-show') {
            return;
          }
          const start = startOfDay(parseISO(reservation.checkIn));
          const end = startOfDay(parseISO(reservation.checkOut));
          for (
            let cursor = new Date(start);
            isBefore(cursor, end);
            cursor = addDays(cursor, 1)
          ) {
            const key = cursor.toISOString();
            occupancyMap.set(key, (occupancyMap.get(key) || 0) + 1);
          }
        });

        const inventory = rooms.length || 0;
        occupancyMap.forEach((count, key) => {
          if (inventory && count > inventory) {
            ensureAlert(
              'overbooking',
              'Overbooking risk',
              `Occupancy demand of ${count} rooms exceeds inventory of ${inventory} on ${new Date(key).toDateString()}.`
            );
          }
        });

        if (!nextAlerts.length) {
          set({ lastEvaluationAt: new Date().toISOString() });
          return;
        }

        set((current) => {
          // Get IDs of alerts we're keeping
          const nextAlertIds = new Set(nextAlerts.map(a => a.id));
          
          // Filter out old alerts that are being replaced
          const otherAlerts = current.alerts.filter(alert => !nextAlertIds.has(alert.id));
          
          return {
            alerts: [...nextAlerts, ...otherAlerts]
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .slice(0, 40),
            lastEvaluationAt: new Date().toISOString(),
          };
        });
      },

      markAsRead: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, isRead: true } : alert
          ),
        }));
      },

      markAllRead: () => {
        set((state) => ({
          alerts: state.alerts.map((alert) => ({ ...alert, isRead: true })),
        }));
      },

      acknowledgeAlert: (id, userName) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  acknowledgedBy: userName,
                  acknowledgedAt: new Date().toISOString(),
                  isRead: true,
                }
              : alert
          ),
        }));
      },

      dismissAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        }));
      },

      getUnreadCount: () => get().alerts.filter((alert) => !alert.isRead).length,
    }),
    {
      name: 'alert-center-store',
    }
  )
);
