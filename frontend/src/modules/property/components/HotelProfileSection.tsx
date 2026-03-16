import { useState, useEffect } from 'react';
import { Save, Edit2, Upload, Building2 } from 'lucide-react';
import { usePropertyStore } from '../../../stores/propertyStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export function HotelProfileSection() {
  const { hotelProfile, updateHotelProfile, uploadLogo } = usePropertyStore();
  const [isEditing, setIsEditing] = useState(!hotelProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (hotelProfile) {
      setFormData({
        name: hotelProfile.name || '',
        address: hotelProfile.address || '',
        city: hotelProfile.city || '',
        state: hotelProfile.state || '',
        pincode: hotelProfile.pincode || '',
        phone: hotelProfile.phone || '',
        email: hotelProfile.email || '',
        gstin: hotelProfile.gstin || '',
      });
      setLogoPreview(hotelProfile.logo || null);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [hotelProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSubmitError(null);
    try {
      await updateHotelProfile(formData);
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save hotel profile.';
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        uploadLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isEditing && hotelProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Hotel Profile</h2>
          <Button onClick={() => setIsEditing(true)} variant="secondary">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo */}
          <div className="md:col-span-3 flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Hotel Logo" className="h-20 w-20 rounded-lg object-cover border" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center border">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-3">
            <h3 className="text-2xl font-bold text-gray-900">{hotelProfile.name}</h3>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Address</label>
            <p className="mt-1 text-gray-900">{hotelProfile.address}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">City</label>
            <p className="mt-1 text-gray-900">{hotelProfile.city}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">State</label>
            <p className="mt-1 text-gray-900">{hotelProfile.state}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Pincode</label>
            <p className="mt-1 text-gray-900">{hotelProfile.pincode}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone</label>
            <p className="mt-1 text-gray-900">{hotelProfile.phone}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="mt-1 text-gray-900">{hotelProfile.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">GSTIN</label>
            <p className="mt-1 text-gray-900 font-mono">{hotelProfile.gstin}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Hotel Profile</h2>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Logo</label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo Preview" className="h-20 w-20 rounded-lg object-cover border" />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center border">
              <Building2 className="h-10 w-10 text-gray-400" />
            </div>
          )}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              Upload Logo
            </span>
          </label>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Hotel Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter hotel name"
          />
        </div>
        <div className="md:col-span-2">
          <Input
            label="Address"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Street address"
          />
        </div>
        <Input
          label="City"
          required
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="City"
        />
        <Input
          label="State"
          required
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          placeholder="State"
        />
        <Input
          label="Pincode"
          required
          value={formData.pincode}
          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
          placeholder="Pincode"
        />
        <Input
          label="Phone"
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+91 1234567890"
        />
        <Input
          label="Email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="contact@hotel.com"
        />
        <Input
          label="GSTIN"
          required
          value={formData.gstin}
          onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {hotelProfile && (
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Save Profile
        </Button>
      </div>
    </form>
  );
}
