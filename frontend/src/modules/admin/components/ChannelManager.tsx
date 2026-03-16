import { useEffect, useState } from 'react';
import { useOTAStore } from '../../../stores/otaStore';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { 
  Plus, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  Package, 
  Edit2, 
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import type { OTAChannelResponse as OTAChannel, OTAProvider } from '../../../services/otaApi';

type ChannelFormData = {
  provider: OTAProvider;
  credentials: Record<string, string>;
  autoSyncRates: boolean;
  autoSyncInventory: boolean;
  autoImportReservations: boolean;
  syncIntervalMinutes: number;
};

export default function ChannelManager() {
  const { channels, fetchChannels, createChannel, updateChannel, deleteChannel, testConnection, syncRates, syncInventory, error: storeError } = useOTAStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<OTAChannel | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [syncingChannel, setSyncingChannel] = useState<{ id: string; type: 'rates' | 'inventory' } | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>({
    provider: 'BOOKING_COM',
    credentials: {},
    autoSyncRates: true,
    autoSyncInventory: true,
    autoImportReservations: true,
    syncIntervalMinutes: 60,
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      await fetchChannels();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (channel?: OTAChannel) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        provider: channel.provider,
        credentials: channel.credentials,
        autoSyncRates: channel.syncSettings.autoSyncRates,
        autoSyncInventory: channel.syncSettings.autoSyncInventory,
        autoImportReservations: channel.syncSettings.autoImportReservations,
        syncIntervalMinutes: channel.syncSettings.syncIntervalMinutes,
      });
    } else {
      setEditingChannel(null);
      setFormData({
        provider: 'BOOKING_COM',
        credentials: {},
        autoSyncRates: true,
        autoSyncInventory: true,
        autoImportReservations: true,
        syncIntervalMinutes: 60,
      });
    }
    setTestResult(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingChannel(null);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!editingChannel?.id) return;
    
    setTestingChannel(editingChannel.id);
    setTestResult(null);
    
    try {
      const result = await testConnection(editingChannel.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTestingChannel(null);
    }
  };

  const handleSaveChannel = async () => {
    try {
      if (editingChannel) {
        await updateChannel(editingChannel.id, {
          credentials: formData.credentials,
          syncSettings: {
            autoSyncRates: formData.autoSyncRates,
            autoSyncInventory: formData.autoSyncInventory,
            autoImportReservations: formData.autoImportReservations,
            syncIntervalMinutes: formData.syncIntervalMinutes,
          },
        });
      } else {
        await createChannel({
          provider: formData.provider,
          credentials: formData.credentials,
          mappings: [],
          syncSettings: {
            autoSyncRates: formData.autoSyncRates,
            autoSyncInventory: formData.autoSyncInventory,
            autoImportReservations: formData.autoImportReservations,
            syncIntervalMinutes: formData.syncIntervalMinutes,
          },
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save channel:', error);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      await deleteChannel(id);
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  };

  const handleSyncRates = async (channelId: string) => {
    setSyncingChannel({ id: channelId, type: 'rates' });
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await syncRates(channelId, { from: today, to: futureDate });
      alert('Rate sync completed successfully!');
    } catch (error) {
      alert('Rate sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncingChannel(null);
    }
  };

  const handleSyncInventory = async (channelId: string) => {
    setSyncingChannel({ id: channelId, type: 'inventory' });
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await syncInventory(channelId, { from: today, to: futureDate });
      alert('Inventory sync completed successfully!');
    } catch (error) {
      alert('Inventory sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncingChannel(null);
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

  const getCredentialFields = (provider: OTAProvider): string[] => {
    const fields: Record<OTAProvider, string[]> = {
      BOOKING_COM: ['hotelId', 'apiKey'],
      MAKEMYTRIP: ['propertyId', 'username', 'password'],
      AIRBNB: ['listingId', 'accessToken'],
      EXPEDIA: ['propertyId', 'apiKey', 'secret'],
      GOIBIBO: ['propertyId', 'apiKey'],
    };
    return fields[provider] || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Ensure channels is always an array
  const safeChannels = Array.isArray(channels) ? channels : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Channel Manager</h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage your OTA connections and sync settings
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {/* Error Display */}
      {storeError && (
        <Alert className="border-red-500">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {storeError}
          </AlertDescription>
        </Alert>
      )}

      {/* Channels List */}
      {safeChannels.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No OTA channels configured. Click "Add Channel" to connect your first OTA.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeChannels.filter(channel => channel && channel.id && channel.provider).map((channel) => (
            <div
              key={channel.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {getProviderName(channel.provider)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {channel.id.slice(0, 12)}...
                  </p>
                </div>
                <Badge variant={channel.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {channel.status === 'ACTIVE' ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {channel.status}
                </Badge>
              </div>

              {/* Sync Settings */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  {channel.syncSettings.autoSyncRates ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-gray-700">Auto Sync Rates</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {channel.syncSettings.autoSyncInventory ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-gray-700">Auto Sync Inventory</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {channel.syncSettings.autoImportReservations ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-gray-700">Auto Import Reservations</span>
                </div>
              </div>

              {/* Last Sync */}
              {channel.lastSyncAt && (
                <p className="text-xs text-gray-500 mb-4">
                  Last sync: {new Date(channel.lastSyncAt).toLocaleString()}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSyncRates(channel.id)}
                  disabled={syncingChannel?.id === channel.id && syncingChannel.type === 'rates'}
                  className="flex-1 min-w-[100px]"
                >
                  {syncingChannel?.id === channel.id && syncingChannel.type === 'rates' ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  Sync Rates
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSyncInventory(channel.id)}
                  disabled={syncingChannel?.id === channel.id && syncingChannel.type === 'inventory'}
                  className="flex-1 min-w-[100px]"
                >
                  {syncingChannel?.id === channel.id && syncingChannel.type === 'inventory' ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Package className="h-3 w-3 mr-1" />
                  )}
                  Sync Inventory
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(channel)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteChannel(channel.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Channel Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? 'Edit Channel' : 'Add New Channel'}
            </DialogTitle>
            <DialogDescription>
              {editingChannel
                ? 'Update channel settings and credentials'
                : 'Configure a new OTA channel connection'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Provider Selection (only for new channels) */}
            {!editingChannel && (
              <div className="space-y-2">
                <Label>OTA Provider</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as OTAProvider })}
                >
                  <option value="BOOKING_COM">Booking.com</option>
                  <option value="MAKEMYTRIP">MakeMyTrip</option>
                  <option value="AGODA">Agoda</option>
                  <option value="AIRBNB">Airbnb</option>
                  <option value="EXPEDIA">Expedia</option>
                </select>
              </div>
            )}

            {/* Credentials */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Credentials</Label>
              {getCredentialFields(formData.provider).map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <Input
                    id={field}
                    type={field.includes('password') || field.includes('secret') ? 'password' : 'text'}
                    value={formData.credentials[field] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, [field]: e.target.value },
                      })
                    }
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
            </div>

            {/* Sync Settings */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Sync Settings</Label>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSyncRates"
                  checked={formData.autoSyncRates}
                  onChange={(e) => setFormData({ ...formData, autoSyncRates: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="autoSyncRates" className="font-normal cursor-pointer">
                  Automatically sync rates
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSyncInventory"
                  checked={formData.autoSyncInventory}
                  onChange={(e) => setFormData({ ...formData, autoSyncInventory: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="autoSyncInventory" className="font-normal cursor-pointer">
                  Automatically sync inventory
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoImportReservations"
                  checked={formData.autoImportReservations}
                  onChange={(e) => setFormData({ ...formData, autoImportReservations: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="autoImportReservations" className="font-normal cursor-pointer">
                  Automatically import reservations
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  min="15"
                  max="1440"
                  value={formData.syncIntervalMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 60 })
                  }
                />
              </div>
            </div>

            {/* Test Connection */}
            {editingChannel && (
              <div className="border-t pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={testingChannel === editingChannel.id}
                  variant="outline"
                  className="w-full"
                >
                  {testingChannel === editingChannel.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert className={`mt-3 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveChannel}>
              {editingChannel ? 'Save Changes' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
