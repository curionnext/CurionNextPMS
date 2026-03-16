import { useState } from 'react';
import { Plus, Edit2, UtensilsCrossed, Coffee, IceCream, Package2, Grid3x3 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { usePOSStore } from '../../../stores/posStore';
import { formatCurrency } from '../../../utils';
import type { POSMenuItem, POSMenuCategory } from '../../../types';

type TabType = 'menu' | 'tables';

export function POSManagementSection() {
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">POS Management</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Manage dining rooms, tables, and menu items for your restaurant operations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'menu'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Menu Items
          </div>
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tables'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Tables & Dining Rooms
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'menu' ? <MenuItemsManager /> : <TablesManager />}
    </div>
  );
}

function MenuItemsManager() {
  const { menu, addMenuItem, updateMenuItem, toggleMenuAvailability } = usePOSStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<POSMenuItem>>({
    name: '',
    category: 'food',
    price: 0,
    description: '',
    isAvailable: true,
    printerRoute: 'main',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    if (editingId) {
      updateMenuItem(editingId, formData);
      setEditingId(null);
    } else {
      addMenuItem(formData as Omit<POSMenuItem, 'id'>);
      setIsAdding(false);
    }

    setFormData({
      name: '',
      category: 'food',
      price: 0,
      description: '',
      isAvailable: true,
      printerRoute: 'main',
    });
  };

  const handleEdit = (item: POSMenuItem) => {
    setFormData(item);
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      category: 'food',
      price: 0,
      description: '',
      isAvailable: true,
      printerRoute: 'main',
    });
  };

  const getCategoryIcon = (category: POSMenuCategory) => {
    switch (category) {
      case 'food': return UtensilsCrossed;
      case 'beverage': return Coffee;
      case 'dessert': return IceCream;
      default: return Package2;
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <Card className="border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Item Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as POSMenuCategory })}
                    options={[
                      { value: 'food', label: 'Food' },
                      { value: 'beverage', label: 'Beverage' },
                      { value: 'dessert', label: 'Dessert' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (₹)"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                  min="0"
                  step="0.01"
                />
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Printer Route</label>
                  <Select
                    value={formData.printerRoute}
                    onChange={(e) => setFormData({ ...formData, printerRoute: e.target.value as any })}
                    options={[
                      { value: 'main', label: 'Main Kitchen' },
                      { value: 'bar', label: 'Bar' },
                      { value: 'dessert', label: 'Dessert Station' },
                      { value: 'grill', label: 'Grill' }
                    ]}
                  />
                </div>
              </div>

              <Input
                label="Description (Optional)"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="available" className="text-sm text-zinc-700">
                  Available for ordering
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  {editingId ? 'Update Item' : 'Add Item'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Menu Items List */}
      <div className="grid gap-3">
        {menu.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No menu items yet. Add your first item to get started.</p>
            </CardContent>
          </Card>
        ) : (
          menu.map((item) => {
            const CategoryIcon = getCategoryIcon(item.category);
            return (
              <Card key={item.id} className={!item.isAvailable ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-zinc-100 rounded-lg">
                        <CategoryIcon className="h-5 w-5 text-zinc-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-900">{item.name}</h3>
                          <Badge variant={item.isAvailable ? 'success' : 'default'}>
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-zinc-500 mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-medium text-zinc-900">{formatCurrency(item.price)}</span>
                          <span className="text-xs text-zinc-400">•</span>
                          <span className="text-xs text-zinc-500 capitalize">{item.category}</span>
                          <span className="text-xs text-zinc-400">•</span>
                          <span className="text-xs text-zinc-500">Printer: {item.printerRoute}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMenuAvailability(item.id)}
                      >
                        {item.isAvailable ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function TablesManager() {
  const { tables } = usePOSStore();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    seats: 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement addTable in posStore
    console.log('Add table:', formData);
    setIsAdding(false);
    setFormData({ label: '', seats: 2 });
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </Button>
      )}

      {/* Add Form */}
      {isAdding && (
        <Card className="border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Add New Table</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Table Label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="T1, Patio 1, etc."
                  required
                />
                <Input
                  label="Seats"
                  type="number"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
                  required
                  min="1"
                  max="20"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">Add Table</Button>
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tables List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map((table) => (
          <Card key={table.id}>
            <CardContent className="p-4">
              <div className="text-center">
                <Grid3x3 className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                <h3 className="font-medium text-zinc-900">{table.label}</h3>
                <p className="text-sm text-zinc-500 mt-1">{table.seats} seats</p>
                <Badge variant="default" className="mt-2 capitalize">
                  {table.status.replace('-', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tables.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3x3 className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No tables configured yet. Add your first table to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
