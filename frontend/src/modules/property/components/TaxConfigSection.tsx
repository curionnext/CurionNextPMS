import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { usePropertyStore } from '../../../stores/propertyStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function TaxConfigSection() {
  const { taxConfig, updateTaxConfig } = usePropertyStore();
  const [formData, setFormData] = useState({
    gstEnabled: true,
    cgst: '6',
    sgst: '6',
    igst: '12',
    serviceChargeEnabled: true,
    serviceChargePercentage: '10',
    luxuryTaxEnabled: false,
    luxuryTaxPercentage: '0',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  useEffect(() => {
    if (taxConfig) {
      setFormData({
        gstEnabled: taxConfig.gstEnabled,
        cgst: taxConfig.cgst.toString(),
        sgst: taxConfig.sgst.toString(),
        igst: taxConfig.igst.toString(),
        serviceChargeEnabled: taxConfig.serviceChargeEnabled,
        serviceChargePercentage: taxConfig.serviceChargePercentage.toString(),
        luxuryTaxEnabled: taxConfig.luxuryTaxEnabled,
        luxuryTaxPercentage: taxConfig.luxuryTaxPercentage.toString(),
      });
      setOperationError(null);
    }
  }, [taxConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOperationError(null);

    const toNumber = (value: string) => Number.parseFloat(value || '0') || 0;

    try {
      await updateTaxConfig({
        gstEnabled: formData.gstEnabled,
        cgst: toNumber(formData.cgst),
        sgst: toNumber(formData.sgst),
        igst: toNumber(formData.igst),
        serviceChargeEnabled: formData.serviceChargeEnabled,
        serviceChargePercentage: toNumber(formData.serviceChargePercentage),
        luxuryTaxEnabled: formData.luxuryTaxEnabled,
        luxuryTaxPercentage: toNumber(formData.luxuryTaxPercentage),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tax configuration.';
      setOperationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toAmount = (value: string) => Number.parseFloat(value || '0') || 0;
  const sampleBase = 10000;
  const serviceChargeValue = formData.serviceChargeEnabled ? (sampleBase * toAmount(formData.serviceChargePercentage)) / 100 : 0;
  const gstValue = formData.gstEnabled ? (sampleBase * (toAmount(formData.cgst) + toAmount(formData.sgst))) / 100 : 0;
  const luxuryValue = formData.luxuryTaxEnabled ? (sampleBase * toAmount(formData.luxuryTaxPercentage)) / 100 : 0;
  const totalAmount = sampleBase + serviceChargeValue + gstValue + luxuryValue;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tax Configuration</h2>
      </div>

      {operationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {operationError}
        </div>
      )}

      {/* GST Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">GST (Goods and Services Tax)</h3>
            <p className="text-sm text-gray-500">Configure GST rates for your property</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.gstEnabled}
              onChange={(e) => setFormData({ ...formData, gstEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.gstEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4">
            <Input
              label="CGST (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.cgst}
              onChange={(e) => setFormData({ ...formData, cgst: e.target.value })}
              helperText="Central GST"
            />
            <Input
              label="SGST (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.sgst}
              onChange={(e) => setFormData({ ...formData, sgst: e.target.value })}
              helperText="State GST"
            />
            <Input
              label="IGST (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.igst}
              onChange={(e) => setFormData({ ...formData, igst: e.target.value })}
              helperText="Integrated GST"
            />
          </div>
        )}
      </div>

      {/* Service Charge */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Service Charge</h3>
            <p className="text-sm text-gray-500">Add service charge to bills</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.serviceChargeEnabled}
              onChange={(e) => setFormData({ ...formData, serviceChargeEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.serviceChargeEnabled && (
          <div className="pl-4">
            <Input
              label="Service Charge (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.serviceChargePercentage}
              onChange={(e) => setFormData({ ...formData, serviceChargePercentage: e.target.value })}
              helperText="Percentage of base amount"
            />
          </div>
        )}
      </div>

      {/* Luxury Tax */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Luxury Tax</h3>
            <p className="text-sm text-gray-500">Additional tax for luxury properties</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.luxuryTaxEnabled}
              onChange={(e) => setFormData({ ...formData, luxuryTaxEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {formData.luxuryTaxEnabled && (
          <div className="pl-4">
            <Input
              label="Luxury Tax (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.luxuryTaxPercentage}
              onChange={(e) => setFormData({ ...formData, luxuryTaxPercentage: e.target.value })}
              helperText="Percentage of base amount"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Tax Calculation Preview</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Base Amount</span>
            <span className="font-medium">₹10,000.00</span>
          </div>
          {formData.serviceChargeEnabled && (
            <div className="flex justify-between text-primary-600">
              <span>Service Charge ({formData.serviceChargePercentage}%)</span>
              <span className="font-medium">
                ₹{serviceChargeValue.toFixed(2)}
              </span>
            </div>
          )}
          {formData.gstEnabled && (
            <div className="flex justify-between text-primary-600">
              <span>GST (CGST {formData.cgst}% + SGST {formData.sgst}%)</span>
              <span className="font-medium">
                ₹{gstValue.toFixed(2)}
              </span>
            </div>
          )}
          {formData.luxuryTaxEnabled && (
            <div className="flex justify-between text-primary-600">
              <span>Luxury Tax ({formData.luxuryTaxPercentage}%)</span>
              <span className="font-medium">
                ₹{luxuryValue.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-300 font-semibold text-gray-900">
            <span>Total Amount</span>
            <span>
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" isLoading={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
