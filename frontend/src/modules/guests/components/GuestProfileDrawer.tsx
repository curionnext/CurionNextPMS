import { useEffect, useMemo, useState } from 'react';
import { X, Mail, Phone, Crown, MapPin, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { GuestTimeline } from './GuestTimeline';
import type { Guest, Reservation } from '../../../types';

type GuestPreferences = NonNullable<Guest['preferences']>;
type RoomPreferences = NonNullable<GuestPreferences['room']>;
type FoodPreferences = NonNullable<GuestPreferences['food']>;

interface GuestProfileDrawerProps {
  guest: Guest | null;
  stays: Reservation[];
  visitCount: number;
  lastStay?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePreferences: (preferences: Guest['preferences']) => Promise<void>;
}

interface PreferencesForm {
  smokingPreference: string;
  bedType: string;
  floor: string;
  roomAmenities: string;
  roomNotes: string;
  dietaryRestrictions: string;
  cuisinePreferences: string;
  favoriteDishes: string;
  beveragePreferences: string;
  foodNotes: string;
  additionalRequests: string;
}

const SMOKING_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'smoking', label: 'Smoking' },
  { value: 'non-smoking', label: 'Non-smoking' },
];

const BED_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'twin', label: 'Twin' },
  { value: 'king', label: 'King' },
];

const FLOOR_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'low', label: 'Lower floors' },
  { value: 'mid', label: 'Middle floors' },
  { value: 'high', label: 'Higher floors' },
];

