import { useEffect, useState } from 'react';
import { useOTAStore } from '../../../stores/otaStore';
import { useReservationStore } from '../../../stores/reservationStore';
import { useGuestStore } from '../../../stores/guestStore';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { 
  Calendar,
  User,
  Home,
  Link as LinkIcon,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/Dialog';
import type { OTAReservationImportResponse as OTAReservationImport, OTAProvider } from '../../../services/otaApi';

export default function OTAReservationsViewer() {
  const { importedReservations, fetchChannels, fetchImportedReservations } = useOTAStore();
  const { reservations, hydrateFromBackend: fetchReservations } = useReservationStore();
  const { hydrateFromBackend: fetchGuests } = useGuestStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImport, setSelectedImport] = useState<OTAReservationImport | null>(null);
  const [filter, setFilter] = useState<{
    provider?: OTAProvider | 'ALL';
    status?: string;
  }>({
    provider: 'ALL',
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
        fetchImportedReservations(),
        fetchReservations(),
        fetchGuests(),
      ]);
    } finally {
      setIsLoading(false);
    }
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

  const getReservation = (reservationId: string) => {
    return reservations.find(r => r.id === reservationId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IMPORTED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'DUPLICATE':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'IMPORTED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'DUPLICATE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredImports = importedReservations.filter((imp) => {
    if (filter.provider && filter.provider !== 'ALL' && imp.provider !== filter.provider) return false;
    if (filter.status && filter.status !== 'ALL' && imp.status !== filter.status) return false;
    return true;
  });

  const handleViewDetails = (importRecord: OTAReservationImport) => {
    setSelectedImport(importRecord);
  };

  const handleCloseDialog = () => {
    setSelectedImport(null);
  };

  // Manual linking functionality would be implemented here if needed
  // const handleManualLink = async (importId: string, reservationId: string) => { ... };

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
          <h2 className="text-2xl font-bold text-gray-900">OTA Reservations</h2>
          <p className="text-gray-600 text-sm mt-1">
            View and manage OTA-imported reservations
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

        {/* Provider Filter */}
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          value={filter.provider || 'ALL'}
          onChange={(e) => setFilter({ ...filter, provider: e.target.value as any })}
        >
          <option value="ALL">All Providers</option>
          <option value="BOOKING_COM">Booking.com</option>
          <option value="MAKEMYTRIP">MakeMyTrip</option>
          <option value="AGODA">Agoda</option>
          <option value="AIRBNB">Airbnb</option>
          <option value="EXPEDIA">Expedia</option>
        </select>

        {/* Status Filter */}
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          value={filter.status || 'ALL'}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="ALL">All Statuses</option>
          <option value="IMPORTED">Imported</option>
          <option value="DUPLICATE">Duplicate</option>
          <option value="FAILED">Failed</option>
        </select>

        {/* Clear Filters */}
        {(filter.provider !== 'ALL' || filter.status !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ provider: 'ALL', status: 'ALL' })}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Reservations List */}
      {filteredImports.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {importedReservations.length === 0
              ? 'No OTA reservations imported yet. Set up auto-import in the Channel Manager to start receiving OTA bookings.'
              : 'No reservations match the selected filters.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {filteredImports.map((importRecord) => {
            const reservation = importRecord.importedReservationId 
              ? getReservation(importRecord.importedReservationId)
              : null;
            const guest = reservation?.guest || null;

            return (
              <div
                key={importRecord.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(importRecord.status)}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {getProviderName(importRecord.provider)}
                            </Badge>
                            <Badge variant={getStatusBadgeVariant(importRecord.status) as any}>
                              {importRecord.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            OTA Confirmation: {importRecord.otaConfirmationCode}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Imported: {importRecord.importedAt ? new Date(importRecord.importedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Reservation Details */}
                      {reservation && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                          {/* Guest Info */}
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500">Guest</p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown'}
                              </p>
                              {guest?.email && (
                                <p className="text-xs text-gray-600 truncate">{guest.email}</p>
                              )}
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Stay Dates</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(reservation.checkIn).toLocaleDateString()} -
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(reservation.checkOut).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {/* Room Info */}
                          <div className="flex items-start gap-2">
                            <Home className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500">Room</p>
                              <p className="text-sm font-medium text-gray-900">
                                {reservation.roomTypeId}
                              </p>
                              <p className="text-xs text-gray-600">
                                {reservation.adults} Adults, {reservation.children} Children
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Linkage Info */}
                      <div className="flex items-center gap-2">
                        {importRecord.importedReservationId ? (
                          <>
                            <LinkIcon className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-gray-700">
                              Linked to PMS Reservation: 
                              <span className="font-mono text-xs ml-2 text-blue-600">
                                {importRecord.importedReservationId.slice(0, 16)}...
                              </span>
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-gray-700">Not linked to PMS reservation</span>
                          </>
                        )}
                      </div>

                      {/* Error Message */}
                      {importRecord.errorMessage && (
                        <Alert className="border-red-200 bg-red-50">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800 text-sm">
                            {importRecord.errorMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(importRecord)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-3 w-3" />
                      Details
                    </Button>
                    {importRecord.importedReservationId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Navigate to reservation details
                          window.location.href = `/reservations/${importRecord.importedReservationId}`;
                        }}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {importedReservations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-900">{importedReservations.length}</p>
            <p className="text-sm text-blue-700">Total Imports</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-900">
              {importedReservations.filter(i => i.status === 'IMPORTED').length}
            </p>
            <p className="text-sm text-green-700">Successfully Imported</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-900">
              {importedReservations.filter(i => i.status === 'FAILED').length}
            </p>
            <p className="text-sm text-red-700">Failed Imports</p>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedImport} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>OTA Reservation Details</DialogTitle>
            <DialogDescription>
              Imported from {selectedImport && getProviderName(selectedImport.provider)}
            </DialogDescription>
          </DialogHeader>

          {selectedImport && (
            <div className="space-y-4 py-4">
              {/* Import Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Import ID</p>
                  <p className="font-mono text-xs mt-1">{selectedImport.id}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Hotel Code</p>
                  <p className="font-medium mt-1">{selectedImport.hotelCode}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">OTA Confirmation</p>
                  <p className="font-medium mt-1">{selectedImport.otaConfirmationCode}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <Badge variant={getStatusBadgeVariant(selectedImport.status) as any} className="mt-1">
                    {selectedImport.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Imported At</p>
                  <p className="font-medium mt-1">
                    {selectedImport.importedAt ? new Date(selectedImport.importedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {selectedImport.importedReservationId && (
                  <div>
                    <p className="text-gray-500 text-xs">PMS Reservation ID</p>
                    <p className="font-mono text-xs mt-1">{selectedImport.importedReservationId}</p>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {selectedImport.errorMessage && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <p className="font-semibold text-red-900 mb-1">Error Message:</p>
                    <p className="text-sm text-red-800">{selectedImport.errorMessage}</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Reservation Details */}
              {selectedImport.importedReservationId && (() => {
                const reservation = getReservation(selectedImport.importedReservationId);
                const guest = reservation?.guest || null;
                
                return reservation ? (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold text-gray-900">PMS Reservation Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Guest Name</p>
                        <p className="font-medium mt-1">
                          {guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Room Type</p>
                        <p className="font-medium mt-1">{reservation.roomTypeId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Check-in</p>
                        <p className="font-medium mt-1">
                          {new Date(reservation.checkIn).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Check-out</p>
                        <p className="font-medium mt-1">
                          {new Date(reservation.checkOut).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Status</p>
                        <Badge className="mt-1">{reservation.status}</Badge>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total Amount</p>
                        <p className="font-medium mt-1">
                          INR {reservation.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Manual Override Options */}
              {!selectedImport.importedReservationId && (
                <div className="border-t pt-4">
                  <Alert className="border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <p className="font-semibold mb-2">Manual Override</p>
                      <p className="text-sm mb-3">
                        This import failed or was flagged as duplicate. You can manually link it to an existing reservation or retry the import.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Retry Import
                        </Button>
                        <Button size="sm" variant="outline">
                          Link Manually
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
