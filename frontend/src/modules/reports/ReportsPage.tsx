import { useState } from 'react';
import { useReservationStore } from '../../stores/reservationStore';
import { usePropertyStore } from '../../stores/propertyStore';
import { format } from 'date-fns';
// ui/Card unused
import { FileText, Users, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils';

type ReportTab = 'SHIFT_CASHIER' | 'ARRIVALS_DEPARTURES' | 'FOLIO_BALANCES';

export function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('SHIFT_CASHIER');

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Standard Reports</h1>
                    <p className="mt-1 text-sm text-gray-500">Essential property management and accounting reports.</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('SHIFT_CASHIER')}
                        className={`${activeTab === 'SHIFT_CASHIER' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <DollarSign className="w-5 h-5 mr-2" />
                        Shift & Cashier
                    </button>
                    <button
                        onClick={() => setActiveTab('ARRIVALS_DEPARTURES')}
                        className={`${activeTab === 'ARRIVALS_DEPARTURES' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <Users className="w-5 h-5 mr-2" />
                        Arrivals & Departures
                    </button>
                    <button
                        onClick={() => setActiveTab('FOLIO_BALANCES')}
                        className={`${activeTab === 'FOLIO_BALANCES' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        <FileText className="w-5 h-5 mr-2" />
                        Folio Balances
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
                {activeTab === 'SHIFT_CASHIER' && <ShiftCashierReport />}
                {activeTab === 'ARRIVALS_DEPARTURES' && <ArrivalsDeparturesReport />}
                {activeTab === 'FOLIO_BALANCES' && <FolioBalancesReport />}
            </div>
        </div>
    );
}

function ShiftCashierReport() {
    const { reservations } = useReservationStore();
    const today = new Date();

    const todayStr = format(today, 'yyyy-MM-dd');

    // Fake payments by taking reservations that act today
    const todaysPayments: Array<{
        id: string;
        amount: number;
        method: string;
        timestamp: string;
        reservationId: string;
        guestName: string;
        collectedBy: string;
    }> = reservations
        .filter(res => (res.checkIn === todayStr || res.checkOut === todayStr) && (res.amountPaid || 0) > 0)
        .map(res => ({
            id: res.id,
            amount: res.amountPaid || 0,
            method: 'mixed',
            timestamp: new Date().toISOString(),
            reservationId: res.confirmationNumber,
            guestName: `${res.guest.firstName} ${res.guest.lastName}`,
            collectedBy: 'System'
        }));

    const totalCollected = todaysPayments.reduce((sum, p) => sum + p.amount, 0);

    // Group by method
    const byMethod = todaysPayments.reduce((acc, p) => {
        acc[p.method] = (acc[p.method] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Daily Cashier Report</h2>
                    <p className="text-sm text-gray-500">Payments collected on {format(today, 'MMMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Total Collected</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCollected)}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Object.entries(byMethod).map(([method, amount]) => (
                    <div key={method} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{method.replace('_', ' ')}</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(amount)}</p>
                    </div>
                ))}
                {Object.keys(byMethod).length === 0 && (
                    <div className="col-span-4 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
                        No payments collected today.
                    </div>
                )}
            </div>

            {todaysPayments.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt/Ref</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {todaysPayments.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Today</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.id.slice(-6).toUpperCase()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {p.guestName} <span className="text-xs text-gray-500">({p.reservationId})</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{p.method.replace('_', ' ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.collectedBy || 'System'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatCurrency(p.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function ArrivalsDeparturesReport() {
    const { reservations } = useReservationStore();
    const { roomTypes } = usePropertyStore();

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const arrivals = reservations.filter(r => r.checkIn === todayStr && ['confirmed', 'pending'].includes(r.status));
    const departures = reservations.filter(r => r.checkOut === todayStr && ['checked-in'].includes(r.status));

    const getRoomTypeName = (id: string) => roomTypes.find(rt => rt.id === id)?.name || 'Unknown';

    return (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Arrivals */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Expected Arrivals</h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{arrivals.length} pending</span>
                </div>

                {arrivals.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">No arrivals expected.</p>
                ) : (
                    <div className="space-y-3">
                        {arrivals.map(r => (
                            <div key={r.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-gray-900">{r.guest.firstName} {r.guest.lastName}</p>
                                        <p className="text-xs text-gray-500">{r.confirmationNumber} • {getRoomTypeName(r.roomTypeId)}</p>
                                    </div>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {r.source}
                                    </span>
                                </div>
                                {r.notes && <p className="text-xs text-gray-500 mt-2 bg-yellow-50 p-2 rounded">{r.notes}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Departures */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Expected Departures</h2>
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{departures.length} pending</span>
                </div>

                {departures.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">No departures expected.</p>
                ) : (
                    <div className="space-y-3">
                        {departures.map(r => (
                            <div key={r.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-gray-900">{r.guest.firstName} {r.guest.lastName}</p>
                                        <p className="text-xs text-gray-500">Room {r.roomNumbers?.[0] || 'Unassigned'} • Bal: {formatCurrency(Math.max((r.totalAmount || 0) - (r.amountPaid || 0), 0))}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function FolioBalancesReport() {
    const { reservations } = useReservationStore();

    // Show all in-house or checked-out guests who still owe money
    const outstandingFolios = reservations
        .filter(r => ['checked-in', 'checked-out'].includes(r.status))
        .map(r => {
            const balance = Math.max((r.totalAmount || 0) - (r.amountPaid || 0), 0);
            return { ...r, balance };
        })
        .filter(r => r.balance > 0)
        .sort((a, b) => b.balance - a.balance);

    const totalOutstanding = outstandingFolios.reduce((sum, r) => sum + r.balance, 0);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Outstanding Folio Balances</h2>
                    <p className="text-sm text-gray-500">Guests with pending payments</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Total Outstanding House Balance</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
                </div>
            </div>

            {outstandingFolios.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 border border-dashed rounded-lg">
                    No outstanding balances. All folios are settled!
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Bill</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {outstandingFolios.map(r => (
                                <tr key={r.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.roomNumbers?.[0] || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {r.guest.firstName} {r.guest.lastName}
                                        <p className="text-xs text-gray-500">{r.confirmationNumber}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'checked-out' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.totalAmount || 0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(r.amountPaid || 0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(r.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
