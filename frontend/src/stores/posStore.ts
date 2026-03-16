import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid/non-secure';
import type {
  POSMenuItem,
  POSOrder,
  POSOrderLine,
  POSPayment,
  POSTable,
  POSAppliedCharge,
  KOTTicket,
} from '../types';
import { useReservationStore } from './reservationStore';

interface POSState {
  menu: POSMenuItem[];
  tables: POSTable[];
  orders: POSOrder[];
  kotTickets: KOTTicket[];

  // Menu management
  toggleMenuAvailability: (itemId: string) => void;
  addMenuItem: (payload: Omit<POSMenuItem, 'id'>) => POSMenuItem;
  updateMenuItem: (itemId: string, updates: Partial<Omit<POSMenuItem, 'id'>>) => void;
  deleteMenuItem: (itemId: string) => void;

  // Table management
  addTable: (payload: Omit<POSTable, 'id' | 'status'>) => POSTable;
  updateTable: (tableId: string, updates: Partial<Omit<POSTable, 'id'>>) => void;
  deleteTable: (tableId: string) => void;
  markTableStatus: (tableId: string, status: POSTable['status']) => void;
  detachOrderFromTable: (tableId: string) => void;

  // Order handling
  startOrder: (tableId?: string) => POSOrder;
  addItemToOrder: (orderId: string, item: POSMenuItem) => void;
  updateOrderLine: (orderId: string, lineId: string, updates: Partial<POSOrderLine>) => void;
  adjustQuantity: (orderId: string, lineId: string, delta: number) => void;
  removeLine: (orderId: string, lineId: string) => void;
  addCharge: (orderId: string, charge: POSAppliedCharge) => void;
  clearOrder: (orderId: string) => void;
  postToRoom: (orderId: string, roomNumber: string, guestName?: string) => void;
  closeOrder: (orderId: string) => void;
  recordPayment: (orderId: string, payment: Omit<POSPayment, 'id' | 'createdAt'>) => POSPayment;

  // Kitchen operations
  sendOrderToKitchen: (orderId: string) => KOTTicket | undefined;
  updateTicketStatus: (ticketId: string, status: KOTTicket['status']) => void;
}

const DEFAULT_MENU: POSMenuItem[] = [
  {
    id: 'MNU001',
    name: 'Masala Dosa',
    category: 'food',
    price: 220,
    description: 'Crisp dosa with potato masala and chutneys',
    isAvailable: true,
    tags: ['south-indian', 'vegetarian'],
    printerRoute: 'main',
  },
  {
    id: 'MNU002',
    name: 'Paneer Tikka',
    category: 'food',
    price: 320,
    description: 'Char-grilled cottage cheese with mint chutney',
    isAvailable: true,
    tags: ['starter', 'spicy'],
    printerRoute: 'main',
  },
  {
    id: 'MNU101',
    name: 'Fresh Lime Soda',
    category: 'beverage',
    price: 140,
    isAvailable: true,
    tags: ['refreshing'],
    printerRoute: 'bar',
  },
  {
    id: 'MNU201',
    name: 'Gulab Jamun',
    category: 'dessert',
    price: 160,
    isAvailable: true,
    printerRoute: 'dessert',
  },
];

const DEFAULT_TABLES: POSTable[] = [
  { id: 'TBL01', label: 'T1', seats: 2, status: 'vacant' },
  { id: 'TBL02', label: 'T2', seats: 4, status: 'vacant' },
  { id: 'TBL03', label: 'T3', seats: 4, status: 'reserved' },
  { id: 'TBL04', label: 'T4', seats: 6, status: 'vacant' },
  { id: 'TBL05', label: 'Patio 1', seats: 2, status: 'needs-assistance' },
];

const generateLine = (item: POSMenuItem): POSOrderLine => ({
  id: nanoid(8),
  itemId: item.id,
  name: item.name,
  quantity: 1,
  unitPrice: item.price,
  status: 'pending',
});

