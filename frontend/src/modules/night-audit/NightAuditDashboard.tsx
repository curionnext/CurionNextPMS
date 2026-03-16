import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNightAuditStore } from '../../stores/nightAuditStore';
import { useAuthStore } from '../../stores/authStore';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  Clock,
  PlayCircle,
  RefreshCw,
  FileText
} from 'lucide-react';

const NightAuditDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentAudit,
    isAuditRequired,
    isLoading,
    error,
    fetchLatestAudit,
    checkAuditRequired,
    startAudit
  } = useNightAuditStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);

  useEffect(() => {
    fetchLatestAudit();
    checkAuditRequired();
  }, []);

  useEffect(() => {
    // Check for blockers
    const newBlockers: string[] = [];
    
    if (currentAudit?.status === 'IN_PROGRESS') {
      newBlockers.push('Audit already in progress');
    }
    
    // You can add more blocker checks here (e.g., open bills, pending checkouts)
    setBlockers(newBlockers);
  }, [currentAudit]);

  const handleStartAudit = async () => {
    setIsStarting(true);
    try {
      const audit = await startAudit();
      setShowConfirmModal(false);
      // Navigate to progress screen
      navigate(`/night-audit/${audit.id}/progress`);
    } catch (err) {
      console.error('Failed to start audit:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50';
      case 'IN_PROGRESS':
        return 'text-blue-600 bg-blue-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5" />;
      case 'IN_PROGRESS':
        return <RefreshCw className="w-5 h-5 animate-spin" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  // Admin and Manager can run Night Audit
  const hasAuditPermission = user?.role === 'admin' || user?.role === 'manager';
  
  const canRunAudit = !isLoading && 
    isAuditRequired && 
    blockers.length === 0 && 
    currentAudit?.status !== 'IN_PROGRESS' &&
    hasAuditPermission;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Night Audit</h1>
          <p className="text-gray-600 mt-2">End-of-day processing and reporting</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Business Date Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Business Date</h2>
            </div>
            <p className="text-2xl font-bold text-gray-900">{today}</p>
            <p className="text-sm text-gray-600 mt-2">
              {currentAudit?.businessDate 
                ? `Last audit: ${new Date(currentAudit.businessDate).toLocaleDateString('en-IN')}`
                : 'No audits yet'}
            </p>
          </div>

          {/* Audit Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Audit Status</h2>
            </div>
            {currentAudit ? (
              <div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentAudit.status)}`}>
                  {getStatusIcon(currentAudit.status)}
                  <span className="ml-2">{currentAudit.status.replace('_', ' ')}</span>
                </div>
                {currentAudit.completedAt && (
                  <p className="text-sm text-gray-600 mt-3">
                    Completed: {new Date(currentAudit.completedAt).toLocaleString('en-IN')}
                  </p>
                )}
                {currentAudit.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => navigate(`/night-audit/${currentAudit.id}/progress`)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Progress →
                  </button>
                )}
              </div>
            ) : (
              <p className="text-gray-600">No audit data available</p>
            )}
          </div>

          {/* Blockers Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                blockers.length > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {blockers.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Blockers</h2>
            </div>
            {blockers.length > 0 ? (
              <ul className="space-y-2">
                {blockers.map((blocker, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 mr-2 flex-shrink-0"></span>
                    {blocker}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-green-700 text-sm">No blockers detected. Ready to run audit.</p>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!canRunAudit}
              className={`px-6 py-3 rounded-lg font-medium flex items-center transition-colors ${
                canRunAudit
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Run Night Audit
            </button>

            {currentAudit && (
              <>
                <button
                  onClick={() => navigate(`/night-audit/${currentAudit.id}/report`)}
                  className="px-6 py-3 rounded-lg font-medium flex items-center bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Report
                </button>

                {currentAudit.status === 'FAILED' && (
                  <button
                    onClick={() => navigate(`/night-audit/${currentAudit.id}/progress?retry=true`)}
                    className="px-6 py-3 rounded-lg font-medium flex items-center bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Retry Audit
                  </button>
                )}
              </>
            )}
          </div>

          {!canRunAudit && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                {!isAuditRequired 
                  ? 'Audit has already been completed for today.'
                  : blockers.length > 0 
                  ? 'Please resolve all blockers before running the audit.'
                  : 'You do not have permission to run night audit.'}
              </p>
            </div>
          )}
        </div>

        {/* Recent Audits */}
        {currentAudit && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Latest Audit Summary</h2>
            {currentAudit.summary ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Rooms Occupied</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentAudit.summary.totalRoomsOccupied}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Revenue Posted</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{currentAudit.summary.totalRevenuePosted.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">No-Shows</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentAudit.summary.noShowsProcessed}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Room Updates</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentAudit.summary.roomStatusUpdates}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Reports</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentAudit.summary.reportsGenerated.length}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No summary available yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Night Audit</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to run the night audit? This process will:
            </p>
            <ul className="space-y-2 mb-6 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                Validate all shifts are closed
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                Post room revenue to folios
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                Process no-shows
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                Update room statuses
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                Generate reports
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                Roll over business date
              </li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isStarting}
                className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartAudit}
                disabled={isStarting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isStarting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Run Audit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NightAuditDashboard;
