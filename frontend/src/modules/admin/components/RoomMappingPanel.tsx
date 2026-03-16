import { useEffect, useState } from 'react';
import { useOTAStore } from '../../../stores/otaStore';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { 
  Plus, 
  Link as LinkIcon, 
  Trash2, 
  AlertCircle,
  Loader2,
  ArrowRight,
  Check
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
import type { OTAChannelResponse as OTAChannel, OTARoomMapping } from '../../../services/otaApi';

type RoomTypeMapping = OTARoomMapping & {
  roomTypeName: string;
};

export default function RoomMappingPanel() {
  const { channels, fetchChannels } = useOTAStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<OTAChannel | null>(null);
  const [roomTypes, setRoomTypes] = useState<Array<{ id: string; name: string; shortCode: string }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RoomTypeMapping | null>(null);
  const [newMapping, setNewMapping] = useState<RoomTypeMapping>({
    roomTypeId: '',
    roomTypeName: '',
    otaRoomTypeId: '',
    otaRoomTypeName: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchChannels();
      // Fetch room types from property API
      const response = await fetch('/api/property/room-types', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRoomTypes(data.roomTypes || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChannel = (channel: OTAChannel) => {
    setSelectedChannel(channel);
  };

  const handleOpenDialog = (mapping?: { roomTypeId: string; otaRoomTypeId: string; otaRoomTypeName: string }) => {
    if (mapping) {
      const roomType = roomTypes.find(rt => rt.id === mapping.roomTypeId);
      setEditingMapping({
        ...mapping,
        roomTypeName: roomType?.name || '',
      });
      setNewMapping({
        ...mapping,
        roomTypeName: roomType?.name || '',
      });
    } else {
      setEditingMapping(null);
      setNewMapping({
        roomTypeId: '',
        roomTypeName: '',
        otaRoomTypeId: '',
        otaRoomTypeName: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMapping(null);
  };

  const handleSaveMapping = async () => {
    if (!selectedChannel) return;

    const updatedMappings = editingMapping
      ? selectedChannel.mappings.map((m: OTARoomMapping) =>
          m.roomTypeId === editingMapping.roomTypeId ? newMapping : m
        )
      : [...selectedChannel.mappings, newMapping];

    try {
      const response = await fetch(`/api/ota/channels/${selectedChannel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          mappings: updatedMappings,
        }),
      });

      if (response.ok) {
        await fetchChannels();
        const updatedChannel = channels.find(c => c.id === selectedChannel.id);
        if (updatedChannel) {
          setSelectedChannel(updatedChannel);
        }
        handleCloseDialog();
      }
    } catch (error) {
      console.error('Failed to save mapping:', error);
    }
  };

  const handleDeleteMapping = async (roomTypeId: string) => {
    if (!selectedChannel) return;
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    const updatedMappings = selectedChannel.mappings.filter((m: OTARoomMapping) => m.roomTypeId !== roomTypeId);

    try {
      const response = await fetch(`/api/ota/channels/${selectedChannel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          mappings: updatedMappings,
        }),
      });

      if (response.ok) {
        await fetchChannels();
        const updatedChannel = channels.find(c => c.id === selectedChannel.id);
        if (updatedChannel) {
          setSelectedChannel(updatedChannel);
        }
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error);
    }
  };

  const getProviderName = (provider: string): string => {
    const names: Record<string, string> = {
      BOOKING_COM: 'Booking.com',
      MAKEMYTRIP: 'MakeMyTrip',
      AGODA: 'Agoda',
      AIRBNB: 'Airbnb',
      EXPEDIA: 'Expedia',
    };
    return names[provider] || provider;
  };

  const getMappedRoomTypeIds = () => {
    return selectedChannel?.mappings.map((m: OTARoomMapping) => m.roomTypeId) || [];
  };

  const getUnmappedRoomTypes = () => {
    const mappedIds = getMappedRoomTypeIds();
    return roomTypes.filter(rt => !mappedIds.includes(rt.id));
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Room Type Mapping</h2>
        <p className="text-gray-600 text-sm mt-1">
          Map your property's room types to OTA-specific room types
        </p>
      </div>

      {/* Channel Selection */}
      {!selectedChannel ? (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select a channel to manage room type mappings
            </AlertDescription>
          </Alert>

          {channels.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No OTA channels configured. Please add a channel first in the Channel Manager tab.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleSelectChannel(channel)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {getProviderName(channel.provider)}
                    </h3>
                    <Badge variant={channel.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {channel.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {channel.mappings.length} room type{channel.mappings.length !== 1 ? 's' : ''} mapped
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Channel Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {getProviderName(selectedChannel.provider)}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedChannel.mappings.length} mapped, {getUnmappedRoomTypes().length} unmapped
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Mapping
              </Button>
              <Button variant="outline" onClick={() => setSelectedChannel(null)}>
                Back to Channels
              </Button>
            </div>
          </div>

          {/* Mappings List */}
          {selectedChannel.mappings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No room type mappings configured. Click "Add Mapping" to create your first mapping.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {selectedChannel.mappings.map((mapping: OTARoomMapping) => {
                const roomType = roomTypes.find(rt => rt.id === mapping.roomTypeId);
                return (
                  <div
                    key={mapping.roomTypeId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* PMS Room Type */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              PMS
                            </Badge>
                            <span className="font-medium text-gray-900">
                              {roomType?.name || mapping.roomTypeId}
                            </span>
                          </div>
                          {roomType?.shortCode && (
                            <p className="text-xs text-gray-500 mt-1">Code: {roomType.shortCode}</p>
                          )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />

                        {/* OTA Room Type */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs">
                              {getProviderName(selectedChannel.provider)}
                            </Badge>
                            <span className="font-medium text-gray-900">
                              {mapping.otaRoomTypeName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">ID: {mapping.otaRoomTypeId}</p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Mapped</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(mapping)}
                        >
                          <LinkIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteMapping(mapping.roomTypeId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unmapped Room Types Warning */}
          {getUnmappedRoomTypes().length > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{getUnmappedRoomTypes().length} room type(s)</strong> are not mapped to {getProviderName(selectedChannel.provider)}.
                These rooms won't sync inventory or rates to the OTA.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Add/Edit Mapping Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? 'Edit Room Mapping' : 'Add Room Mapping'}
            </DialogTitle>
            <DialogDescription>
              Map a property room type to an OTA-specific room type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* PMS Room Type Selection */}
            <div className="space-y-2">
              <Label>Property Room Type</Label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newMapping.roomTypeId}
                onChange={(e) => {
                  const roomType = roomTypes.find(rt => rt.id === e.target.value);
                  setNewMapping({
                    ...newMapping,
                    roomTypeId: e.target.value,
                    roomTypeName: roomType?.name || '',
                  });
                }}
                disabled={!!editingMapping}
              >
                <option value="">Select Room Type</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.shortCode})
                  </option>
                ))}
              </select>
            </div>

            {/* OTA Room Type */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                {selectedChannel ? getProviderName(selectedChannel.provider) : 'OTA'} Room Type
              </Label>
              
              <div className="space-y-2">
                <Label htmlFor="otaRoomTypeId">OTA Room Type ID</Label>
                <Input
                  id="otaRoomTypeId"
                  value={newMapping.otaRoomTypeId}
                  onChange={(e) => setNewMapping({ ...newMapping, otaRoomTypeId: e.target.value })}
                  placeholder="e.g., booking-com-deluxe-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otaRoomTypeName">OTA Room Type Name</Label>
                <Input
                  id="otaRoomTypeName"
                  value={newMapping.otaRoomTypeName}
                  onChange={(e) => setNewMapping({ ...newMapping, otaRoomTypeName: e.target.value })}
                  placeholder="e.g., Deluxe Room - King Bed"
                />
              </div>
            </div>

            {/* Mapping Preview */}
            {newMapping.roomTypeId && newMapping.otaRoomTypeId && (
              <Alert className="border-blue-500 bg-blue-50">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="flex items-center gap-2">
                    <strong>{roomTypes.find(rt => rt.id === newMapping.roomTypeId)?.name}</strong>
                    <ArrowRight className="h-4 w-4" />
                    <strong>{newMapping.otaRoomTypeName}</strong>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMapping}
              disabled={!newMapping.roomTypeId || !newMapping.otaRoomTypeId || !newMapping.otaRoomTypeName}
            >
              {editingMapping ? 'Save Changes' : 'Create Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
