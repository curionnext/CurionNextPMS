import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, GripVertical } from 'lucide-react';
import { usePropertyStore } from '../../../stores/propertyStore';
import type { Floor } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function FloorsSection() {
  const { floors, addFloor, updateFloor, deleteFloor, reorderFloors } = usePropertyStore();
  const [localFloors, setLocalFloors] = useState<Floor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    floorNumber: '',
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const ordered = [...floors].sort((a, b) => a.sortOrder - b.sortOrder);
    setLocalFloors(ordered);
  }, [floors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOperationError(null);

    const floorNumber = Number.parseInt(formData.floorNumber, 10);

    if (Number.isNaN(floorNumber)) {
      setOperationError('Floor number must be a valid number.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      floorNumber,
      sortOrder: editingFloor ? editingFloor.sortOrder : floors.length,
    };

    try {
      if (editingFloor) {
        await updateFloor(editingFloor.id, payload);
      } else {
        await addFloor(payload);
      }
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save floor.';
      setOperationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (floor?: Floor) => {
    setOperationError(null);
    if (floor) {
      setEditingFloor(floor);
      setFormData({
        name: floor.name,
        floorNumber: floor.floorNumber.toString(),
      });
    } else {
      setEditingFloor(null);
      setFormData({
        name: '',
        floorNumber: (floors.length + 1).toString(),
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFloor(null);
    setIsSubmitting(false);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setLocalFloors((current) => {
      const reordered = [...current];
      const [draggedFloor] = reordered.splice(draggedIndex, 1);
      reordered.splice(index, 0, draggedFloor);
      return reordered.map((floor, idx) => ({ ...floor, sortOrder: idx }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) {
      return;
    }
    setDraggedIndex(null);
    setIsReordering(true);
    setOperationError(null);
    try {
      await reorderFloors(localFloors);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder floors.';
      setOperationError(message);
      setLocalFloors([...floors].sort((a, b) => a.sortOrder - b.sortOrder));
    } finally {
      setIsReordering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this floor?')) {
      return;
    }
    setDeletingId(id);
    setOperationError(null);
    try {
      await deleteFloor(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete floor.';
      setOperationError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Floors & Buildings</h2>
          <p className="text-sm text-gray-500 mt-1">Drag to reorder floors</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Floor
        </Button>
      </div>

      {operationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {operationError}
        </div>
      )}

      {localFloors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No floors configured yet</p>
          <Button onClick={() => openModal()} variant="secondary" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Floor
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {localFloors.map((floor, index) => (
            <div
              key={floor.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center justify-between p-4 bg-white border rounded-lg cursor-move
                hover:border-primary-300 hover:shadow-sm transition-all
                ${draggedIndex === index ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">{floor.name}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      Floor {floor.floorNumber}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Sort Order: {floor.sortOrder + 1}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(floor)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(floor.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={deletingId === floor.id || isReordering}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={closeModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingFloor ? 'Edit Floor' : 'Add Floor'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Floor Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Ground Floor, First Floor"
                />
                <Input
                  label="Floor Number"
                  type="number"
                  required
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
                  placeholder="1"
                  helperText="Numeric identifier for the floor"
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting} disabled={isReordering}>
                    {editingFloor ? 'Update' : 'Create'} Floor
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
