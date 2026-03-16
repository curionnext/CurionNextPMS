import { useEffect, useState } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import {
    Package,
    ShoppingCart,
    Store as StoreIcon,
    Users,
    Plus,
    ArrowRightLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { AddStoreModal } from './components/AddStoreModal';
import { AddVendorModal } from './components/AddVendorModal';
import { AddItemModal } from './components/AddItemModal';
import { AddPOModal } from './components/AddPOModal';

type TabType = 'CATALOG' | 'STORES_STOCK' | 'VENDORS' | 'PURCHASE_ORDERS';

export function InventoryManagementPage() {
    const {
        items, stores, stockLedger, vendors, purchaseOrders,
        isLoading, error, fetchInventoryData, fetchPurchasingData,
        createStore, createVendor, createItem, createPurchaseOrder
    } = useInventoryStore();

    const [activeTab, setActiveTab] = useState<TabType>('STORES_STOCK');
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);

    useEffect(() => {
        fetchInventoryData();
        fetchPurchasingData();
    }, [fetchInventoryData, fetchPurchasingData]);

    if (isLoading && stores.length === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Purchase & Inventory</h1>
                    <p className="text-sm text-gray-500">Manage suppliers, catalogs, stock levels, and procurement.</p>
                </div>
                {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('STORES_STOCK')}
                        className={`${activeTab === 'STORES_STOCK' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <StoreIcon className="w-5 h-5 mr-2" />
                        Stores & Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('PURCHASE_ORDERS')}
                        className={`${activeTab === 'PURCHASE_ORDERS' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Purchase Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('CATALOG')}
                        className={`${activeTab === 'CATALOG' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <Package className="w-5 h-5 mr-2" />
                        Item Catalog
                    </button>
                    <button
                        onClick={() => setActiveTab('VENDORS')}
                        className={`${activeTab === 'VENDORS' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Vendors
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                <div className="space-y-6">
                    {/* Store Locations Section */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Store Locations</h3>
                            <button onClick={() => setIsStoreModalOpen(true)} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-4 h-4 mr-2" />
                                New Store
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50">
                            {stores.length === 0 ? (
                                <div className="col-span-3 text-center text-sm text-gray-500 py-4">No stores created yet.</div>
                            ) : (
                                stores.map(store => (
                                    <div key={store.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{store.name}</h4>
                                            <p className="text-xs text-gray-500 capitalize px-2 py-0.5 mt-1 bg-gray-100 rounded inline-block">
                                                {store.type.toLowerCase().replace('_', ' ')}
                                            </p>
                                        </div>
                                        <StoreIcon className="w-5 h-5 text-gray-300" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Current Stock Levels Section */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Current Stock Levels</h3>
                            <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Transfer Stock
                            </button>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item (SKU)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty On Hand</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Par Level</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockLedger.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                            No stock recorded yet. Create a Purchase Order and receive items to populate the ledger.
                                        </td>
                                    </tr>
                                ) : (
                                    stockLedger.map((entry) => {
                                        const item = items.find(i => i.id === entry.itemId);
                                        const store = stores.find(s => s.id === entry.storeId);
                                        const isLowStock = item && entry.quantityOnHand <= item.parLevel;
                                        return (
                                            <tr key={entry.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{item?.name || 'Unknown Item'}</div>
                                                    <div className="text-sm text-gray-500">{item?.sku}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {store?.name || 'Unknown Store'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                    {entry.quantityOnHand} {item?.unitOfMeasure}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item?.parLevel}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {isLowStock ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                            Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Healthy
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {activeTab === 'PURCHASE_ORDERS' && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
                            <button onClick={() => { console.log('CREATE_PO_CLICK_FIRED'); setIsPOModalOpen(true); }} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Create PO
                            </button>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {purchaseOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                            No purchase orders drafted yet.
                                        </td>
                                    </tr>
                                ) : (
                                    purchaseOrders.map((po) => {
                                        const vendor = vendors.find(v => v.id === po.vendorId);
                                        return (
                                            <tr key={po.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                    {po.poNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {vendor?.name || 'Unknown Vendor'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${po.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                            po.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                                                po.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {po.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {format(new Date(po.createdAt), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ${po.grandTotal.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                                                    {po.status === 'APPROVED' && (
                                                        <button className="text-green-600 hover:text-green-900">Receive</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Basic placeholders for CATALOG and VENDORS to keep size down */}
                {activeTab === 'CATALOG' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-900">Item Catalog ({items.length} items)</h3>
                            <button onClick={() => setIsItemModalOpen(true)} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                Add Item
                            </button>
                        </div>
                        {/* Catalog Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {items.map(item => (
                                <div key={item.id} className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                            <p className="text-xs text-gray-500 mb-2">SKU: {item.sku}</p>
                                        </div>
                                        <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2 py-1 rounded">{item.unitOfMeasure}</span>
                                    </div>
                                    <div className="mt-4 flex justify-between text-sm text-gray-600">
                                        <span>Avg Cost: ${(item.averageCost || 0).toFixed(2)}</span>
                                        <span className="text-indigo-600 font-medium">Par: {item.parLevel}</span>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && <p className="text-gray-500">No items available.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'VENDORS' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-900">Suppliers & Vendors ({vendors.length})</h3>
                            <button onClick={() => setIsVendorModalOpen(true)} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                Add Vendor
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vendors.map(vendor => (
                                <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{vendor.name}</h4>
                                        <p className="text-sm text-gray-500">{vendor.contactPerson} • {vendor.email}</p>
                                    </div>
                                </div>
                            ))}
                            {vendors.length === 0 && <p className="text-gray-500">No vendors registered yet.</p>}
                        </div>
                    </div>
                )}
            </div>
            {/* Modals */}
            <AddStoreModal
                isOpen={isStoreModalOpen}
                onClose={() => setIsStoreModalOpen(false)}
                onSubmit={createStore}
            />
            <AddVendorModal
                isOpen={isVendorModalOpen}
                onClose={() => setIsVendorModalOpen(false)}
                onSubmit={createVendor}
            />
            <AddItemModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSubmit={createItem}
            />
            <AddPOModal
                isOpen={isPOModalOpen}
                onClose={() => setIsPOModalOpen(false)}
                onSubmit={async (data) => {
                    await createPurchaseOrder({
                        vendorId: data.vendorId,
                        expectedDelivery: data.expectedDeliveryDate,
                        notes: data.notes,
                        items: data.items.map(i => ({
                            itemId: i.itemId,
                            quantityOrdered: i.quantity,
                            unitPrice: i.unitPrice,
                            taxAmount: 0 // Mock tax
                        }))
                    });
                }}
            />
        </div>
    );
}
