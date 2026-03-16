import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNightAuditStore } from '../../stores/nightAuditStore';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft,
  Printer,
  DollarSign,
  Users,
  Building2,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const AuditReportViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const { 
    currentAudit,
    isLoading,
    error,
    fetchAuditById 
  } = useNightAuditStore();

  useEffect(() => {
    if (id) {
      fetchAuditById(id);
    }
  }, [id]);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Night-Audit-Report-${currentAudit?.businessDate}`,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !currentAudit) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error</h3>
                <p className="text-red-700 mt-2">{error || 'Report not found'}</p>
                <button
                  onClick={() => navigate('/night-audit')}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = currentAudit.summary;
  const businessDate = new Date(currentAudit.businessDate);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate('/night-audit')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </button>
        </div>

        {/* Printable Report */}
        <div ref={reportRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Report Header */}
          <div className="border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Night Audit Report</h1>
                <p className="text-gray-600 mt-2">
                  Business Date: {businessDate.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  currentAudit.status === 'COMPLETED' 
                    ? 'bg-green-100 text-green-800'
                    : currentAudit.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentAudit.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 mr-1" />}
                  {currentAudit.status}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Generated: {new Date().toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {currentAudit.status === 'FAILED' && currentAudit.errors && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2">Audit Errors</h3>
              <ul className="space-y-1">
                {currentAudit.errors.map((error: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-700">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Executive Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Rooms Occupied */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-sm text-blue-800 font-medium">Rooms Occupied</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">{summary.totalRoomsOccupied}</p>
                  </div>

                  {/* Revenue Posted */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-sm text-green-800 font-medium">Room Revenue Posted</p>
                    <p className="text-3xl font-bold text-green-900 mt-1">
                      ₹{summary.totalRevenuePosted.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* No-Shows */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-8 h-8 text-orange-600" />
                    </div>
                    <p className="text-sm text-orange-800 font-medium">No-Shows Processed</p>
                    <p className="text-3xl font-bold text-orange-900 mt-1">{summary.noShowsProcessed}</p>
                  </div>

                  {/* Room Updates */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-sm text-purple-800 font-medium">Room Status Updates</p>
                    <p className="text-3xl font-bold text-purple-900 mt-1">{summary.roomStatusUpdates}</p>
                  </div>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 text-sm text-gray-900">Room Revenue</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                          ₹{summary.totalRevenuePosted.toLocaleString('en-IN')}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 text-sm text-gray-900">POS Revenue</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">₹0.00</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 text-sm text-gray-900">Other Charges</td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">₹0.00</td>
                      </tr>
                      <tr className="border-t-2 border-gray-300 font-semibold">
                        <td className="py-3 px-4 text-base text-gray-900">Total Revenue</td>
                        <td className="py-3 px-4 text-base text-gray-900 text-right">
                          ₹{summary.totalRevenuePosted.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Occupancy Statistics */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Occupancy Statistics</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Occupied Rooms</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.totalRoomsOccupied}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Average Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{summary.totalRoomsOccupied > 0 
                          ? Math.round(summary.totalRevenuePosted / summary.totalRoomsOccupied).toLocaleString('en-IN')
                          : '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">No-Shows</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.noShowsProcessed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status Updates</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.roomStatusUpdates}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reports Generated */}
              {summary.reportsGenerated.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Reports Generated</h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <ul className="space-y-2">
                      {summary.reportsGenerated.map((report: string, idx: number) => (
                        <li key={idx} className="flex items-center text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                          {report}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Audit Steps Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Steps</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                {currentAudit.steps.map((step: any) => (
                  <div key={step.type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {step.status === 'COMPLETED' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                      )}
                      <span className="text-sm text-gray-900">
                        {step.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      step.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-200 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-900 mb-1">Audit Information</p>
                <p>Audit ID: {currentAudit.id}</p>
                <p>Started: {currentAudit.startedAt 
                  ? new Date(currentAudit.startedAt).toLocaleString('en-IN')
                  : 'N/A'}</p>
                <p>Completed: {currentAudit.completedAt 
                  ? new Date(currentAudit.completedAt).toLocaleString('en-IN')
                  : 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 mb-1">Property Information</p>
                <p>Hotel ID: {currentAudit.hotelId}</p>
                <p>Hotel Code: {currentAudit.hotelCode}</p>
                <p>Report Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Print-only Footer */}
          <div className="hidden print:block mt-8 text-center text-xs text-gray-500 border-t pt-4">
            <p>This is a system-generated report. No signature is required.</p>
            <p className="mt-1">Powered by Hotel Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditReportViewer;
