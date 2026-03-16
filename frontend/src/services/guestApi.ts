import api from '../lib/apiClient';
import type { Guest } from '../types';

export type GuestDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality?: string;
  idType?: Guest['idType'];
  idNumber?: string;
  address?: Guest['address'];
  preferences?: Guest['preferences'];
  loyaltyTier?: Guest['loyaltyTier'];
  totalSpent?: number;
};

export type GuestUpdatePayload = Partial<GuestDraft>;

type GuestResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferences?: string[];
  tags?: string[];
  notes?: string;
  visitCount: number;
  stayHistory: string[];
  idDocuments: Array<{
    type: string;
    number: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type GuestPreferences = NonNullable<Guest['preferences']>;
type RoomPreferences = NonNullable<NonNullable<Guest['preferences']>['room']>;
type FoodPreferences = NonNullable<NonNullable<Guest['preferences']>['food']>;

type CreateGuestRequest = {
  hotelId: string;
  hotelCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferences?: string[];
  tags?: string[];
  notes?: string;
};

const encodeValue = (value: string) => encodeURIComponent(value.trim());
const decodeValue = (value: string) => decodeURIComponent(value);

const splitPreferenceEntry = (entry: string) => {
  const index = entry.indexOf(':');
  if (index === -1) {
    return [entry, ''] as const;
  }
  return [entry.slice(0, index), entry.slice(index + 1)] as const;
};

const parsePreferences = (values: string[] | undefined, notes: string | undefined): Guest['preferences'] | undefined => {
  const hasNotes = typeof notes === 'string';
  const hasValues = Array.isArray(values) && values.length > 0;

  if (!hasValues && !hasNotes) {
    return undefined;
  }

  const preferences: Guest['preferences'] = {};

  if (hasNotes) {
    preferences.additionalRequests = notes ?? '';
  }

  values?.forEach((entry) => {
    const [key, raw] = splitPreferenceEntry(entry);
    if (!key) {
      return;
    }

    const value = decodeValue(raw ?? '');

    switch (key) {
      case 'smoking':
        if (value === 'smoking' || value === 'non-smoking') {
          preferences.smokingPreference = value as GuestPreferences['smokingPreference'];
        }
        break;
      case 'bed':
        if (['single', 'double', 'twin', 'king'].includes(value)) {
          preferences.bedType = value as GuestPreferences['bedType'];
        }
        break;
      case 'floor':
        if (['low', 'mid', 'high'].includes(value)) {
          preferences.floor = value as GuestPreferences['floor'];
        }
        break;
      case 'view': {
        const room: RoomPreferences = { ...(preferences.room ?? {}) };
        room.viewPreference = value;
        preferences.room = room;
        break;
      }
      case 'roomAmenity': {
        if (!value) {
          break;
        }
        const room: RoomPreferences = { ...(preferences.room ?? {}) };
        const amenities = new Set(room.amenities ?? []);
        amenities.add(value);
        room.amenities = Array.from(amenities);
        preferences.room = room;
        break;
      }
      case 'roomNote': {
        const room: RoomPreferences = { ...(preferences.room ?? {}) };
        room.notes = value;
        preferences.room = room;
        break;
      }
      case 'diet': {
        if (!value) {
          break;
        }
        const food: FoodPreferences = { ...(preferences.food ?? {}) };
        const dietaryRestrictions = new Set(food.dietaryRestrictions ?? []);
        dietaryRestrictions.add(value);
        food.dietaryRestrictions = Array.from(dietaryRestrictions);
        preferences.food = food;
        break;
      }
      case 'cuisine': {
        if (!value) {
          break;
        }
        const food: FoodPreferences = { ...(preferences.food ?? {}) };
        const cuisinePreferences = new Set(food.cuisinePreferences ?? []);
        cuisinePreferences.add(value);
        food.cuisinePreferences = Array.from(cuisinePreferences);
        preferences.food = food;
        break;
      }
      case 'favorite': {
        if (!value) {
          break;
        }
        const food: FoodPreferences = { ...(preferences.food ?? {}) };
        const favoriteDishes = new Set(food.favoriteDishes ?? []);
        favoriteDishes.add(value);
        food.favoriteDishes = Array.from(favoriteDishes);
        preferences.food = food;
        break;
      }
      case 'beverage': {
        if (!value) {
          break;
        }
        const food: FoodPreferences = { ...(preferences.food ?? {}) };
        const beveragePreferences = new Set(food.beveragePreferences ?? []);
        beveragePreferences.add(value);
        food.beveragePreferences = Array.from(beveragePreferences);
        preferences.food = food;
        break;
      }
      case 'foodNote': {
        const food: FoodPreferences = { ...(preferences.food ?? {}) };
        food.notes = value;
        preferences.food = food;
        break;
      }
      case 'note':
        preferences.additionalRequests = value;
        break;
      default:
        break;
    }
  });

  if (preferences.room && !preferences.room.viewPreference && !preferences.room.notes && !preferences.room.amenities?.length) {
    delete preferences.room;
  } else if (preferences.room?.amenities && !preferences.room.amenities.length) {
    delete preferences.room.amenities;
  }

  if (preferences.food) {
    if (!preferences.food.dietaryRestrictions?.length) {
      delete preferences.food.dietaryRestrictions;
    }
    if (!preferences.food.cuisinePreferences?.length) {
      delete preferences.food.cuisinePreferences;
    }
    if (!preferences.food.favoriteDishes?.length) {
      delete preferences.food.favoriteDishes;
    }
    if (!preferences.food.beveragePreferences?.length) {
      delete preferences.food.beveragePreferences;
    }
    if (!preferences.food.notes && !preferences.food.dietaryRestrictions && !preferences.food.cuisinePreferences && !preferences.food.favoriteDishes && !preferences.food.beveragePreferences) {
      delete preferences.food;
    }
  }

  if (Object.keys(preferences).length === 0) {
    return undefined;
  }

  return preferences;
};

const toGuest = (guest: GuestResponse): Guest => {
  const primaryDocument = guest.idDocuments?.[0];
  const nationality = guest.country ?? '';
  const idType = normalizeIdType(primaryDocument?.type);
  const idNumber = primaryDocument?.number ?? '';

  const address = guest.addressLine1 || guest.city || guest.state || guest.postalCode || guest.country
    ? {
        street: guest.addressLine1 ?? '',
        city: guest.city ?? '',
        state: guest.state ?? '',
        country: guest.country ?? '',
        zipCode: guest.postalCode ?? ''
      }
    : undefined;

  const preferences = parsePreferences(guest.preferences, guest.notes);

  return {
    id: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName ?? '',
    email: guest.email ?? '',
    phone: guest.phone ?? '',
    nationality,
    idType,
    idNumber,
    address,
    preferences,
    totalSpent: 0,
    loyaltyTier: undefined,
    createdAt: guest.createdAt,
    updatedAt: guest.updatedAt,
  };
};

const toCreatePayload = (context: { hotelId: string; hotelCode: string }, draft: GuestDraft): CreateGuestRequest => {
  const address = draft.address;
  const additionalRequests = draft.preferences?.additionalRequests;
  return {
    hotelId: context.hotelId,
    hotelCode: context.hotelCode,
    firstName: draft.firstName,
    lastName: draft.lastName?.trim() || undefined,
    email: draft.email?.trim(),
    phone: draft.phone?.trim(),
    addressLine1: address?.street?.trim() || undefined,
    city: address?.city?.trim() || undefined,
    state: address?.state?.trim() || undefined,
    country: address?.country?.trim() || draft.nationality?.trim() || undefined,
    postalCode: address?.zipCode?.trim() || undefined,
    notes: additionalRequests !== undefined ? additionalRequests.trim() : undefined,
    preferences: buildPreferenceList(draft.preferences)
  };
};

const toUpdatePayload = (draft: GuestUpdatePayload): Partial<CreateGuestRequest> => {
  const address = draft.address;
  const additionalRequests = draft.preferences?.additionalRequests;

  let notes: string | undefined;
  if (additionalRequests !== undefined) {
    const trimmed = additionalRequests.trim();
    notes = trimmed || '';
  }

  return {
    firstName: draft.firstName?.trim() || undefined,
    lastName: draft.lastName?.trim() || undefined,
    email: draft.email?.trim(),
    phone: draft.phone?.trim(),
    addressLine1: address?.street?.trim() || undefined,
    city: address?.city?.trim() || undefined,
    state: address?.state?.trim() || undefined,
    country: address?.country?.trim() || draft.nationality?.trim() || undefined,
    postalCode: address?.zipCode?.trim() || undefined,
    notes,
    preferences: buildPreferenceList(draft.preferences)
  };
};

const buildPreferenceList = (preferences?: Guest['preferences']) => {
  if (!preferences) {
    return undefined;
  }

  const list: string[] = [];

  if (preferences.smokingPreference) {
    list.push(`smoking:${preferences.smokingPreference}`);
  }

  if (preferences.bedType) {
    list.push(`bed:${preferences.bedType}`);
  }

  if (preferences.floor) {
    list.push(`floor:${preferences.floor}`);
  }

  if (preferences.room?.viewPreference) {
    list.push(`view:${encodeValue(preferences.room.viewPreference)}`);
  }

  if (preferences.room?.amenities?.length) {
    list.push(...preferences.room.amenities.map((amenity) => `roomAmenity:${encodeValue(amenity)}`));
  }

  if (preferences.room && preferences.room.notes !== undefined) {
    list.push(`roomNote:${encodeValue(preferences.room.notes)}`);
  }

  if (preferences.food?.dietaryRestrictions?.length) {
    list.push(...preferences.food.dietaryRestrictions.map((restriction) => `diet:${encodeValue(restriction)}`));
  }

  if (preferences.food?.cuisinePreferences?.length) {
    list.push(...preferences.food.cuisinePreferences.map((cuisine) => `cuisine:${encodeValue(cuisine)}`));
  }

  if (preferences.food?.favoriteDishes?.length) {
    list.push(...preferences.food.favoriteDishes.map((dish) => `favorite:${encodeValue(dish)}`));
  }

  if (preferences.food?.beveragePreferences?.length) {
    list.push(...preferences.food.beveragePreferences.map((drink) => `beverage:${encodeValue(drink)}`));
  }

  if (preferences.food && preferences.food.notes !== undefined) {
    list.push(`foodNote:${encodeValue(preferences.food.notes)}`);
  }

  return list;
};

const normalizeIdType = (value?: string): Guest['idType'] => {
  switch ((value ?? '').toLowerCase()) {
    case 'driving_license':
    case 'driving-licence':
    case 'license':
    case 'licence':
      return 'driving_license';
    case 'national_id':
    case 'national-id':
    case 'nationalid':
      return 'national_id';
    default:
      return 'passport';
  }
};

export const guestApi = {
  async fetchGuests(): Promise<Guest[]> {
    const response = await api.get<{ guests: GuestResponse[] }>('/guests');
    return response.data.guests.map(toGuest);
  },

  async createGuest(context: { hotelId: string; hotelCode: string }, draft: GuestDraft): Promise<Guest> {
    const payload = toCreatePayload(context, draft);
    const response = await api.post<{ guest: GuestResponse }>('/guests', payload);
    return toGuest(response.data.guest);
  },

  async updateGuest(id: string, draft: GuestUpdatePayload): Promise<Guest> {
    const payload = toUpdatePayload(draft);
    const response = await api.put<{ guest: GuestResponse }>(`/guests/${id}`, payload);
    return toGuest(response.data.guest);
  }
};
