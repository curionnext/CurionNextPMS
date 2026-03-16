import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNightAuditStore } from '../../stores/nightAuditStore';
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import type { NightAuditStep, NightAuditStepType } from '../../services/nightAuditApi';

const stepLabels: Record<NightAuditStepType, string> = {
  VALIDATE_SHIFT_CLOSURE: 'Validate Shift Closure',
  POST_ROOM_REVENUE: 'Post Room Revenue',
  PROCESS_NO_SHOWS: 'Process No-Shows',
  UPDATE_ROOM_STATUS: 'Update Room Status',
  GENERATE_REPORTS: 'Generate Reports',
  ROLLOVER_DATE: 'Rollover Business Date',
};

const stepDescriptions: Record<NightAuditStepType, string> = {
  VALIDATE_SHIFT_CLOSURE: 'Checking that all cashier shifts have been properly closed',
  POST_ROOM_REVENUE: 'Posting daily room charges to guest folios',
  PROCESS_NO_SHOWS: 'Identifying and processing reservations that did not check in',
  UPDATE_ROOM_STATUS: 'Updating room statuses based on current occupancy',
  GENERATE_REPORTS: 'Creating daily audit reports and summaries',
  ROLLOVER_DATE: 'Rolling over to the next business day',
};

const AuditProgressScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { 
    currentAudit, 
    isLoading,
    error,
    fetchAuditById,
    retryAudit 
  } = useNightAuditStore();

  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Initial fetch
    fetchAuditById(id);

    // Poll for updates if audit is in progress
    const interval = setInterval(() => {
      if (currentAudit?.status === 'IN_PROGRESS') {
        fetchAuditById(id);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    // Stop polling when audit completes or fails
    if (currentAudit && ['COMPLETED', 'FAILED'].includes(currentAudit.status)) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [currentAudit?.status]);

  const handleRetry = async () => {
    if (!id) return;
    
    setIsRetrying(true);
    try {
      await retryAudit(id);
      // Start polling again
      const interval = setInterval(() => {
        if (currentAudit?.status === 'IN_PROGRESS') {
          fetchAuditById(id);
        }
      }, 2000);
      setPollingInterval(interval);
    } catch (err) {
      console.error('Failed to retry audit:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStepIcon = (step: NightAuditStep) => {
    switch (step.status) {
      case 'COMPLETED':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        if (currentAudit?.status === 'IN_PROGRESS' && step.startedAt && !step.completedAt) {
          return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
        }
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStepStatus = (step: NightAuditStep) => {
    switch (step.status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200';
      case 'FAILED':
        return 'bg-red-50 border-red-200';
      default:
        if (currentAudit?.status === 'IN_PROGRESS' && step.startedAt && !step.completedAt) {
          return 'bg-blue-50 border-blue-200';
        }
        return 'bg-gray-50 border-gray-200';
    }
  };

  const completedSteps = currentAudit?.steps.filter((s: NightAuditStep) => s.status === 'COMPLETED').length || 0;
  const totalSteps = currentAudit?.steps.length || 6;
  const progress = (completedSteps / totalSteps) * 100;

  if (isLoading && !currentAudit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading audit details...</p>
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
                <p className="text-red-700 mt-2">{error || 'Audit not found'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/night-audit')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Night Audit Progress</h1>
          <p className="text-gray-600 mt-2">
            Business Date: {new Date(currentAudit.businessDate).toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* Status Banner */}
        <div className={`mb-6 rounded-lg p-6 ${
          currentAudit.status === 'COMPLETED' 
            ? 'bg-green-50 border-2 border-green-200'
            : currentAudit.status === 'FAILED'
            ? 'bg-red-50 border-2 border-red-200'
            : 'bg-blue-50 border-2 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {currentAudit.status === 'COMPLETED' && (
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              )}
              {currentAudit.status === 'FAILED' && (
                <XCircle className="w-8 h-8 text-red-600 mr-3" />
              )}
              {currentAudit.status === 'IN_PROGRESS' && (
                <Loader2 className="w-8 h-8 text-blue-600 mr-3 animate-spin" />
              )}
              <div>
                <h2 className={`text-xl font-semibold ${
                  currentAudit.status === 'COMPLETED' 
                    ? 'text-green-900'
                    : currentAudit.status === 'FAILED'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}>
                  {currentAudit.status === 'COMPLETED' && 'Audit Completed Successfully'}
                  {currentAudit.status === 'FAILED' && 'Audit Failed'}
                  {currentAudit.status === 'IN_PROGRESS' && 'Audit In Progress'}
                </h2>
                <p className={`text-sm mt-1 ${
                  currentAudit.status === 'COMPLETED' 
                    ? 'text-green-700'
                    : currentAudit.status === 'FAILED'
                    ? 'text-red-700'
                    : 'text-blue-700'
                }`}>
                  {currentAudit.status === 'COMPLETED' && 'All steps completed successfully'}
                  {currentAudit.status === 'FAILED' && 'Some steps failed. Please review and retry.'}
                  {currentAudit.status === 'IN_PROGRESS' && 'Please wait while the audit completes...'}
                </p>
              </div>
            </div>
            {currentAudit.status === 'FAILED' && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : 'Retry Audit'}
              </button>
            )}
            {currentAudit.status === 'COMPLETED' && (
              <button
                onClick={() => navigate(`/night-audit/${currentAudit.id}/report`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                View Report
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">{completedSteps}/{totalSteps} Steps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                currentAudit.status === 'FAILED' ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Messages */}
        {currentAudit.errors && currentAudit.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-2">Errors Encountered</h3>
                <ul className="space-y-1">
                  {currentAudit.errors.map((error: string, idx: number) => (
                    <li key={idx} className="text-sm text-red-700">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Audit Steps</h2>
          <div className="space-y-4">
            {currentAudit.steps.map((step: NightAuditStep, idx: number) => (
              <div
                key={step.type}
                className={`border rounded-lg p-4 transition-all ${getStepStatus(step)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {idx + 1}. {stepLabels[step.type]}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        step.status === 'COMPLETED' 
                          ? 'bg-green-200 text-green-800'
                          : step.status === 'FAILED'
                          ? 'bg-red-200 text-red-800'
                          : step.startedAt && !step.completedAt
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step.status === 'COMPLETED' ? 'Completed' : 
                         step.status === 'FAILED' ? 'Failed' :
                         step.startedAt && !step.completedAt ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {stepDescriptions[step.type]}
                    </p>
                    {step.message && (
                      <div className={`text-sm mt-2 p-2 rounded ${
                        step.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <strong>Log:</strong> {step.message}
                      </div>
                    )}
                    {step.completedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Completed at: {new Date(step.completedAt).toLocaleTimeString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Started:</span>
              <span className="ml-2 font-medium text-gray-900">
                {currentAudit.startedAt 
                  ? new Date(currentAudit.startedAt).toLocaleString('en-IN')
                  : 'N/A'}
              </span>
            </div>
            {currentAudit.completedAt && (
              <div>
                <span className="text-gray-600">Completed:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(currentAudit.completedAt).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditProgressScreen;
