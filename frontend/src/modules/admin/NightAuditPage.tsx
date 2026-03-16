import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { nightAuditApi } from '../../services/advancedFeaturesApi';
import type { NightAudit, NightAuditStep } from '../../types';
import {
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Clock as ClockIcon,
  Play as PlayIcon,
  RefreshCw as ArrowPathIcon,
  FileText as DocumentTextIcon
} from 'lucide-react';

const STEP_LABELS: Record<string, string> = {
  VALIDATE_SHIFT_CLOSURE: 'Validate Shift Closure',
  POST_ROOM_REVENUE: 'Post Room Revenue',
  PROCESS_NO_SHOWS: 'Process No-Shows',
  UPDATE_ROOM_STATUS: 'Update Room Status',
  GENERATE_REPORTS: 'Generate Reports',
  ROLLOVER_DATE: 'Rollover Business Date'
};

export default function NightAuditPage() {
  const [audits, setAudits] = useState<NightAudit[]>([]);
  const [latestAudit, setLatestAudit] = useState<NightAudit | null>(null);
  const [isRequired, setIsRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [auditsData, latestData, requiredData] = await Promise.all([
        nightAuditApi.getAudits(),
        nightAuditApi.getLatestAudit(),
        nightAuditApi.checkRequired()
      ]);
      setAudits(auditsData);
      setLatestAudit(latestData);
      setIsRequired(requiredData);
    } catch (err) {
      setError('Failed to load night audit data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      await nightAuditApi.startAudit();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start night audit');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAudit = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await nightAuditApi.retryAudit(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to retry night audit');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: NightAuditStep) => {
    if (step.status === 'COMPLETED') {
      return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
    } else if (step.status === 'FAILED') {
      return <XCircleIcon className="h-6 w-6 text-red-600" />;
    } else {
      return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: NightAudit['status']) => {
    const variants: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Night Audit</h1>
          <p className="text-gray-600 mt-1">Automated end-of-day processing and reporting</p>
        </div>
        {isRequired && (
          <Button
            onClick={handleStartAudit}
            disabled={loading || (latestAudit?.status === 'IN_PROGRESS')}
            className="flex items-center gap-2"
          >
            <PlayIcon className="h-5 w-5" />
            Start Night Audit
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Current Audit Status */}
      {latestAudit && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Current Audit - {latestAudit.businessDate}</CardTitle>
                <CardDescription>
                  Started {new Date(latestAudit.startedAt!).toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(latestAudit.status)}
                {latestAudit.status === 'FAILED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryAudit(latestAudit.id)}
                    disabled={loading}
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Steps Progress */}
            <div className="space-y-4">
              {latestAudit.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-medium">{STEP_LABELS[step.type] || step.type}</h4>
                    {step.message && (
                      <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                    )}
                    {step.completedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed at {new Date(step.completedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Badge
                      className={
                        step.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : step.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {step.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {latestAudit.summary && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-3">Audit Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Rooms Occupied</p>
                    <p className="text-2xl font-bold">{latestAudit.summary.totalRoomsOccupied}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenue Posted</p>
                    <p className="text-2xl font-bold">₹{latestAudit.summary.totalRevenuePosted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">No-Shows</p>
                    <p className="text-2xl font-bold">{latestAudit.summary.noShowsProcessed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Room Updates</p>
                    <p className="text-2xl font-bold">{latestAudit.summary.roomStatusUpdates}</p>
                  </div>
                </div>
                {latestAudit.summary.reportsGenerated.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Reports Generated:</p>
                    <div className="flex flex-wrap gap-2">
                      {latestAudit.summary.reportsGenerated.map((report, idx) => (
                        <Badge key={idx} variant="outline">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          {report}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Errors */}
            {latestAudit.errors && latestAudit.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">Errors</h4>
                <ul className="list-disc list-inside space-y-1">
                  {latestAudit.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>Previous night audit runs</CardDescription>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No audit history available</p>
          ) : (
            <div className="space-y-3">
              {audits.slice(0, 10).map((audit) => (
                <div
                  key={audit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{audit.businessDate}</p>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(audit.startedAt!).toLocaleString()}
                    </p>
                    {audit.completedAt && (
                      <p className="text-sm text-gray-600">
                        Completed: {new Date(audit.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {audit.summary && (
                      <div className="text-right mr-4">
                        <p className="text-sm text-gray-600">
                          {audit.summary.totalRoomsOccupied} rooms, ₹{audit.summary.totalRevenuePosted}
                        </p>
                      </div>
                    )}
                    {getStatusBadge(audit.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
