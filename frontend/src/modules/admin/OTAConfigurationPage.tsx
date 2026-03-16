import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { otaApi } from '../../services/advancedFeaturesApi';
import { propertyApi } from '../../services/propertyApi';
import type { OTAChannel, OTAProvider, RoomType } from '../../types';
import {
  Plus as PlusIcon,
  CheckCircle as CheckCircleIcon,
  RefreshCw as ArrowPathIcon,
  Trash2 as TrashIcon
} from 'lucide-react';

const OTA_PROVIDERS: { value: OTAProvider; label: string }[] = [
  { value: 'BOOKING_COM', label: 'Booking.com' },
  { value: 'EXPEDIA', label: 'Expedia' },
  { value: 'AIRBNB', label: 'Airbnb' },
  { value: 'MAKEMYTRIP', label: 'MakeMyTrip' },
  { value: 'GOIBIBO', label: 'Goibibo' }
];

export default function OTAConfigurationPage() {
  const [channels, setChannels] = useState<OTAChannel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<OTAChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    provider: 'BOOKING_COM' as OTAProvider,
    credentials: {
      apiKey: '',
      hotelId: '',
      propertyId: '',
      username: '',
      password: ''
    },
    syncSettings: {
      autoSyncRates: true,
      autoSyncInventory: true,
      autoImportReservations: true,
      syncIntervalMinutes: 60
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [channelsData, roomTypesData] = await Promise.all([
        otaApi.getChannels(),
        propertyApi.fetchRoomTypes()
      ]);
      setChannels(channelsData);
      setRoomTypes(roomTypesData);
    } catch (err) {
      setError('Failed to load OTA data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const result = await otaApi.testConnection(id);
      alert(result.message);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Connection test failed');
    }
  };

  const handleSyncRates = async (id: string) => {
    try {
      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await otaApi.syncRates(id, { from, to });
      alert('Rates sync initiated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rates sync failed');
    }
  };

  const handleSyncInventory = async (id: string) => {
    try {
      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await otaApi.syncInventory(id, { from, to });
      alert('Inventory sync initiated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Inventory sync failed');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      await otaApi.deleteChannel(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete channel');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Create minimal mappings for all room types
      const mappings = roomTypes.map(rt => ({
        roomTypeId: rt.id,
        otaRoomTypeId: rt.shortCode,
        otaRoomTypeName: rt.name
      }));

      if (editingChannel) {
        await otaApi.updateChannel(editingChannel.id, {
          ...formData,
          mappings
        });
      } else {
        await otaApi.createChannel({
          ...formData,
          mappings
        });
      }

      setShowDialog(false);
      setEditingChannel(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save channel');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: OTAChannel['status']) => {
    const variants: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      ERROR: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">OTA Integration</h1>
          <p className="text-gray-600 mt-1">Manage online travel agency connections</p>
        </div>
        <Button
          onClick={() => {
            setEditingChannel(null);
            setFormData({
              provider: 'BOOKING_COM',
              credentials: {
                apiKey: '',
                hotelId: '',
                propertyId: '',
                username: '',
                password: ''
              },
              syncSettings: {
                autoSyncRates: true,
                autoSyncInventory: true,
                autoImportReservations: true,
                syncIntervalMinutes: 60
              }
            });
            setShowDialog(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add OTA Channel
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Channels Grid */}
      {channels.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500 text-center py-8">
              No OTA channels configured. Click "Add OTA Channel" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {OTA_PROVIDERS.find(p => p.value === channel.provider)?.label || channel.provider}
                    </CardTitle>
                    <CardDescription>
                      {channel.mappings.length} room types mapped
                    </CardDescription>
                  </div>
                  {getStatusBadge(channel.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sync Settings */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sync Settings</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Auto-sync Rates:</span>
                        <span className="font-medium">
                          {channel.syncSettings.autoSyncRates ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Auto-sync Inventory:</span>
                        <span className="font-medium">
                          {channel.syncSettings.autoSyncInventory ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sync Interval:</span>
                        <span className="font-medium">
                          {channel.syncSettings.syncIntervalMinutes} minutes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last Sync */}
                  {channel.lastSyncAt && (
                    <div>
                      <p className="text-sm text-gray-600">
                        Last synced: {new Date(channel.lastSyncAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(channel.id)}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncRates(channel.id)}
                      disabled={channel.status !== 'ACTIVE'}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Sync Rates
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncInventory(channel.id)}
                      disabled={channel.status !== 'ACTIVE'}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Sync Inventory
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteChannel(channel.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? 'Edit' : 'Add'} OTA Channel
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="provider">OTA Provider</Label>
              <select
                id="provider"
                className="w-full mt-1 p-2 border rounded-md"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as OTAProvider })}
              >
                {OTA_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={formData.credentials.apiKey}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, apiKey: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="hotelId">Hotel ID</Label>
                <Input
                  id="hotelId"
                  value={formData.credentials.hotelId}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, hotelId: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="autoSyncRates"
                checked={formData.syncSettings.autoSyncRates}
                onChange={(e) => setFormData({
                  ...formData,
                  syncSettings: { ...formData.syncSettings, autoSyncRates: e.target.checked }
                })}
              />
              <Label htmlFor="autoSyncRates">Auto-sync Rates</Label>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="autoSyncInventory"
                checked={formData.syncSettings.autoSyncInventory}
                onChange={(e) => setFormData({
                  ...formData,
                  syncSettings: { ...formData.syncSettings, autoSyncInventory: e.target.checked }
                })}
              />
              <Label htmlFor="autoSyncInventory">Auto-sync Inventory</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Channel'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
