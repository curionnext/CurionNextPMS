import { useEffect, useState } from 'react';
import { useOTAStore } from '../../../stores/otaStore';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Package,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import type { OTASyncLogResponse as OTASyncLog, OTAProvider } from '../../../services/otaApi';

type SyncLogFilter = {
  channelId?: string;
  syncType?: 'RATES' | 'INVENTORY' | 'RESERVATIONS' | 'ALL';
  status?: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'ALL';
};

export default function SyncLogsViewer() {
  const { channels, syncLogs, fetchChannels, fetchSyncLogs } = useOTAStore();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<SyncLogFilter>({
    syncType: 'ALL',
    status: 'ALL',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchChannels(),
        fetchSyncLogs(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getProviderName = (provider: OTAProvider): string => {
    const names: Record<OTAProvider, string> = {
      BOOKING_COM: 'Booking.com',
      MAKEMYTRIP: 'MakeMyTrip',
      AIRBNB: 'Airbnb',
      EXPEDIA: 'Expedia',
      GOIBIBO: 'Goibibo',
    };
    return names[provider] || provider;
  };

  const getChannelName = (channelId: string): string => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? getProviderName(channel.provider) : channelId.slice(0, 12);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'PARTIAL':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSyncTypeIcon = (syncType: string) => {
    switch (syncType) {
      case 'RATES':
        return <TrendingUp className="h-4 w-4" />;
      case 'INVENTORY':
        return <Package className="h-4 w-4" />;
      case 'RESERVATIONS':
        return <Download className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'default';
      case 'PARTIAL':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredLogs = syncLogs.filter((log) => {
    if (filter.channelId && log.channelId !== filter.channelId) return false;
    if (filter.syncType && filter.syncType !== 'ALL' && log.syncType !== filter.syncType) return false;
    if (filter.status && filter.status !== 'ALL' && log.status !== filter.status) return false;
    return true;
  });

  const getSuccessRate = (log: OTASyncLog): number => {
    if (log.itemsProcessed === 0) return 0;
    return Math.round(((log.itemsProcessed - log.itemsFailed) / log.itemsProcessed) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sync Logs</h2>
          <p className="text-gray-600 text-sm mt-1">
            View synchronization history and status
          </p>
        </div>
        <Button onClick={loadData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        {/* Channel Filter */}
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          value={filter.channelId || ''}
          onChange={(e) => setFilter({ ...filter, channelId: e.target.value || undefined })}
        >
          <option value="">All Channels</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {getProviderName(channel.provider)}
            </option>
          ))}
        </select>

        {/* Sync Type Filter */}
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          value={filter.syncType || 'ALL'}
          onChange={(e) => setFilter({ ...filter, syncType: e.target.value as any })}
        >
          <option value="ALL">All Types</option>
          <option value="RATES">Rates</option>
          <option value="INVENTORY">Inventory</option>
          <option value="RESERVATIONS">Reservations</option>
        </select>

        {/* Status Filter */}
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          value={filter.status || 'ALL'}
          onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PARTIAL">Partial</option>
          <option value="FAILED">Failed</option>
        </select>

        {/* Clear Filters */}
        {(filter.channelId || filter.syncType !== 'ALL' || filter.status !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ syncType: 'ALL', status: 'ALL' })}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {syncLogs.length === 0
              ? 'No sync logs available. Perform a sync operation to see logs here.'
              : 'No logs match the selected filters.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              {/* Log Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpanded(log.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(log.status)}
                    </div>

                    {/* Channel & Type */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getChannelName(log.channelId)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          {getSyncTypeIcon(log.syncType)}
                          <span className="font-medium">{log.syncType}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(log.syncedAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{log.itemsProcessed}</p>
                        <p className="text-xs text-gray-500">Processed</p>
                      </div>
                      {log.itemsFailed > 0 && (
                        <div className="text-center">
                          <p className="font-semibold text-red-600">{log.itemsFailed}</p>
                          <p className="text-xs text-gray-500">Failed</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="font-semibold text-green-600">{getSuccessRate(log)}%</p>
                        <p className="text-xs text-gray-500">Success</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge variant={getStatusBadgeVariant(log.status) as any}>
                      {log.status}
                    </Badge>
                  </div>

                  {/* Expand Icon */}
                  <div className="ml-4 flex-shrink-0">
                    {expandedLogs.has(log.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedLogs.has(log.id) && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Log ID</p>
                      <p className="font-mono text-xs mt-1">{log.id.slice(0, 16)}...</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Hotel Code</p>
                      <p className="font-medium mt-1">{log.hotelCode}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Provider</p>
                      <p className="font-medium mt-1">{log.provider}</p>
                    </div>
                  </div>

                  {/* Error Details */}
                  {log.error && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <p className="font-semibold text-red-900 mb-1">Error Details:</p>
                        <p className="text-sm text-red-800">{log.error}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Metadata */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700">Additional Information:</p>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {log.status === 'SUCCESS' && !log.error && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Synchronization completed successfully. All {log.itemsProcessed} items processed without errors.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {syncLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-900">{syncLogs.length}</p>
            <p className="text-sm text-blue-700">Total Syncs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-900">
              {syncLogs.filter(l => l.status === 'SUCCESS').length}
            </p>
            <p className="text-sm text-green-700">Successful</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-900">
              {syncLogs.filter(l => l.status === 'PARTIAL').length}
            </p>
            <p className="text-sm text-yellow-700">Partial</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-900">
              {syncLogs.filter(l => l.status === 'FAILED').length}
            </p>
            <p className="text-sm text-red-700">Failed</p>
          </div>
        </div>
      )}
    </div>
  );
}
