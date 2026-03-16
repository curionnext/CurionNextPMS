import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isBefore } from 'date-fns';
import { 
  Check, 
  X, 
  DollarSign, 
  Printer, 
  AlertCircle,
  CreditCard,
  Wallet,
  ArrowRight,
  Home,
  Search,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { useReservationStore } from '../../../stores/reservationStore';
import { usePropertyStore } from '../../../stores/propertyStore';
import { useAuthStore } from '../../../stores/authStore';
import { formatCurrency, cn } from '../../../utils';
import { generateTransactionReference } from '../../../utils/transactionLogger';
import { useTransactionLogStore } from '../../../stores/transactionLogStore';
import type { Reservation, PaymentMethod } from '../../../types';

type CheckoutStep = 'select' | 'review' | 'payment' | 'complete';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: DollarSign },
  { value: 'bank-transfer', label: 'Bank Transfer', icon: DollarSign },
];

export function CheckOutFlow() {
  const { reservations, checkOut, hydrateFromBackend } = useReservationStore();
  const { rooms, updateRoomStatus, taxConfig } = usePropertyStore();
  const { user } = useAuthStore();
  const { logTransaction } = useTransactionLogStore();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Get checked-in reservations
  const departures = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    const today = new Date();
    
    return reservations
      .filter((res) => res.status === 'checked-in')
      .filter((res) => {
        if (!lower) return true;
        const guestName = `${res.guest.firstName} ${res.guest.lastName}`.toLowerCase();
        return (
          res.confirmationNumber.toLowerCase().includes(lower) ||
          guestName.includes(lower) ||
          res.roomNumbers?.join(' ').toLowerCase().includes(lower)
        );
      })
      .map((res) => {
        const checkOutDate = parseISO(res.checkOut);
        const isDueToday = isToday(checkOutDate);
        const isOverdue = isBefore(checkOutDate, today);
        return { ...res, isDueToday, isOverdue };
      })
      .sort((a, b) => {
        // Sort: overdue first, then due today, then by checkout date
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1;
        return new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime();
      });
  }, [reservations, searchTerm]);

  const reservation = selectedReservation;

  const gstRate = taxConfig?.gstEnabled 
    ? ((taxConfig.cgst || 0) + (taxConfig.sgst || 0))
    : 0;

  // Calculate totals
  const roomCharges = reservation?.subtotal || 0;
  const subtotal = roomCharges + additionalCharges - discount;
  const finalTax = (subtotal * gstRate) / 100;
  const grandTotal = subtotal + finalTax;

  const handleSelectReservation = (res: Reservation) => {
    setSelectedReservation(res);
    setCurrentStep('review');
  };

  const handleBackToSelection = () => {
    setSelectedReservation(null);
    setCurrentStep('select');
    setAdditionalCharges(0);
    setDiscount(0);
    setPaymentAmount('');
    setPaymentReference('');
  };

  const handleProceedToPayment = () => {
    setPaymentAmount(grandTotal.toFixed(2));
    // Auto-generate transaction reference if not already set
    if (!paymentReference) {
      setPaymentReference(generateTransactionReference());
    }
    setCurrentStep('payment');
  };

  const handleProcessCheckout = async () => {
    if (!reservation) return;
    if (!paymentAmount || parseFloat(paymentAmount) < grandTotal) {
      alert('Payment amount must cover the total bill');
      return reservation.id
    }

    setIsProcessing(true);

    try {
      // Build settlement data
      const paymentMethodMap: Record<string, PaymentMethod> = {
        'cash': 'cash',
        'card': 'card',
        'upi': 'upi',
        'bank-transfer': 'bank-transfer'
      };

      // Log payment transaction
      await logTransaction({
        eventType: 'PAYMENT_RECEIVED',
        entityType: 'PAYMENT',
        entityId: paymentReference,
        description: `Payment received for ${reservation.confirmationNumber} - ${paymentMode.toUpperCase()}`,
        metadata: {
          reservationId: reservation.id,
          guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
          amount: parseFloat(paymentAmount),
          paymentMode,
          reference: paymentReference,
        },
      });

      await checkOut({
        reservationId: reservation.id,
        settlement: {
          roomCharges: reservation.subtotal || 0,
          additionalCharges: additionalCharges > 0 ? [
            {
              id: `charge-${Date.now()}`,
              description: 'Additional Charges',
              category: 'other' as const,
              amount: additionalCharges,
            }
          ] : [],
          taxes: finalTax,
          discounts: discount,
          payments: [
            {
              method: paymentMethodMap[paymentMode] || 'cash',
              amount: parseFloat(paymentAmount),
              reference: paymentReference || undefined,
              notes: undefined,
            }
          ],
          notes: undefined,
        },
        handledBy: user?.name || 'System',
        checkOutTime: new Date().toISOString(),
      });

      // Log checkout transaction
      await logTransaction({
        eventType: 'CHECK_OUT',
        entityType: 'RESERVATION',
        entityId: reservation.id,
        description: `Guest checked out: ${reservation.guest.firstName} ${reservation.guest.lastName} from ${reservation.roomNumbers?.join(', ')}`,
        metadata: {
          confirmationNumber: reservation.confirmationNumber,
          guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
          rooms: reservation.roomNumbers,
          totalAmount: grandTotal,
          paymentMode,
          paymentReference,
        },
        previousState: { status: 'checked-in' },
        newState: { status: 'checked-out' },
      });

      // Update room status to dirty
      if (reservation.roomNumbers) {
        for (const roomNumber of reservation.roomNumbers) {
          const room = rooms.find((r) => r.roomNumber === roomNumber);
          if (room) {
            await updateRoomStatus(room.id, 'dirty');
            // Log room status change
            await logTransaction({
              eventType: 'ROOM_STATUS_CHANGED',
              entityType: 'ROOM',
              entityId: room.id,
              description: `Room ${roomNumber} marked as dirty after checkout`,
              metadata: {
                roomNumber,
                reservationId: reservation.id,
              },
              previousState: { status: room.status },
              newState: { status: 'dirty' },
            });
          }
        }
      }

      setCurrentStep('complete');
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to process checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintBill = () => {
    if (!reservation) return;
    
    const printContent = generateBillHTML(reservation, {
      additionalCharges,
      discount,
      subtotal,
      finalTax,
      grandTotal,
      paymentMode,
      paymentReference,
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleFinish = () => {
    setSelectedReservation(null);
    setCurrentStep('select');
    setAdditionalCharges(0);
    setDiscount(0);
    setPaymentAmount('');
    setPaymentReference('');
    // Refresh reservations to ensure list is up to date
    hydrateFromBackend();
  };

  // Step 1: Select reservation
  if (currentStep === 'select') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search by guest name, confirmation number, or room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {departures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <p className="text-zinc-600 font-medium mb-2">No guests ready for checkout</p>
              <p className="text-sm text-zinc-500">
                {searchTerm
                  ? 'Try adjusting your search filters'
                  : 'All checked-in guests will appear here when their checkout date approaches'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {departures.map((res) => (
              <button
                key={res.id}
                onClick={() => handleSelectReservation(res)}
                className={cn(
                  'w-full rounded-xl border-2 p-4 text-left transition-all hover:border-zinc-300 hover:shadow-md',
                  res.isOverdue
                    ? 'border-red-200 bg-red-50'
                    : res.isDueToday
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-zinc-200 bg-white'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-lg font-semibold text-zinc-900">
                        {res.guest.firstName} {res.guest.lastName}
                      </p>
                      {res.isOverdue && (
                        <Badge variant="danger">Overdue</Badge>
                      )}
                      {res.isDueToday && !res.isOverdue && (
                        <Badge variant="warning">Due Today</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-zinc-600">
                      <p>
                        <span className="font-medium">Room:</span> {res.roomNumbers?.join(', ') || 'Not assigned'}
                      </p>
                      <p>
                        <span className="font-medium">Confirmation:</span> {res.confirmationNumber}
                      </p>
                      <p>
                        <span className="font-medium">Check-in:</span> {format(parseISO(res.checkIn), 'MMM d, yyyy')}
                      </p>
                      <p>
                        <span className="font-medium">Check-out:</span> {format(parseISO(res.checkOut), 'MMM d, yyyy')}
                      </p>
                      <p>
                        <span className="font-medium">Nights:</span> {res.nights}
                      </p>
                      <p>
                        <span className="font-medium">Total:</span> {formatCurrency(res.totalAmount || 0)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!reservation) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600">Please select a reservation to checkout</p>
          <Button onClick={handleBackToSelection} variant="outline" className="mt-4">
            Back to Selection
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'complete') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">Checkout Complete!</h3>
          <p className="text-zinc-600 mb-6">
            {reservation.guest.firstName} {reservation.guest.lastName} has been successfully checked out from {reservation.roomNumbers?.join(', ')}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handlePrintBill} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={handleFinish} variant="primary">
              <Home className="h-4 w-4 mr-2" />
              Return to Front Desk
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'payment') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Collection</CardTitle>
            <CardDescription>Collect payment for the total amount due</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-600">Total Amount Due</span>
                <span className="text-2xl font-bold text-zinc-900">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-2">Payment Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setPaymentMode(mode.value)}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        paymentMode === mode.value
                          ? 'border-zinc-900 bg-zinc-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <Icon className="h-5 w-5 text-zinc-600" />
                      <span className="text-sm font-medium text-zinc-900">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-2">Payment Amount</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                step="0.01"
              />
            </div>

            {(paymentMode === 'card' || paymentMode === 'upi' || paymentMode === 'bank-transfer') && (
              <div>
                <label className="block text-sm font-medium text-zinc-900 mb-2">
                  Reference/Transaction ID (Optional)
                </label>
                <Input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter transaction reference"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => setCurrentStep('review')} variant="outline" className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Back to Review
          </Button>
          <Button 
            onClick={handleProcessCheckout} 
            variant="primary" 
            className="flex-1"
            disabled={isProcessing || !paymentAmount}
          >
            {isProcessing ? 'Processing...' : 'Complete Checkout'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Review step
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Checkout Review</CardTitle>
          <CardDescription>Review charges before proceeding with checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Guest & Reservation Info */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-200">
            <div>
              <p className="text-xs text-zinc-500">Guest Name</p>
              <p className="font-medium text-zinc-900">{reservation.guest.firstName} {reservation.guest.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Room(s)</p>
              <p className="font-medium text-zinc-900">{reservation.roomNumbers?.join(', ')}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Check-in</p>
              <p className="font-medium text-zinc-900">{reservation.checkIn}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Check-out</p>
              <p className="font-medium text-zinc-900">{reservation.checkOut}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Nights</p>
              <p className="font-medium text-zinc-900">{reservation.nights}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Confirmation</p>
              <p className="font-medium text-zinc-900">{reservation.confirmationNumber}</p>
            </div>
          </div>

          {/* Charges Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Room Charges ({reservation.nights} nights)</span>
              <span className="font-medium text-zinc-900">{formatCurrency(roomCharges)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-2">Additional Charges</label>
              <Input
                type="number"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-2">Discount</label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="pt-3 border-t border-zinc-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Subtotal</span>
                <span className="font-medium text-zinc-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Tax ({gstRate}%)</span>
                <span className="font-medium text-zinc-900">{formatCurrency(finalTax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-200">
                <span className="text-zinc-900">Grand Total</span>
                <span className="text-zinc-900">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleBackToSelection} variant="outline" className="flex-1">
          <X className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleProceedToPayment} variant="primary" className="flex-1">
          Proceed to Payment
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function generateBillHTML(
  reservation: Reservation,
  billData: {
    additionalCharges: number;
    discount: number;
    subtotal: number;
    finalTax: number;
    grandTotal: number;
    paymentMode: string;
    paymentReference: string;
  }
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${reservation.confirmationNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-info { margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f5f5f5; }
        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NexusNext</h1>
        <p>Hospitality Customized</p>
        <h2>Tax Invoice</h2>
      </div>
      
      <div class="invoice-info">
        <p><strong>Invoice Number:</strong> INV-${reservation.confirmationNumber}</p>
        <p><strong>Date:</strong> ${format(new Date(), 'MMM dd, yyyy')}</p>
        <p><strong>Guest Name:</strong> ${reservation.guest.firstName} ${reservation.guest.lastName}</p>
        <p><strong>Room(s):</strong> ${reservation.roomNumbers?.join(', ')}</p>
        <p><strong>Check-in:</strong> ${reservation.checkIn}</p>
        <p><strong>Check-out:</strong> ${reservation.checkOut}</p>
        <p><strong>Nights:</strong> ${reservation.nights}</p>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Room Charges</td>
            <td>${reservation.nights}</td>
            <td>${formatCurrency((reservation.subtotal || 0) / (reservation.nights || 1))}</td>
            <td>${formatCurrency(reservation.subtotal || 0)}</td>
          </tr>
          ${billData.additionalCharges > 0 ? `
          <tr>
            <td>Additional Charges</td>
            <td>1</td>
            <td>${formatCurrency(billData.additionalCharges)}</td>
            <td>${formatCurrency(billData.additionalCharges)}</td>
          </tr>
          ` : ''}
          ${billData.discount > 0 ? `
          <tr>
            <td>Discount</td>
            <td>1</td>
            <td>-${formatCurrency(billData.discount)}</td>
            <td>-${formatCurrency(billData.discount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
            <td><strong>${formatCurrency(billData.subtotal)}</strong></td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Tax:</strong></td>
            <td><strong>${formatCurrency(billData.finalTax)}</strong></td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right; font-size: 18px;"><strong>Grand Total:</strong></td>
            <td style="font-size: 18px;"><strong>${formatCurrency(billData.grandTotal)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div>
        <p><strong>Payment Mode:</strong> ${billData.paymentMode.toUpperCase()}</p>
        ${billData.paymentReference ? `<p><strong>Reference:</strong> ${billData.paymentReference}</p>` : ''}
        <p><strong>Status:</strong> PAID</p>
      </div>

      <div style="margin-top: 40px; text-align: center; color: #666;">
        <p>Thank you for staying with us!</p>
        <p>We hope to see you again soon.</p>
      </div>
    </body>
    </html>
  `;
}

