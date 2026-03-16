import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useInventoryStore } from '../../../stores/inventoryStore';

interface AddPOModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        vendorId: string;
        expectedDeliveryDate: string;
        notes?: string;
        items: Array<{ itemId: string; quantity: number; unitPrice: number }>;
    }) => Promise<void>;
}

export function AddPOModal({ isOpen, onClose, onSubmit }: AddPOModalProps) {
    const { vendors, items: catalogItems } = useInventoryStore();
    const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [poItems, setPoItems] = useState([{ itemId: '', quantity: 1, unitPrice: 0.00 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const parseCost = (id: string) => {
        return catalogItems.find((i: any) => i.id === id)?.averageCost || 0;
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...poItems];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-fill price
        if (field === 'itemId') {
            newItems[index].unitPrice = parseCost(value as string);
        }

        setPoItems(newItems);
    };

    const handleAddItem = () => {
        setPoItems([...poItems, { itemId: '', quantity: 1, unitPrice: 0.00 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = poItems.filter((_, i) => i !== index);
        setPoItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const validItems = poItems.filter(i => i.itemId !== '' && i.quantity > 0);
        if (validItems.length === 0) {
            alert('Please add at least one valid item to the PO.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                vendorId,
                expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
                notes,
                items: validItems.map(i => ({
                    itemId: i.itemId,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice)
                }))
            });
            onClose();
            // Reset
            setVendorId(vendors[0]?.id || '');
            setExpectedDeliveryDate('');
            setNotes('');
            setPoItems([{ itemId: '', quantity: 1, unitPrice: 0.00 }]);
        } catch (error) {
            console.error('Failed to create PO:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const grandTotal = poItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Draft Purchase Order</h3>
                                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vendor</label>
                                    <select
                                        required
                                        value={vendorId}
                                        onChange={(e) => setVendorId(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    >
                                        <option value="" disabled>Select Vendor</option>
                                        {vendors.map((v: any) => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                                    <input
                                        type="date"
                                        required
                                        value={expectedDeliveryDate}
                                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Order Notes / Instructions</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-medium text-gray-900">Line Items</h4>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add Row
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {poItems.map((item, index) => (
                                        <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-md border border-gray-200">
                                            <div className="flex-1">
                                                <select
                                                    required
                                                    value={item.itemId}
                                                    onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                                                    className="block w-full text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                >
                                                    <option value="" disabled>Select Catalog Item</option>
                                                    {catalogItems.map((catalogItem: any) => (
                                                        <option key={catalogItem.id} value={catalogItem.id}>
                                                            {catalogItem.name} ({catalogItem.sku})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.valueAsNumber || Number(e.target.value))}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    placeholder="Qty"
                                                />
                                            </div>
                                            <div className="w-32 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm">$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    required
                                                    step="0.01"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.valueAsNumber || Number(e.target.value))}
                                                    className="block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="w-24 px-2 py-2 text-right text-sm font-medium text-gray-900 border border-transparent">
                                                ${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={poItems.length === 1}
                                                className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-25"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex justify-end text-lg font-semibold text-gray-900 pr-12">
                                    Total: ${grandTotal.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating PO...' : 'Draft PO'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
