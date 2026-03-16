import { usePropertyStore } from '../../../stores/propertyStore';
import { useReservationStore } from '../../../stores/reservationStore';

interface PricingBreakdownProps {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
}

export function PricingBreakdown({ roomTypeId, ratePlanId, checkIn, checkOut }: PricingBreakdownProps) {
  const { roomTypes, taxConfig } = usePropertyStore();
  const { ratePlans } = useReservationStore();

  const roomType = roomTypes.find(rt => rt.id === roomTypeId);
  const ratePlan = ratePlans.find(rp => rp.id === ratePlanId);

  if (!roomType || !ratePlan) {
    return null;
  }

  // Calculate nights
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Calculate pricing
  const baseRate = roomType.baseRate;
  const discountAmount = baseRate * (ratePlan.discountPercentage / 100);
  const ratePerNight = baseRate - discountAmount;
  const subtotal = ratePerNight * nights;

  // Calculate taxes
  let serviceCharge = 0;
  let gstAmount = 0;
  let luxuryTax = 0;

  if (taxConfig?.serviceChargeEnabled) {
    serviceCharge = subtotal * (taxConfig.serviceChargePercentage / 100);
  }

  if (taxConfig?.gstEnabled) {
    const taxableAmount = subtotal + serviceCharge;
    gstAmount = taxableAmount * ((taxConfig.cgst + taxConfig.sgst) / 100);
  }

  if (taxConfig?.luxuryTaxEnabled) {
    luxuryTax = subtotal * (taxConfig.luxuryTaxPercentage / 100);
  }

  const totalTax = serviceCharge + gstAmount + luxuryTax;
  const totalAmount = subtotal + totalTax;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h4 className="font-semibold text-gray-900">Pricing Breakdown</h4>
      
      <div className="space-y-2 text-sm">
        {/* Room Rate */}
        <div className="flex justify-between">
          <span className="text-gray-600">Room Rate (Base)</span>
          <span className="text-gray-900">₹{baseRate.toLocaleString()} × {nights} night(s)</span>
        </div>

        {/* Discount */}
        {ratePlan.discountPercentage > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({ratePlan.discountPercentage}%)</span>
            <span>- ₹{discountAmount.toLocaleString()}</span>
          </div>
        )}

        {/* Subtotal */}
        <div className="flex justify-between font-medium pt-2 border-t">
          <span className="text-gray-900">Subtotal</span>
          <span className="text-gray-900">₹{subtotal.toLocaleString()}</span>
        </div>

        {/* Service Charge */}
        {taxConfig?.serviceChargeEnabled && serviceCharge > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Service Charge ({taxConfig.serviceChargePercentage}%)</span>
            <span className="text-gray-900">₹{serviceCharge.toLocaleString()}</span>
          </div>
        )}

        {/* GST */}
        {taxConfig?.gstEnabled && gstAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">
              GST (CGST {taxConfig.cgst}% + SGST {taxConfig.sgst}%)
            </span>
            <span className="text-gray-900">₹{gstAmount.toLocaleString()}</span>
          </div>
        )}

        {/* Luxury Tax */}
        {taxConfig?.luxuryTaxEnabled && luxuryTax > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Luxury Tax ({taxConfig.luxuryTaxPercentage}%)</span>
            <span className="text-gray-900">₹{luxuryTax.toLocaleString()}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-bold pt-3 border-t-2">
          <span className="text-gray-900">Total Amount</span>
          <span className="text-primary-600">₹{totalAmount.toLocaleString()}</span>
        </div>

        {/* Per Night Average */}
        <div className="flex justify-between text-xs text-gray-500 pt-1">
          <span>Average per night</span>
          <span>₹{Math.round(totalAmount / nights).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
