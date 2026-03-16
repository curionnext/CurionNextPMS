import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Utensils, Coffee, IceCream, Package2, Plus, Minus, Send, Printer, Smartphone, BedDouble, Wallet, Check, XCircle, ListChecks } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { usePOSStore } from '../../stores/posStore';
import { useReservationStore } from '../../stores/reservationStore';
import { usePropertyStore } from '../../stores/propertyStore';
import { formatCurrency } from '../../utils';
import type { POSMenuCategory, POSMenuItem, POSOrder } from '../../types';
import { cn } from '../../utils';

const CATEGORY_FILTERS: Array<{ key: POSMenuCategory | 'all'; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: 'all', label: 'All', icon: Package2 },
  { key: 'food', label: 'Food', icon: Utensils },
  { key: 'beverage', label: 'Beverages', icon: Coffee },
  { key: 'dessert', label: 'Desserts', icon: IceCream },
  { key: 'other', label: 'Others', icon: ListChecks },
];

const SERVICE_CHARGE = 0.05;
const TAX_RATE = 0.12;

export function PosPage() {
  const {
    menu,
    tables,
    orders,
    kotTickets,
    startOrder,
    addItemToOrder,
    adjustQuantity,
    removeLine,
    toggleMenuAvailability,
    sendOrderToKitchen,
    recordPayment,
    postToRoom,
    addCharge,
    updateTicketStatus,
  } = usePOSStore();
  const { reservations } = useReservationStore();
  const { rooms } = usePropertyStore();

  const [categoryFilter, setCategoryFilter] = useState<POSMenuCategory | 'all'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [roomSelection, setRoomSelection] = useState<string>('');

  const checkedInReservations = useMemo(() => {
    return reservations.filter((reservation) => reservation.status === 'checked-in');
  }, [reservations]);

  const trackedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? orders[0], [orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId && orders.length) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const filteredMenu = useMemo(() => {
    if (categoryFilter === 'all') {
      return menu;
    }
    return menu.filter((item) => item.category === categoryFilter);
  }, [menu, categoryFilter]);

  const totals = useMemo(() => {
    if (!trackedOrder) {
      return { items: 0, service: 0, tax: 0, grand: 0, payments: 0 };
    }
    const items = trackedOrder.items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const service = Math.round(items * SERVICE_CHARGE);
    const tax = Math.round((items + service) * TAX_RATE);
    const payments = trackedOrder.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const manualCharges = trackedOrder.charges.reduce((sum, charge) => sum + charge.amount, 0);
    const grand = items + service + tax + manualCharges;
    return { items, service, tax, grand, payments };
  }, [trackedOrder]);

  const activeTickets = kotTickets.slice(0, 4);

  const handleTableTap = (tableId: string) => {
    const table = tables.find((entry) => entry.id === tableId);
    if (!table) {
      return;
    }
    if (table.activeOrderId) {
      setSelectedOrderId(table.activeOrderId);
      return;
    }
    const order = startOrder(tableId);
    setSelectedOrderId(order.id);
  };

  const handleRoomPost = () => {
    if (!trackedOrder || !roomSelection) {
      return;
    }
    const room = rooms.find((entry) => entry.roomNumber === roomSelection);
    const reservation = checkedInReservations.find((entry) => entry.roomNumbers.includes(roomSelection));
    postToRoom(trackedOrder.id, roomSelection, reservation?.guest?.firstName ?? room?.roomNumber);
  };

  const handleSendToKitchen = () => {
    if (!trackedOrder) {
      return;
    }
    const ticket = sendOrderToKitchen(trackedOrder.id);
    if (ticket) {
      addCharge(trackedOrder.id, { type: 'service', label: 'Smart Service', amount: Math.round(trackedOrder.items.length * 25) });
    }
  };

  const handleQuickSettle = () => {
    if (!trackedOrder) {
      return;
    }
    const remaining = totals.grand - totals.payments;
    if (remaining <= 0) {
      return;
    }
    recordPayment(trackedOrder.id, { amount: remaining, method: 'upi', reference: `POS-${Date.now()}` });
  };

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Light POS</h1>
          <p className="mt-1 text-sm text-gray-500">Fast, tablet-friendly order entry synced with your PMS.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="success">Menu {menu.length} items</Badge>
          <Badge variant="info">Tables {tables.length}</Badge>
          <Badge variant="warning">Active orders {orders.length}</Badge>
          <Badge variant="default">KOT queue {kotTickets.length}</Badge>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Dining Room</CardTitle>
                <CardDescription>Tap a table to open or resume orders</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="success">Vacant</Badge>
                <Badge variant="warning">Needs Attention</Badge>
                <Badge variant="default">Reserved</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleTableTap(table.id)}
                    className={cn(
                      'flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-3 text-center text-sm font-semibold shadow-sm transition active:scale-95',
                      table.status === 'vacant' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      table.status === 'occupied' && 'border-primary-200 bg-primary-50 text-primary-700',
                      table.status === 'reserved' && 'border-amber-200 bg-amber-50 text-amber-700',
                      table.status === 'needs-assistance' && 'border-red-200 bg-red-50 text-red-700'
                    )}
                  >
                    <span className="text-lg">{table.label}</span>
                    <span className="mt-1 text-xs font-medium opacity-80">{table.seats} pax</span>
                    {table.activeOrderId && <span className="mt-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-gray-700">Order</span>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Menu</CardTitle>
                <CardDescription>Tap to add items instantly</CardDescription>
              </div>
              <div className="flex gap-2">
                {CATEGORY_FILTERS.map((option) => {
                  const Icon = option.icon;
                  const active = categoryFilter === option.key;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setCategoryFilter(option.key)}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        active ? 'bg-primary-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredMenu.map((item) => (
                  <MenuTile key={item.id} item={item} onAdd={() => trackedOrder && addItemToOrder(trackedOrder.id, item)} onToggle={() => toggleMenuAvailability(item.id)} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20 border-0 bg-white shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Order Composer</CardTitle>
                  <CardDescription>Fast edit, split and post</CardDescription>
                </div>
                <Button variant="secondary" size="sm" className="gap-2" onClick={() => trackedOrder && sendOrderToKitchen(trackedOrder.id)} disabled={!trackedOrder || !trackedOrder.items.length}>
                  <Printer className="h-4 w-4" /> Print KOT
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderSelector orders={orders} selectedId={trackedOrder?.id} onSelect={setSelectedOrderId} />

              <div className="space-y-3">
                {trackedOrder && trackedOrder.items.length ? (
                  trackedOrder.items.map((line) => (
                    <div key={line.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{line.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(line.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => adjustQuantity(trackedOrder.id, line.id, -1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                        <Button variant="ghost" size="sm" onClick={() => adjustQuantity(trackedOrder.id, line.id, 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeLine(trackedOrder.id, line.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    Add menu items to build the order.
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Room Posting</p>
                <Select
                  value={roomSelection}
                  onChange={(event) => setRoomSelection(event.target.value)}
                  options={[{ label: 'Select checked-in room', value: '' }, ...checkedInReservations.flatMap((reservation) => reservation.roomNumbers.map((roomNumber) => ({ label: `${roomNumber} · ${reservation.guest?.firstName || 'Guest'}`, value: roomNumber })))]}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleRoomPost}
                  disabled={!trackedOrder || !trackedOrder.items.length || !roomSelection}
                >
                  <BedDouble className="h-4 w-4" /> Post to Room
                </Button>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3 text-sm text-gray-600 shadow-inner">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(totals.items)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Service (5%)</span>
                  <span>{formatCurrency(totals.service)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax (12%)</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                {trackedOrder?.charges.length ? (
                  <div className="space-y-1 pt-2 text-xs">
                    {trackedOrder.charges.map((charge, index) => (
                      <div key={`${charge.label}-${index}`} className="flex items-center justify-between text-gray-500">
                        <span>{charge.label}</span>
                        <span>{formatCurrency(charge.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(totals.grand)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Collected</span>
                  <span>{formatCurrency(totals.payments)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" className="flex-1 gap-2" onClick={handleSendToKitchen} disabled={!trackedOrder || !trackedOrder.items.length}>
                  <Send className="h-4 w-4" /> Send to Kitchen
                </Button>
                <Button variant="secondary" className="flex-1 gap-2" onClick={handleQuickSettle} disabled={!trackedOrder || totals.grand - totals.payments <= 0}>
                  <Wallet className="h-4 w-4" /> Close &amp; Pay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 bg-white shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>KOT Queue</CardTitle>
                <CardDescription>Live kitchen status across stations</CardDescription>
              </div>
              <Badge variant="info">Showing {activeTickets.length} of {kotTickets.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {activeTickets.length ? (
                activeTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ticket.kotNumber}</p>
                        <p className="text-xs text-gray-500">{ticket.tableLabel ? `Table ${ticket.tableLabel}` : ticket.roomNumber ? `Room ${ticket.roomNumber}` : 'Takeaway'}</p>
                      </div>
                      <Badge variant={ticket.status === 'queued' ? 'warning' : ticket.status === 'in-progress' ? 'info' : 'success'}>{ticket.status}</Badge>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-gray-600">
                      {ticket.items.map((line, index) => (
                        <li key={index} className="flex justify-between">
                          <span>{line.quantity} × {line.name}</span>
                          {line.notes && <span className="font-medium text-amber-600">{line.notes}</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex gap-2 text-xs">
                      <Button size="sm" variant="ghost" className="flex-1 gap-2" onClick={() => updateTicketStatus(ticket.id, 'in-progress')}>
                        <Smartphone className="h-4 w-4" /> Start
                      </Button>
                      <Button size="sm" variant="primary" className="flex-1 gap-2" onClick={() => updateTicketStatus(ticket.id, 'completed')}>
                        <Check className="h-4 w-4" /> Complete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
                  Kitchen is clear for now.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Menu Spotlight</CardTitle>
            <CardDescription>Availability and quick adjustments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            {menu.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)} · {item.category}</p>
                </div>
                <Button size="sm" variant={item.isAvailable ? 'secondary' : 'ghost'} onClick={() => toggleMenuAvailability(item.id)}>
                  {item.isAvailable ? 'Mark 86' : 'Resume'}
                </Button>
              </div>
            ))}
            <p className="text-xs text-gray-500">Manage full menu in Property Setup to control sections, pricing, and printer routing.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MenuTile({ item, onAdd, onToggle }: { item: POSMenuItem; onAdd: () => void; onToggle: () => void }) {
  return (
    <div className={cn('relative flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-lg', !item.isAvailable && 'opacity-60 grayscale')}
      onClick={item.isAvailable ? onAdd : undefined}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
        <span className="text-xs font-semibold text-gray-500">{formatCurrency(item.price)}</span>
      </div>
      {item.description && <p className="mt-2 text-xs text-gray-500 line-clamp-3">{item.description}</p>}
      {item.tags && item.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>{item.printerRoute ? `${item.printerRoute.toUpperCase()} printer` : 'Manual'}</span>
        <button onClick={(event) => { event.stopPropagation(); onToggle(); }} className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold">
          {item.isAvailable ? 'Available' : 'Sold out'}
        </button>
      </div>
    </div>
  );
}

interface OrderSelectorProps {
  orders: POSOrder[];
  selectedId?: string;
  onSelect: (orderId: string) => void;
}

function OrderSelector({ orders, selectedId, onSelect }: OrderSelectorProps) {
  if (!orders.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        Tap a table to begin a new order.
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {orders.map((order) => (
        <button
          key={order.id}
          onClick={() => onSelect(order.id)}
          className={cn(
            'min-w-[120px] rounded-2xl border px-3 py-2 text-left text-xs shadow-sm transition',
            order.id === selectedId ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-md' : 'border-gray-200 bg-white hover:border-primary-200'
          )}
        >
          <p className="font-semibold">{order.tableId ? `Table ${order.tableId}` : order.roomNumber ? `Room ${order.roomNumber}` : 'Unassigned'}</p>
          <p className="text-[11px] text-gray-500">{order.items.length} items</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">{order.status}</p>
        </button>
      ))}
    </div>
  );
}