const calculateTotals = (order: POSOrder) => {
  const itemsTotal = order.items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const chargesTotal = order.charges.reduce((sum, entry) => sum + entry.amount, 0);
  const paymentsTotal = order.payments.reduce((sum, entry) => sum + entry.amount, 0);
  return { itemsTotal, chargesTotal, paymentsTotal };
};

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      menu: DEFAULT_MENU,
      tables: DEFAULT_TABLES,
      orders: [],
      kotTickets: [],

      toggleMenuAvailability: (itemId) => {
        set((state) => ({
          menu: state.menu.map((item) =>
            item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
          ),
        }));
      },

      addMenuItem: (payload) => {
        const item: POSMenuItem = { id: nanoid(8), ...payload };
        set((state) => ({ menu: [...state.menu, item] }));
        return item;
      },

      updateMenuItem: (itemId, updates) => {
        set((state) => ({
          menu: state.menu.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }));
      },

      deleteMenuItem: (itemId) => {
        set((state) => ({
          menu: state.menu.filter((item) => item.id !== itemId),
        }));
      },

      addTable: (payload) => {
        const table: POSTable = {
          id: `TBL${nanoid(6)}`,
          status: 'vacant',
          ...payload,
        };
        set((state) => ({ tables: [...state.tables, table] }));
        return table;
      },

      updateTable: (tableId, updates) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId ? { ...table, ...updates } : table
          ),
        }));
      },

      deleteTable: (tableId) => {
        set((state) => ({
          tables: state.tables.filter((table) => table.id !== tableId),
        }));
      },

      markTableStatus: (tableId, status) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId ? { ...table, status } : table
          ),
        }));
      },

      detachOrderFromTable: (tableId) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId ? { ...table, activeOrderId: undefined, status: 'vacant' } : table
          ),
        }));
      },

      startOrder: (tableId) => {
        const order: POSOrder = {
          id: nanoid(10),
          tableId,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [],
          charges: [],
          payments: [],
        };

        set((state) => {
          const orders = [order, ...state.orders];
          const tables = tableId
            ? state.tables.map<POSTable>((table) =>
                table.id === tableId
                  ? { ...table, status: 'occupied', activeOrderId: order.id }
                  : table
              )
            : state.tables;
          return { orders, tables };
        });

        return order;
      },

      addItemToOrder: (orderId, item) => {
        if (!item.isAvailable) {
          return;
        }

        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) {
              return order;
            }

            const existing = order.items.find((line) => line.itemId === item.id && line.status === 'pending');
            const items = existing
              ? order.items.map((line) =>
                  line.id === existing.id
                    ? { ...line, quantity: line.quantity + 1 }
                    : line
                )
              : [...order.items, generateLine(item)];

            return {
              ...order,
              items,
              status: order.status === 'draft' ? 'draft' : order.status,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updateOrderLine: (orderId, lineId, updates) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  items: order.items.map((line) =>
                    line.id === lineId ? { ...line, ...updates } : line
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : order
          ),
        }));
      },

      adjustQuantity: (orderId, lineId, delta) => {
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) {
              return order;
            }
            const items = order.items
              .map((line) =>
                line.id === lineId
                  ? { ...line, quantity: Math.max(1, line.quantity + delta) }
                  : line
              )
              .filter((line) => line.quantity > 0);
            return { ...order, items, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      removeLine: (orderId, lineId) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  items: order.items.filter((line) => line.id !== lineId),
                  updatedAt: new Date().toISOString(),
                }
              : order
          ),
        }));
      },

      addCharge: (orderId, charge) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  charges: [...order.charges, charge],
                  updatedAt: new Date().toISOString(),
                }
              : order
          ),
        }));
      },

      clearOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== orderId),
          tables: state.tables.map<POSTable>((table) =>
            table.activeOrderId === orderId
              ? { ...table, status: 'vacant', activeOrderId: undefined }
              : table
          ),
          kotTickets: state.kotTickets.filter((ticket) => ticket.orderId !== orderId),
        }));
      },

      postToRoom: (orderId, roomNumber, guestName) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  roomNumber,
                  guestName,
                  updatedAt: new Date().toISOString(),
                }
              : order
          ),
        }));

        const reservation = useReservationStore.getState().reservations.find((entry) =>
          entry.roomNumbers.includes(roomNumber) && entry.status === 'checked-in'
        );

        if (reservation) {
          void useReservationStore
            .getState()
            .updateReservation(reservation.id, {
              notes: `${reservation.notes || ''}\nPOS posting ${roomNumber} at ${new Date().toLocaleTimeString()}`.trim(),
            })
            .catch(() => undefined);
        }
      },

      closeOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, status: 'completed', updatedAt: new Date().toISOString() }
              : order
          ),
          tables: state.tables.map<POSTable>((table) =>
            table.activeOrderId === orderId
              ? { ...table, status: 'vacant', activeOrderId: undefined }
              : table
          ),
        }));
      },

      recordPayment: (orderId, payment) => {
        const entry: POSPayment = { id: nanoid(8), createdAt: new Date().toISOString(), ...payment };
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  payments: [...order.payments, entry],
                  updatedAt: new Date().toISOString(),
                  status:
                    calculateTotals({ ...order, payments: [...order.payments, entry] }).paymentsTotal >=
                    calculateTotals({ ...order, payments: [...order.payments, entry] }).itemsTotal +
                      calculateTotals({ ...order, payments: [...order.payments, entry] }).chargesTotal
                      ? 'posted'
                      : order.status,
                }
              : order
          ),
        }));
        return entry;
      },

      sendOrderToKitchen: (orderId) => {
        const state = get();
        const order = state.orders.find((entry) => entry.id === orderId);
        if (!order || !order.items.length) {
          return undefined;
        }

        const ticket: KOTTicket = {
          id: nanoid(10),
          kotNumber: `KOT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          orderId: order.id,
          tableLabel: order.tableId ? state.tables.find((table) => table.id === order.tableId)?.label : undefined,
          roomNumber: order.roomNumber,
          status: 'queued',
          createdAt: new Date().toISOString(),
          items: order.items.map((line) => ({ name: line.name, quantity: line.quantity, notes: line.notes })),
        };

        set((prev) => ({
          kotTickets: [ticket, ...prev.kotTickets],
          orders: prev.orders.map((entry) =>
            entry.id === orderId
              ? { ...entry, status: 'sent', updatedAt: new Date().toISOString() }
              : entry
          ),
        }));

        return ticket;
      },

      updateTicketStatus: (ticketId, status) => {
        set((state) => ({
          kotTickets: state.kotTickets.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, status, printedAt: status === 'completed' ? new Date().toISOString() : ticket.printedAt } : ticket
          ),
        }));
      },
    }),
    {
      name: 'pos-storage',
    }
  )
);