export function GuestProfileDrawer({
  guest,
  stays,
  visitCount,
  lastStay,
  isOpen,
  onClose,
  onUpdatePreferences,
}: GuestProfileDrawerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<PreferencesForm>({
    smokingPreference: '',
    bedType: '',
    floor: '',
    roomAmenities: '',
    roomNotes: '',
    dietaryRestrictions: '',
    cuisinePreferences: '',
    favoriteDishes: '',
    beveragePreferences: '',
    foodNotes: '',
    additionalRequests: '',
  });

  useEffect(() => {
    if (!guest) {
      return;
    }

    setForm({
      smokingPreference: guest.preferences?.smokingPreference || '',
      bedType: guest.preferences?.bedType || '',
      floor: guest.preferences?.floor || '',
      roomAmenities: guest.preferences?.room?.amenities?.join(', ') || '',
      roomNotes: guest.preferences?.room?.notes || '',
      dietaryRestrictions: guest.preferences?.food?.dietaryRestrictions?.join(', ') || '',
      cuisinePreferences: guest.preferences?.food?.cuisinePreferences?.join(', ') || '',
      favoriteDishes: guest.preferences?.food?.favoriteDishes?.join(', ') || '',
      beveragePreferences: guest.preferences?.food?.beveragePreferences?.join(', ') || '',
      foodNotes: guest.preferences?.food?.notes || '',
      additionalRequests: guest.preferences?.additionalRequests || '',
    });
    setSaveError(null);
    setIsSaving(false);
  }, [guest]);

  const displayLastStay = useMemo(() => {
    if (!lastStay) {
      return 'No stays recorded';
    }
    try {
      return format(parseISO(lastStay), 'MMM d, yyyy');
    } catch (error) {
      return lastStay;
    }
  }, [lastStay]);

  if (!isOpen || !guest) {
    return null;
  }

  const handleInputChange = (field: keyof PreferencesForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseList = (value: string): string[] => {
    const entries = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return entries.length ? entries : [];
  };

  const handleSave = async () => {
    const currentPreferences = (guest.preferences ?? {}) as GuestPreferences;
    const currentRoom = (currentPreferences.room ?? {}) as RoomPreferences;
    const currentFood = (currentPreferences.food ?? {}) as FoodPreferences;

    const roomAmenities = parseList(form.roomAmenities);
    const hasExistingRoomAmenities = (currentRoom.amenities?.length ?? 0) > 0;
    const shouldSendRoomAmenities = roomAmenities.length > 0 || hasExistingRoomAmenities;

    const roomNotesTrimmed = form.roomNotes.trim();
    const hasExistingRoomNotes = typeof currentRoom.notes === 'string' && currentRoom.notes.length > 0;
    const shouldSendRoomNotes = roomNotesTrimmed.length > 0 || (form.roomNotes.length === 0 && hasExistingRoomNotes);
    const roomNotesValue = form.roomNotes.length === 0 ? '' : roomNotesTrimmed;

    let room: RoomPreferences | undefined;
    if (shouldSendRoomAmenities || shouldSendRoomNotes) {
      room = {};
      if (shouldSendRoomAmenities) {
        room.amenities = roomAmenities;
      }
      if (shouldSendRoomNotes) {
        room.notes = roomNotesValue;
      }
    }

    const dietaryRestrictions = parseList(form.dietaryRestrictions);
    const hasExistingDietary = (currentFood.dietaryRestrictions?.length ?? 0) > 0;
    const shouldSendDietary = dietaryRestrictions.length > 0 || hasExistingDietary;

    const cuisinePreferences = parseList(form.cuisinePreferences);
    const hasExistingCuisine = (currentFood.cuisinePreferences?.length ?? 0) > 0;
    const shouldSendCuisine = cuisinePreferences.length > 0 || hasExistingCuisine;

    const favoriteDishes = parseList(form.favoriteDishes);
    const hasExistingFavorites = (currentFood.favoriteDishes?.length ?? 0) > 0;
    const shouldSendFavorites = favoriteDishes.length > 0 || hasExistingFavorites;

    const beveragePreferences = parseList(form.beveragePreferences);
    const hasExistingBeverages = (currentFood.beveragePreferences?.length ?? 0) > 0;
    const shouldSendBeverages = beveragePreferences.length > 0 || hasExistingBeverages;

    const foodNotesTrimmed = form.foodNotes.trim();
    const hasExistingFoodNotes = typeof currentFood.notes === 'string' && currentFood.notes.length > 0;
    const shouldSendFoodNotes = foodNotesTrimmed.length > 0 || (form.foodNotes.length === 0 && hasExistingFoodNotes);
    const foodNotesValue = form.foodNotes.length === 0 ? '' : foodNotesTrimmed;

    let food: FoodPreferences | undefined;
    if (shouldSendDietary || shouldSendCuisine || shouldSendFavorites || shouldSendBeverages || shouldSendFoodNotes) {
      food = {};
      if (shouldSendDietary) {
        food.dietaryRestrictions = dietaryRestrictions;
      }
      if (shouldSendCuisine) {
        food.cuisinePreferences = cuisinePreferences;
      }
      if (shouldSendFavorites) {
        food.favoriteDishes = favoriteDishes;
      }
      if (shouldSendBeverages) {
        food.beveragePreferences = beveragePreferences;
      }
      if (shouldSendFoodNotes) {
        food.notes = foodNotesValue;
      }
    }

    const additionalRequestsTrimmed = form.additionalRequests.trim();
    const hasExistingAdditionalRequests = typeof currentPreferences.additionalRequests === 'string' && currentPreferences.additionalRequests.length > 0;
    const shouldSendAdditionalRequests = additionalRequestsTrimmed.length > 0 || (form.additionalRequests.length === 0 && hasExistingAdditionalRequests);
    const additionalRequestsValue = form.additionalRequests.length === 0 ? '' : additionalRequestsTrimmed;

    const preferences = {} as GuestPreferences;

    if (form.smokingPreference) {
      (preferences as any).smokingPreference = form.smokingPreference as 'smoking' | 'non-smoking';
    } else if (currentPreferences.smokingPreference) {
      (preferences as any).smokingPreference = undefined;
    }

    if (form.bedType) {
      (preferences as any).bedType = form.bedType as 'single' | 'double' | 'twin' | 'king';
    } else if (currentPreferences.bedType) {
      (preferences as any).bedType = undefined;
    }

    if (form.floor) {
      (preferences as any).floor = form.floor as 'low' | 'mid' | 'high';
    } else if (currentPreferences.floor) {
      (preferences as any).floor = undefined;
    }

    if (room) {
      preferences.room = room;
    }

    if (food) {
      preferences.food = food;
    }

    if (shouldSendAdditionalRequests) {
      preferences.additionalRequests = additionalRequestsValue;
    }

    if (Object.keys(preferences).length === 0) {
      onClose();
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      await onUpdatePreferences(preferences);
      setIsSaving(false);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save preferences.';
      setSaveError(message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="hidden flex-1 bg-gray-900/30 md:block" onClick={onClose} />
      <aside className="ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">Guest Profile</p>
            <h2 className="text-xl font-bold text-gray-900">
              {guest.firstName} {guest.lastName}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <section className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {guest.email || 'No email'}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {guest.phone || 'No phone'}
                </div>
                {guest.address && (
                  <div className="md:col-span-2 flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                    <p>
                      {guest.address.street}, {guest.address.city}, {guest.address.state}, {guest.address.country} {guest.address.zipCode}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-gray-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <Crown className="h-4 w-4 text-amber-500" />
                  {guest.loyaltyTier ? guest.loyaltyTier.toUpperCase() : 'No Tier'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <CalendarDays className="h-4 w-4 text-primary-500" />
                  Visits: {visitCount}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  Last stay: {displayLastStay}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  Total spent: ₹{guest.totalSpent.toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
              <p className="text-xs text-gray-500">Capture preferences to personalize future stays.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700">Room</p>
                <Select
                  label="Smoking"
                  value={form.smokingPreference}
                  onChange={(event) => handleInputChange('smokingPreference', event.target.value)}
                  options={SMOKING_OPTIONS}
                />
                <Select
                  label="Bed Type"
                  value={form.bedType}
                  onChange={(event) => handleInputChange('bedType', event.target.value)}
                  options={BED_OPTIONS}
                />
                <Select
                  label="Preferred Floor"
                  value={form.floor}
                  onChange={(event) => handleInputChange('floor', event.target.value)}
                  options={FLOOR_OPTIONS}
                />
                <Input
                  label="Amenities"
                  helperText="Comma separated (e.g. High floor, Near lift)"
                  value={form.roomAmenities}
                  onChange={(event) => handleInputChange('roomAmenities', event.target.value)}
                />
                <Textarea
                  label="Room Notes"
                  value={form.roomNotes}
                  onChange={(value) => handleInputChange('roomNotes', value)}
                  placeholder="Upgrade when available, prefers pool view"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700">Food & Beverage</p>
                <Input
                  label="Dietary Restrictions"
                  helperText="Comma separated"
                  value={form.dietaryRestrictions}
                  onChange={(event) => handleInputChange('dietaryRestrictions', event.target.value)}
                />
                <Input
                  label="Cuisine Preferences"
                  helperText="Comma separated"
                  value={form.cuisinePreferences}
                  onChange={(event) => handleInputChange('cuisinePreferences', event.target.value)}
                />
                <Input
                  label="Favorite Dishes"
                  helperText="Comma separated"
                  value={form.favoriteDishes}
                  onChange={(event) => handleInputChange('favoriteDishes', event.target.value)}
                />
                <Input
                  label="Beverage Preferences"
                  helperText="Comma separated"
                  value={form.beveragePreferences}
                  onChange={(event) => handleInputChange('beveragePreferences', event.target.value)}
                />
                <Textarea
                  label="Food Notes"
                  value={form.foodNotes}
                  onChange={(value) => handleInputChange('foodNotes', value)}
                  placeholder="Prefers room-temperature water, no spicy food"
                />
              </div>
            </div>

            <Textarea
              label="Additional Requests"
              value={form.additionalRequests}
              onChange={(value) => handleInputChange('additionalRequests', value)}
              placeholder="Airport pickup, pillow menu choices, etc."
            />

            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSaveError(null);
                  setIsSaving(false);
                  onClose();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </section>

          <section className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Stay History</h3>
              <p className="text-xs text-gray-500">Chronological record of past reservations.</p>
            </div>
            <GuestTimeline stays={stays} />
          </section>
        </div>
      </aside>
    </div>
  );
}

interface TextareaProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function Textarea({ label, value, placeholder, onChange }: TextareaProps) {
  return (
    <label className="block text-sm text-gray-700">
      <span className="mb-2 block font-medium">{label}</span>
      <textarea
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
