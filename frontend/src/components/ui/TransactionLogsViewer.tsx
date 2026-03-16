import { useState, useEffect } from 'react';
import { X, RefreshCw, Filter, FileText, User, Info } from 'lucide-react';
import { useTransactionLogStore } from '../../stores/transactionLogStore';
import type { TransactionLog } from '../../services/transactionLogApi';
import { format, parseISO } from 'date-fns';
import { cn } from '../../utils';

interface TransactionLogsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-green-50 text-green-700 border-green-200',
  USER_LOGOUT: 'bg-gray-50 text-gray-700 border-gray-200',
  CHECK_IN: 'bg-blue-50 text-blue-700 border-blue-200',
  CHECK_OUT: 'bg-purple-50 text-purple-700 border-purple-200',
  PAYMENT_RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ROOM_STATUS_CHANGED: 'bg-amber-50 text-amber-700 border-amber-200',
  RESERVATION_CREATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RESERVATION_UPDATED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  RESERVATION_CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export function TransactionLogsViewer({ isOpen, onClose }: TransactionLogsViewerProps) {
  const { logs, isLoading, error, fetchLogs, clearError } = useTransactionLogStore();
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<TransactionLog | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = () => {
    const filters: any = { limit: 100 };
    if (filterEventType) filters.eventType = filterEventType;
    if (filterEntityType) filters.entityType = filterEntityType;
    fetchLogs(filters);
  };

  const handleRefresh = () => {
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilterEventType('');
    setFilterEntityType('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Transaction Logs</h2>
              <p className="text-sm text-zinc-500">Complete event audit trail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="h-5 w-5 text-zinc-600" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700">Filters:</span>
            </div>
            <select
              value={filterEventType}
              onChange={(e) => {
                setFilterEventType(e.target.value);
                setTimeout(loadLogs, 100);
              }}
              className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            >
              <option value="">All Events</option>
              <option value="USER_LOGIN">Login</option>
              <option value="USER_LOGOUT">Logout</option>
              <option value="CHECK_IN">Check-in</option>
              <option value="CHECK_OUT">Check-out</option>
              <option value="PAYMENT_RECEIVED">Payment</option>
              <option value="ROOM_STATUS_CHANGED">Room Status</option>
            </select>
            <select
              value={filterEntityType}
              onChange={(e) => {
                setFilterEntityType(e.target.value);
                setTimeout(loadLogs, 100);
              }}
              className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
            >
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="reservation">Reservation</option>
              <option value="payment">Payment</option>
              <option value="room">Room</option>
            </select>
            {(filterEventType || filterEntityType) && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="ml-auto px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Logs List */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoading && !logs.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin mx-auto mb-3" />
                  <p className="text-zinc-600">Loading logs...</p>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-600 font-medium">No logs found</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Events will appear here as they occur
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md',
                      selectedLog?.id === log.id
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={cn(
                              'px-2 py-1 text-xs font-medium rounded-md border',
                              EVENT_TYPE_COLORS[log.eventType] || 'bg-zinc-50 text-zinc-700 border-zinc-200'
                            )}
                          >
                            {log.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {format(parseISO(log.timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 mb-1">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {log.entityType}
                          </span>
                        </div>
                      </div>
                      <Info className="h-4 w-4 text-zinc-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Panel */}
          {selectedLog && (
            <div className="w-96 border-l border-zinc-200 bg-zinc-50 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-zinc-900">Log Details</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1 rounded hover:bg-zinc-200 transition-colors"
                  >
                    <X className="h-4 w-4 text-zinc-600" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Event Type</p>
                    <span
                      className={cn(
                        'inline-block px-2 py-1 text-xs font-medium rounded-md border',
                        EVENT_TYPE_COLORS[selectedLog.eventType] || 'bg-zinc-100 text-zinc-700'
                      )}
                    >
                      {selectedLog.eventType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Description</p>
                    <p className="text-sm text-zinc-900">{selectedLog.description}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Timestamp</p>
                    <p className="text-sm text-zinc-900">
                      {format(parseISO(selectedLog.timestamp), 'PPpp')}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">User</p>
                    <p className="text-sm text-zinc-900">{selectedLog.userName}</p>
                    <p className="text-xs text-zinc-500">{selectedLog.userId}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Entity</p>
                    <p className="text-sm text-zinc-900 capitalize">{selectedLog.entityType}</p>
                    <p className="text-xs text-zinc-500 font-mono">{selectedLog.entityId}</p>
                  </div>

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Metadata</p>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-zinc-200 overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.previousState && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Previous State</p>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-zinc-200 overflow-x-auto">
                        {JSON.stringify(selectedLog.previousState, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.newState && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">New State</p>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-zinc-200 overflow-x-auto">
                        {JSON.stringify(selectedLog.newState, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.ipAddress && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">IP Address</p>
                      <p className="text-sm text-zinc-900 font-mono">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
