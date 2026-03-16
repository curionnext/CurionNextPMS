import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Copy } from 'lucide-react';
import { usePropertyStore } from '../../../stores/propertyStore';
import type { RoomInventory, RoomStatus } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { cn } from '../../../utils';

const statusConfig: Record<RoomStatus, { label: string; color: string }> = {
  vacant: { label: 'Vacant', color: 'bg-green-100 text-green-800' },
  occupied: { label: 'Occupied', color: 'bg-blue-100 text-blue-800' },
  dirty: { label: 'Dirty', color: 'bg-yellow-100 text-yellow-800' },
  oos: { label: 'Out of Service', color: 'bg-red-100 text-red-800' },
  maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
};

export function RoomInventorySection() {
  const { rooms, roomTypes, floors, addRoom, updateRoom, deleteRoom, bulkCreateRooms } = usePropertyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomInventory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomTypeId: '',
    floorId: '',
    maxOccupancy: '',
    hasExtraBed: false,
  });
  const [bulkData, setBulkData] = useState({
    prefix: '',
    startNumber: '',
    endNumber: '',
    roomTypeId: '',
    floorId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOperationError(null);

    const maxOccupancy = Number.parseInt(formData.maxOccupancy, 10);

    if (!formData.roomTypeId) {
      setOperationError('Select a room type before saving.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.floorId) {
      setOperationError('Select a floor before saving.');
      setIsSubmitting(false);
      return;
    }

    if (Number.isNaN(maxOccupancy) || maxOccupancy <= 0) {
      setOperationError('Max occupancy must be a positive number.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      roomNumber: formData.roomNumber.trim(),
      roomTypeId: formData.roomTypeId,
      floorId: formData.floorId,
      status: (editingRoom ? editingRoom.status : 'vacant') as RoomStatus,
      maxOccupancy,
      hasExtraBed: formData.hasExtraBed,
      isActive: true,
    };

    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload);
      } else {
        await addRoom(payload);
      }
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save room.';
      setOperationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBulkSubmitting(true);
    setOperationError(null);

    const start = Number.parseInt(bulkData.startNumber, 10);
    const end = Number.parseInt(bulkData.endNumber, 10);

    if (!bulkData.roomTypeId) {
      setOperationError('Select a room type for bulk creation.');
      setIsBulkSubmitting(false);
      return;
    }

    if (!bulkData.floorId) {
      setOperationError('Select a floor for bulk creation.');
      setIsBulkSubmitting(false);
      return;
    }

    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      setOperationError('Provide a valid range (end number must be greater than or equal to start number).');
      setIsBulkSubmitting(false);
      return;
    }

    const roomsPayload: Omit<RoomInventory, 'id'>[] = [];
    for (let i = start; i <= end; i += 1) {
      roomsPayload.push({
        roomNumber: `${bulkData.prefix}${i.toString().padStart(3, '0')}`,
        roomTypeId: bulkData.roomTypeId,
        floorId: bulkData.floorId,
        status: 'vacant',
        maxOccupancy: 2,
        hasExtraBed: false,
        isActive: true,
      });
    }

    try {
      await bulkCreateRooms(roomsPayload);
      closeBulkModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create rooms.';
      setOperationError(message);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const openModal = (room?: RoomInventory) => {
    setOperationError(null);
    if (room) {
      setEditingRoom(room);
      setFormData({
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId,
        floorId: room.floorId,
        maxOccupancy: room.maxOccupancy.toString(),
        hasExtraBed: room.hasExtraBed,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        roomNumber: '',
        roomTypeId: roomTypes[0]?.id || '',
        floorId: floors[0]?.id || '',
        maxOccupancy: '2',
        hasExtraBed: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setIsSubmitting(false);
  };

  const openBulkModal = () => {
    setOperationError(null);
    setBulkData({
      prefix: '',
      startNumber: '101',
      endNumber: '110',
      roomTypeId: roomTypes[0]?.id || '',
      floorId: floors[0]?.id || '',
    });
    setIsBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
    setIsBulkSubmitting(false);
  };

  const getRoomTypeName = (id: string) => roomTypes.find(rt => rt.id === id)?.name || 'Unknown';
  const getFloorName = (id: string) => floors.find(f => f.id === id)?.name || 'Unassigned';

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) {
      return;
    }
    setDeletingId(id);
    setOperationError(null);
    try {
      await deleteRoom(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete room.';
      setOperationError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const canManageRooms = roomTypes.length > 0 && floors.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Room Inventory</h2>
        <div className="flex gap-2">
          <Button onClick={openBulkModal} variant="secondary" disabled={!canManageRooms}>
            <Copy className="h-4 w-4 mr-2" />
            Bulk Create
          </Button>
          <Button onClick={() => openModal()} disabled={!canManageRooms}>
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        </div>
      </div>

      {!canManageRooms && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Configure at least one room type and floor before adding rooms.
        </div>
      )}

      {operationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {operationError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = rooms.filter(r => r.status === status).length;
          return (
            <div key={status} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      {rooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No rooms configured yet</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={openBulkModal} variant="secondary">
              <Copy className="h-4 w-4 mr-2" />
              Bulk Create Rooms
            </Button>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Single Room
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900 font-mono">{room.roomNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getRoomTypeName(room.roomTypeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getFloorName(room.floorId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 text-xs font-medium rounded', statusConfig[room.status].color)}>
                      {statusConfig[room.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {room.maxOccupancy} {room.hasExtraBed && '(+1 Extra)'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(room)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deletingId === room.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingRoom ? 'Edit Room' : 'Add Room'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Room Number"
                  required
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  placeholder="101"
                />
                <Select
                  label="Room Type"
                  required
                  value={formData.roomTypeId}
                  onChange={(e) => setFormData({ ...formData, roomTypeId: e.target.value })}
                  options={roomTypes.map(rt => ({ value: rt.id, label: rt.name }))}
                />
                <Select
                  label="Floor"
                  required
                  value={formData.floorId}
                  onChange={(e) => setFormData({ ...formData, floorId: e.target.value })}
                  options={floors.map(f => ({ value: f.id, label: f.name }))}
                />
                <Input
                  label="Max Occupancy"
                  type="number"
                  required
                  min="1"
                  value={formData.maxOccupancy}
                  onChange={(e) => setFormData({ ...formData, maxOccupancy: e.target.value })}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hasExtraBed}
                    onChange={(e) => setFormData({ ...formData, hasExtraBed: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Has Extra Bed</span>
                </label>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    {editingRoom ? 'Update' : 'Create'} Room
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={closeBulkModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Bulk Create Rooms</h3>
                <button onClick={closeBulkModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBulkCreate} className="space-y-4">
                <Input
                  label="Room Number Prefix"
                  value={bulkData.prefix}
                  onChange={(e) => setBulkData({ ...bulkData, prefix: e.target.value })}
                  placeholder="Leave empty or enter prefix (e.g., 'A')"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Number"
                    type="number"
                    required
                    min="1"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({ ...bulkData, startNumber: e.target.value })}
                  />
                  <Input
                    label="End Number"
                    type="number"
                    required
                    min="1"
                    value={bulkData.endNumber}
                    onChange={(e) => setBulkData({ ...bulkData, endNumber: e.target.value })}
                  />
                </div>
                <Select
                  label="Room Type"
                  required
                  value={bulkData.roomTypeId}
                  onChange={(e) => setBulkData({ ...bulkData, roomTypeId: e.target.value })}
                  options={roomTypes.map(rt => ({ value: rt.id, label: rt.name }))}
                />
                <Select
                  label="Floor"
                  required
                  value={bulkData.floorId}
                  onChange={(e) => setBulkData({ ...bulkData, floorId: e.target.value })}
                  options={floors.map(f => ({ value: f.id, label: f.name }))}
                />
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    This will create {Math.max(0, parseInt(bulkData.endNumber || '0') - parseInt(bulkData.startNumber || '0') + 1)} rooms
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={closeBulkModal}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isBulkSubmitting}>
                    Create Rooms
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
