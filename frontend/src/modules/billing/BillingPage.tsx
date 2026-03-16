import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FileText, Plus, Trash2, SplitSquareVertical, Printer } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useReservationStore } from '../../stores/reservationStore';
import { usePropertyStore } from '../../stores/propertyStore';
import type { Reservation } from '../../types';
import { cn, formatCurrency } from '../../utils';

const CATEGORY_OPTIONS = [
  { value: 'room', label: 'Room Charge' },
  { value: 'extra-bed', label: 'Extra Bed' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'transport', label: 'Airport Transfer' },
  { value: 'other', label: 'Other' },
];

const BILL_OPTIONS = [
  { value: 'primary', label: 'Bill A' },
  { value: 'secondary', label: 'Bill B' },
];

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
];

type BillId = 'primary' | 'secondary';

type LineItem = {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitAmount: number;
  taxRate: number;
  bill: BillId;
  editable: boolean;
};

type PaymentEntry = {
  id: string;
  bill: BillId;
  mode: string;
  amount: number;
  reference?: string;
};

interface TotalsByBill {
  subtotal: number;
  tax: number;
  total: number;
  balance: number;
  payments: number;
  status: 'unpaid' | 'partial' | 'paid';
}

const splitTax = (totalTax: number) => {
  const half = Number((totalTax / 2).toFixed(2));
  return { cgst: half, sgst: totalTax - half };
};

const generateId = () => Math.random().toString(36).slice(2, 10);

