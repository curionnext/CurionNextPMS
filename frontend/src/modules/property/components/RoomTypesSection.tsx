import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { usePropertyStore } from '../../../stores/propertyStore';
import type { RoomType } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function RoomTypesSection() {
  const { roomTypes, addRoomType, updateRoomType, deleteRoomType } = usePropertyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    capacity: '',
    baseRate: '',
    extraBedRate: '',
    amenities: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOperationError(null);

    const capacity = Number.parseInt(formData.capacity, 10);
    const baseRate = Number.parseFloat(formData.baseRate) || 0;
    const extraBedRate = Number.parseFloat(formData.extraBedRate) || 0;

    if (Number.isNaN(capacity) || capacity <= 0) {
      setOperationError('Capacity must be a positive number.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      shortCode: formData.shortCode.trim().toUpperCase(),
      capacity,
      baseRate,
      extraBedRate,
      amenities: formData.amenities
        .split(',')
        .map((amenity) => amenity.trim())
        .filter(Boolean),
      description: formData.description,
      isActive: true,
    };

    try {
      if (editingType) {
        await updateRoomType(editingType.id, payload);
      } else {
        await addRoomType(payload);
      }
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save room type.';
      setOperationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (roomType?: RoomType) => {
    setOperationError(null);
    if (roomType) {
      setEditingType(roomType);
      setFormData({
        name: roomType.name,
        shortCode: roomType.shortCode,
        capacity: roomType.capacity.toString(),
        baseRate: roomType.baseRate.toString(),
        extraBedRate: roomType.extraBedRate.toString(),
        amenities: roomType.amenities.join(', '),
        description: roomType.description,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        shortCode: '',
        capacity: '',
        baseRate: '',
        extraBedRate: '',
        amenities: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setIsSubmitting(false);
    setFormData({
      name: '',
      shortCode: '',
      capacity: '',
      baseRate: '',
      extraBedRate: '',
      amenities: '',
      description: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room type?')) {
      return;
    }
    setDeletingId(id);
    setOperationError(null);
    try {
      await deleteRoomType(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete room type.';
      setOperationError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Room Types</h2>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room Type
        </Button>
      </div>

      {operationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {operationError}
        </div>
      )}

      {/* Table */}
      {roomTypes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No room types configured yet</p>
          <Button onClick={() => openModal()} variant="secondary" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Room Type
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amenities
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roomTypes.map((roomType) => (
                <tr key={roomType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{roomType.name}</div>
                    <div className="text-sm text-gray-500">{roomType.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-mono font-semibold bg-gray-100 text-gray-800 rounded">
                      {roomType.shortCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {roomType.capacity} Guest{roomType.capacity > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{roomType.baseRate.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {roomType.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                          {amenity}
                        </span>
                      ))}
                      {roomType.amenities.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          +{roomType.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(roomType)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(roomType.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deletingId === roomType.id}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingType ? 'Edit Room Type' : 'Add Room Type'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Room Type Name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Deluxe Room"
                    />
                  </div>
                  <Input
                    label="Short Code"
                    required
                    value={formData.shortCode}
                    onChange={(e) => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                    placeholder="DLX"
                    maxLength={5}
                  />
                  <Input
                    label="Capacity"
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="2"
                  />
                  <Input
                    label="Base Rate (₹)"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.baseRate}
                    onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                    placeholder="5000"
                  />
                  <Input
                    label="Extra Bed Rate (₹)"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.extraBedRate}
                    onChange={(e) => setFormData({ ...formData, extraBedRate: e.target.value })}
                    placeholder="1000"
                  />
                  <div className="col-span-2">
                    <Input
                      label="Amenities"
                      value={formData.amenities}
                      onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                      placeholder="WiFi, AC, TV, Mini Bar (comma separated)"
                      helperText="Separate amenities with commas"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Brief description of the room type"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    {editingType ? 'Update' : 'Create'} Room Type
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