export function BillingPage() {
  const { reservations } = useReservationStore();
  const { taxConfig } = usePropertyStore();
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [activeBill, setActiveBill] = useState<BillId>('primary');
  const [newPayment, setNewPayment] = useState({ mode: 'cash', amount: '', reference: '' });

  const gstRate = useMemo(() => {
    if (!taxConfig?.gstEnabled) {
      return 0;
    }
    return (taxConfig.cgst || 0) + (taxConfig.sgst || 0);
  }, [taxConfig]);

  const checkedInReservations = useMemo(() => {
    return reservations.filter((reservation) => reservation.status === 'checked-in' || reservation.status === 'confirmed');
  }, [reservations]);

  const selectedReservation = selectedReservationId
    ? reservations.find((reservation) => reservation.id === selectedReservationId) || null
    : null;

  useEffect(() => {
    if (!selectedReservation) {
      setLineItems([]);
      setPayments([]);
      return;
    }

    const autoItems = buildAutoItems(selectedReservation, gstRate);
    setLineItems(autoItems);
    setPayments([]);
    setInvoiceNumber(`INV-${selectedReservation.confirmationNumber}`);
    setIssueDate(format(new Date(), 'yyyy-MM-dd'));
  }, [selectedReservation, gstRate]);

  const totals = useMemo(() => {
    const base: Record<BillId, TotalsByBill> = {
      primary: { subtotal: 0, tax: 0, total: 0, payments: 0, balance: 0, status: 'unpaid' },
      secondary: { subtotal: 0, tax: 0, total: 0, payments: 0, balance: 0, status: 'unpaid' },
    };

    lineItems.forEach((item) => {
      const subtotal = item.quantity * item.unitAmount;
      const taxAmount = Number(((subtotal * item.taxRate) / 100).toFixed(2));
      base[item.bill].subtotal += subtotal;
      base[item.bill].tax += taxAmount;
      base[item.bill].total += subtotal + taxAmount;
    });

    payments.forEach((payment) => {
      base[payment.bill].payments += payment.amount;
    });

    (['primary', 'secondary'] as BillId[]).forEach((bill) => {
      const entry = base[bill];
      entry.balance = Number((entry.total - entry.payments).toFixed(2));
      if (!entry.total) {
        entry.status = 'unpaid';
        return;
      }
      if (entry.balance <= 0) {
        entry.status = 'paid';
      } else if (entry.payments > 0) {
        entry.status = 'partial';
      } else {
        entry.status = 'unpaid';
      }
    });

    return base;
  }, [lineItems, payments]);

  const handleLineItemChange = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleAddAddOn = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: 'Add-on service',
        category: 'other',
        quantity: 1,
        unitAmount: 0,
        taxRate: gstRate,
        bill: activeBill,
        editable: true,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddPayment = () => {
    const amountValue = Number(newPayment.amount);
    if (!amountValue || !selectedReservation) {
      return;
    }
    setPayments((prev) => [
      ...prev,
      {
        id: generateId(),
        bill: activeBill,
        mode: newPayment.mode,
        amount: Number(amountValue.toFixed(2)),
        reference: newPayment.reference || undefined,
      },
    ]);
    setNewPayment({ mode: newPayment.mode, amount: '', reference: '' });
  };

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handlePrintBill = () => {
    if (!selectedReservation) return;

    const printContent = generateBillHTML(
      selectedReservation,
      lineItems,
      payments,
      totals,
      invoiceNumber,
      issueDate,
      gstRate
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950">Billing &amp; Invoicing</h1>
          <p className="mt-1 text-sm text-zinc-500">Post charges, split bills, and generate GST-compliant invoices.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handlePrintBill}
            disabled={!selectedReservation}
          >
            <Printer className="h-4 w-4" /> Print Bill
          </Button>
          <Button variant="outline" className="gap-2">
            <SplitSquareVertical className="h-4 w-4" /> Split Charges
          </Button>
          <Button variant="primary" className="gap-2">
            <FileText className="h-4 w-4" /> Export Invoice
          </Button>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[320px,1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900">Select Reservation</p>
            <p className="mt-1 text-xs text-zinc-500">Auto posts room charges once a guest is checked-in.</p>

            <div className="mt-4 space-y-3">
              {checkedInReservations.map((reservation) => (
                <button
                  key={reservation.id}
                  onClick={() => setSelectedReservationId(reservation.id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition',
                    selectedReservationId === reservation.id
                      ? 'border-zinc-900 bg-zinc-50 shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  )}
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {reservation.guest.firstName} {reservation.guest.lastName}
                  </p>
                  <p className="text-xs text-zinc-500">{reservation.confirmationNumber}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {format(new Date(reservation.checkIn), 'MMM d')} - {format(new Date(reservation.checkOut), 'MMM d')} • {reservation.nights} nights
                  </p>
                </button>
              ))}

              {!checkedInReservations.length && (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                  No active reservations ready for billing.
                </div>
              )}
            </div>
          </div>

          {selectedReservation && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-zinc-900">Invoice Details</p>
              <Input
                label="Invoice Number"
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
              />
              <Input
                label="Issue Date"
                type="date"
                value={issueDate}
                onChange={(event) => setIssueDate(event.target.value)}
              />
              <Select
                label="Active Bill"
                value={activeBill}
                onChange={(event) => setActiveBill(event.target.value as BillId)}
                options={BILL_OPTIONS}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedReservation ? (
            <>
              <BillBreakdown
                items={lineItems}
                onChange={handleLineItemChange}
                onRemove={handleRemoveLine}
                onAddAddOn={handleAddAddOn}
              />

              <PaymentSection
                activeBill={activeBill}
                payments={payments}
                totals={totals}
                newPayment={newPayment}
                onNewPaymentChange={setNewPayment}
                onAddPayment={handleAddPayment}
                onRemovePayment={handleRemovePayment}
              />

              <InvoicePreview
                reservation={selectedReservation}
                invoiceNumber={invoiceNumber}
                issueDate={issueDate}
                items={lineItems}
                totals={totals}
                gstRate={gstRate}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
              Select a reservation to start billing.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface BillBreakdownProps {
  items: LineItem[];
  onChange: (id: string, updates: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
  onAddAddOn: () => void;
}

function BillBreakdown({ items, onChange, onRemove, onAddAddOn }: BillBreakdownProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Bill Breakdown</p>
          <p className="text-xs text-gray-500">Edit line items and assign them across split bills.</p>
        </div>
        <Button variant="secondary" onClick={onAddAddOn} className="h-9 gap-2">
          <Plus className="h-4 w-4" /> Add Add-on
        </Button>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Description</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Bill</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Rate</th>
              <th className="px-3 py-3">Tax %</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const amount = item.quantity * item.unitAmount;
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-6 py-3">
                    <Input
                      value={item.description}
                      onChange={(event) => onChange(item.id, { description: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Select
                      value={item.category}
                      onChange={(event) => onChange(item.id, { category: event.target.value })}
                      options={CATEGORY_OPTIONS}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Select
                      value={item.bill}
                      onChange={(event) => onChange(item.id, { bill: event.target.value as BillId })}
                      options={BILL_OPTIONS}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => onChange(item.id, { quantity: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min="0"
                      value={item.unitAmount}
                      onChange={(event) => onChange(item.id, { unitAmount: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min="0"
                      value={item.taxRate}
                      onChange={(event) => onChange(item.id, { taxRate: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(amount)}
                  </td>
                  <td className="px-3 py-3">
                    {item.editable && (
                      <button
                        onClick={() => onRemove(item.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {!items.length && (
              <tr>
                <td colSpan={8} className="px-6 py-6 text-center text-sm text-gray-500">
                  No charges posted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PaymentSectionProps {
  activeBill: BillId;
  payments: PaymentEntry[];
  totals: Record<BillId, TotalsByBill>;
  newPayment: { mode: string; amount: string; reference: string };
  onNewPaymentChange: (value: { mode: string; amount: string; reference: string }) => void;
  onAddPayment: () => void;
  onRemovePayment: (id: string) => void;
}

function PaymentSection({
  activeBill,
  payments,
  totals,
  newPayment,
  onNewPaymentChange,
  onAddPayment,
  onRemovePayment,
}: PaymentSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Payments</p>
          <p className="text-xs text-gray-500">Track settlement across split bills.</p>
        </div>
      </header>

      <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
        {(['primary', 'secondary'] as BillId[]).map((bill) => (
          <div key={bill} className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">{bill === 'primary' ? 'Bill A' : 'Bill B'}</p>
            <p className="mt-1 text-xs text-gray-500">Status: {totals[bill].status.toUpperCase()}</p>
            <dl className="mt-3 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(totals[bill].subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>GST</dt>
                <dd>{formatCurrency(totals[bill].tax)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <dt>Total</dt>
                <dd>{formatCurrency(totals[bill].total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <dt>Payments</dt>
                <dd>{formatCurrency(totals[bill].payments)}</dd>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <dt>Balance</dt>
                <dd className={totals[bill].balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {formatCurrency(totals[bill].balance)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 px-6 py-4">
        <p className="text-xs font-semibold uppercase text-gray-500">
          Add Payment ({activeBill === 'primary' ? 'Bill A' : 'Bill B'})
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[160px,1fr,1fr,auto]">
          <Select
            value={newPayment.mode}
            onChange={(event) => onNewPaymentChange({ ...newPayment, mode: event.target.value })}
            options={PAYMENT_MODES}
          />
          <Input
            placeholder="Amount"
            type="number"
            min="0"
            value={newPayment.amount}
            onChange={(event) => onNewPaymentChange({ ...newPayment, amount: event.target.value })}
          />
          <Input
            placeholder="Reference"
            value={newPayment.reference}
            onChange={(event) => onNewPaymentChange({ ...newPayment, reference: event.target.value })}
          />
          <Button onClick={onAddPayment} className="h-10">Add</Button>
        </div>

        <div className="mt-4 space-y-2">
          {payments.length ? (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                    payment.bill === 'primary' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'
                  )}>
                    {payment.bill === 'primary' ? 'Bill A' : 'Bill B'}
                  </span>
                  <span className="font-medium text-gray-900">{formatCurrency(payment.amount)}</span>
                  <span>{payment.mode.toUpperCase()}</span>
                  {payment.reference && <span className="text-xs text-gray-400">Ref: {payment.reference}</span>}
                </div>
                <button
                  onClick={() => onRemovePayment(payment.id)}
                  className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove payment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No payments recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface InvoicePreviewProps {
  reservation: Reservation;
  invoiceNumber: string;
  issueDate: string;
  items: LineItem[];
  totals: Record<BillId, TotalsByBill>;
  gstRate: number;
}

function InvoicePreview({ reservation, invoiceNumber, issueDate, items, totals, gstRate }: InvoicePreviewProps) {
  const combinedSubtotal = totals.primary.subtotal + totals.secondary.subtotal;
  const combinedTax = totals.primary.tax + totals.secondary.tax;
  const combinedTotal = totals.primary.total + totals.secondary.total;
  const combinedPayments = totals.primary.payments + totals.secondary.payments;
  const { cgst, sgst } = splitTax(combinedTax);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Invoice Preview</p>
          <p className="text-xs text-gray-500">Print-ready layout with GST breakup.</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Invoice #{invoiceNumber}</p>
          <p>Issued {issueDate}</p>
        </div>
      </header>

      <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Billed To</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {reservation.guest.firstName} {reservation.guest.lastName}
          </p>
          <p className="text-xs text-gray-500">{reservation.guest.email || reservation.guest.phone}</p>
          {reservation.guest.address && (
            <p className="mt-1 text-xs text-gray-500">
              {reservation.guest.address.street}, {reservation.guest.address.city}, {reservation.guest.address.state}
            </p>
          )}
        </div>
        <div className="text-xs text-gray-500">
          <p><span className="font-semibold">Stay:</span> {format(new Date(reservation.checkIn), 'MMM d, yyyy')} - {format(new Date(reservation.checkOut), 'MMM d, yyyy')}</p>
          <p className="mt-1"><span className="font-semibold">Nights:</span> {reservation.nights}</p>
          <p className="mt-1"><span className="font-semibold">Room Type:</span> {reservation.roomTypeId}</p>
          <p className="mt-1"><span className="font-semibold">Invoice GST:</span> {gstRate}%</p>
        </div>
      </div>

      <div className="px-6">
        <table className="w-full table-auto text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Rate</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-400">{item.category.replace('-', ' ')}</p>
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(item.unitAmount)}</td>
                <td className="py-2 text-right">{formatCurrency(item.quantity * item.unitAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 border-t border-gray-200 px-6 py-6 md:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700">Payment Summary</p>
          <p className="mt-2">Total Payments: {formatCurrency(combinedPayments)}</p>
          <p className="mt-1">Balance Due: {formatCurrency(combinedTotal - combinedPayments)}</p>
          <p className="mt-2">Bill A: {totals.primary.status.toUpperCase()}</p>
          <p className="mt-1">Bill B: {totals.secondary.status.toUpperCase()}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(combinedSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST</span>
            <span>{formatCurrency(cgst)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST</span>
            <span>{formatCurrency(sgst)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Grand Total</span>
            <span>{formatCurrency(combinedTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAutoItems(reservation: Reservation, gstRate: number): LineItem[] {
  const nights = reservation.nights || 1;
  const baseRate = reservation.ratePerNight || reservation.subtotal / (reservation.nights || 1);

  return [
    {
      id: generateId(),
      description: `Room charges (${nights} night${nights > 1 ? 's' : ''})`,
      category: 'room',
      quantity: nights,
      unitAmount: Number(baseRate.toFixed(2)),
      taxRate: gstRate,
      bill: 'primary',
      editable: false,
    },
  ];
}

function generateBillHTML(
  reservation: Reservation,
  lineItems: LineItem[],
  payments: PaymentEntry[],
  totals: Record<BillId, TotalsByBill>,
  invoiceNumber: string,
  issueDate: string,
  gstRate: number
): string {
  const combinedSubtotal = totals.primary.subtotal + totals.secondary.subtotal;
  const combinedTax = totals.primary.tax + totals.secondary.tax;
  const combinedTotal = totals.primary.total + totals.secondary.total;
  const combinedPayments = totals.primary.payments + totals.secondary.payments;
  const balance = combinedTotal - combinedPayments;

  const cgst = combinedTax / 2;
  const sgst = combinedTax / 2;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 5px 0; color: #666; }
        .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-section { padding: 15px; background: #f9f9f9; border-radius: 8px; }
        .info-section h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { padding: 12px; text-align: left; border-bottom: 2px solid #000; background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
        .table td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
        .table .text-right { text-align: right; }
        .totals { margin-top: 20px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .totals-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 12px; margin-top: 8px; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
        @media print { 
          body { padding: 20px; } 
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NexusNext</h1>
        <p style="font-size: 12px; margin-top: 5px;">Hospitality Customized</p>
        <h2 style="margin-top: 15px;">TAX INVOICE</h2>
      </div>
      
      <div class="invoice-info">
        <div class="info-section">
          <h3>Invoice Details</h3>
          <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
          <p><strong>Date:</strong> ${format(new Date(issueDate), 'MMM dd, yyyy')}</p>
          <p><strong>Confirmation:</strong> ${reservation.confirmationNumber}</p>
        </div>
        <div class="info-section">
          <h3>Guest Information</h3>
          <p><strong>Name:</strong> ${reservation.guest.firstName} ${reservation.guest.lastName}</p>
          <p><strong>Email:</strong> ${reservation.guest.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${reservation.guest.phone || 'N/A'}</p>
        </div>
      </div>

      <div class="info-section" style="margin: 20px 0;">
        <h3>Stay Details</h3>
        <p><strong>Check-in:</strong> ${format(new Date(reservation.checkIn), 'MMM dd, yyyy')}</p>
        <p><strong>Check-out:</strong> ${format(new Date(reservation.checkOut), 'MMM dd, yyyy')}</p>
        <p><strong>Nights:</strong> ${reservation.nights}</p>
        <p><strong>Room(s):</strong> ${reservation.roomNumbers?.join(', ') || 'N/A'}</p>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">GST</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map((item) => {
            const subtotal = item.quantity * item.unitAmount;
            const taxAmount = (subtotal * item.taxRate) / 100;
            const total = subtotal + taxAmount;
            return `
            <tr>
              <td>
                <strong>${item.description}</strong><br>
                <span style="font-size: 11px; color: #666;">${item.category.replace('-', ' ')}</span>
              </td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.unitAmount)}</td>
              <td class="text-right">${item.taxRate}%</td>
              <td class="text-right">${formatCurrency(total)}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(combinedSubtotal)}</span>
        </div>
        <div class="totals-row">
          <span>CGST (${(gstRate / 2).toFixed(2)}%):</span>
          <span>${formatCurrency(cgst)}</span>
        </div>
        <div class="totals-row">
          <span>SGST (${(gstRate / 2).toFixed(2)}%):</span>
          <span>${formatCurrency(sgst)}</span>
        </div>
        <div class="totals-row grand">
          <span>Grand Total:</span>
          <span>${formatCurrency(combinedTotal)}</span>
        </div>
        <div class="totals-row">
          <span>Amount Paid:</span>
          <span>${formatCurrency(combinedPayments)}</span>
        </div>
        <div class="totals-row" style="font-weight: bold; color: ${balance > 0 ? '#dc2626' : '#16a34a'};">
          <span>Balance Due:</span>
          <span>${formatCurrency(balance)}</span>
        </div>
      </div>

      ${payments.length > 0 ? `
      <div class="info-section" style="margin-top: 30px;">
        <h3>Payment Details</h3>
        ${payments.map((payment) => `
          <p><strong>${payment.mode.toUpperCase()}:</strong> ${formatCurrency(payment.amount)} ${payment.reference ? `(Ref: ${payment.reference})` : ''}</p>
        `).join('')}
      </div>
      ` : ''}

      <div class="footer">
        <p><strong>Thank you for your patronage!</strong></p>
        <p>We look forward to welcoming you again.</p>
        <p style="margin-top: 15px; font-size: 10px;">This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </body>
    </html>
  `;
}

