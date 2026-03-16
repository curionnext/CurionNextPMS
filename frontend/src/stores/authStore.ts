import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, Hotel, HotelProfile, Permission, Shift, User, UserRole } from '../types';
import api, { clearAuthTokenProvider, setAuthTokenProvider } from '../lib/apiClient';
import { useAccessControlStore } from './accessControlStore';
import { usePropertyStore } from './propertyStore';
import { useGuestStore } from './guestStore';
import { useReservationStore } from './reservationStore';
import { useTransactionLogStore } from './transactionLogStore';

type BackendRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'FRONT_DESK'
  | 'HOUSEKEEPING'
  | 'ACCOUNTING'
  | 'POS';

type BackendUser = {
  id: string;
  hotelId: string;
  hotelCode: string;
  username: string;
  email: string;
  displayName: string;
  roles: BackendRole[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type BackendShift = {
  id: string;
  hotelId: string;
  hotelCode: string;
  userId: string;
  shiftName: string;
  startedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LoginResponse = {
  token: string;
  user: BackendUser;
  shift: BackendShift;
};

type CurrentUserResponse = {
  user: BackendUser;
  shift?: BackendShift;
};

interface LoginCredentials {
  hotelCode: string;
  username: string;
  password: string;
  shift: Shift;
}

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasBootstrapped: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  syncRolePermissions: (role: UserRole, permissions: Permission[]) => void;
  syncUserRole: (userId: string, role: UserRole, permissions: Permission[]) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (role: UserRole) => boolean;
}

const ROLE_FALLBACK: Record<UserRole, Permission[]> = {
  admin: [
    'view_dashboard',
    'manage_reservations',
    'check_in',
    'check_out',
    'manage_rooms',
    'manage_rates',
    'view_reports',
    'manage_guests',
    'process_payments',
    'manage_housekeeping',
    'manage_users',
    'manage_pos',
    'manage_inventory',
    'view_alerts'
  ],
  manager: [
    'view_dashboard',
    'manage_reservations',
    'check_in',
    'check_out',
    'manage_rooms',
    'manage_rates',
    'view_reports',
    'manage_guests',
    'process_payments',
    'manage_pos',
    'manage_inventory',
    'view_alerts'
  ],
  'front-desk': [
    'view_dashboard',
    'manage_reservations',
    'check_in',
    'check_out',
    'manage_guests',
    'process_payments',
    'manage_pos',
    'view_alerts'
  ],
  housekeeping: [
    'view_dashboard',
    'manage_housekeeping',
    'view_alerts'
  ],
  guest: [
    'view_dashboard',
    'view_alerts'
  ]
};

const toUserRole = (roles: BackendRole[]): UserRole => {
  if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
    return 'admin';
  }
  if (roles.includes('MANAGER')) {
    return 'manager';
  }
  if (roles.includes('FRONT_DESK')) {
    return 'front-desk';
  }
  if (roles.includes('HOUSEKEEPING')) {
    return 'housekeeping';
  }
  return 'front-desk';
};

const toHotel = (profile?: HotelProfile | null): Hotel | null => {
  if (!profile) {
    return null;
  }
  return {
    code: profile.hotelCode,
    name: profile.name,
    address: profile.address,
    phone: profile.phone
  };
};

const buildUser = (backend: BackendUser, role: UserRole, permissions: Permission[]): User => ({
  id: backend.id,
  email: backend.email,
  username: backend.username,
  name: backend.displayName,
  role,
  permissions: [...permissions],
  hotelCode: backend.hotelCode,
  lastLogin: new Date().toISOString()
});

const mapShiftName = (shift: string | undefined): Shift => {
  switch ((shift ?? '').toLowerCase()) {
    case 'afternoon':
    case 'swing':
      return 'afternoon';
    case 'night':
    case 'graveyard':
      return 'night';
    default:
      return 'morning';
  }
};

const resolvePermissions = (role: UserRole) => {
  const accessControl = useAccessControlStore.getState();
  const configured = accessControl.getRolePermissions(role);
  if (configured.length > 0) {
    return configured;
  }
  return ROLE_FALLBACK[role];
};

const setStoreContexts = (hotelId: string, hotelCode: string) => {
  usePropertyStore.getState().setContext({ hotelId, hotelCode });
  useGuestStore.getState().setContext({ hotelId, hotelCode });
  useReservationStore.getState().setContext({ hotelId, hotelCode });
};

const hydrateDomainStores = async () => {
  const propertyProfile = await usePropertyStore.getState().hydrateFromBackend();
  const hotel = toHotel(propertyProfile ?? null);
  await useGuestStore.getState().hydrateFromBackend();
  await useReservationStore.getState().hydrateFromBackend();
  return hotel;
};

const clearDomainStores = () => {
  usePropertyStore.getState().reset();
  useGuestStore.getState().reset();
  useReservationStore.getState().reset();
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasBootstrapped: false,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<LoginResponse>('/auth/login', {
            hotelCode: credentials.hotelCode,
            username: credentials.username,
            password: credentials.password,
            shiftName: credentials.shift
          });

          const login = response.data;
          const role = toUserRole(login.user.roles);
          const permissions = resolvePermissions(role);

          // Make sure subsequent API calls during hydration include the fresh token
          setAuthTokenProvider(() => login.token);

          setStoreContexts(login.user.hotelId, login.user.hotelCode);
          const hotel = await hydrateDomainStores();

          const session: AuthSession = {
            token: login.token,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            shift: credentials.shift,
            shiftStartTime: login.shift?.startedAt ?? new Date().toISOString(),
            hotel: hotel ?? {
              code: login.user.hotelCode,
              name: login.user.hotelCode
            }
          };

          const user = buildUser(login.user, role, permissions);

          set({
            user,
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            hasBootstrapped: true
          });

          setAuthTokenProvider(() => useAuthStore.getState().session?.token ?? login.token);

          const accessControl = useAccessControlStore.getState();
          accessControl.syncUserAccount({ ...user });
          accessControl.recordShiftLog({
            userId: user.id,
            userName: user.name,
            role: user.role,
            shift: credentials.shift,
            loginAt: new Date().toISOString(),
            status: 'success',
            device: 'Web',
            location: 'Front Desk'
          });

          // Log user login transaction
          const transactionLog = useTransactionLogStore.getState();
          await transactionLog.logTransaction({
            eventType: 'USER_LOGIN',
            entityType: 'USER',
            entityId: user.id,
            description: `User ${user.name} logged in to ${credentials.hotelCode}`,
            metadata: {
              username: credentials.username,
              hotelCode: credentials.hotelCode,
              shift: credentials.shift,
              role: user.role,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: message, isAuthenticated: false, hasBootstrapped: false });
          clearAuthTokenProvider();
          throw error;
        }
      },

      initialize: async () => {
        const state = get();
        
        // If no token, nothing to initialize
        if (!state.session?.token) {
          set({ hasBootstrapped: true, isLoading: false });
          return;
        }

        // If already initializing, don't start again
        if (state.isLoading) {
          return;
        }

        set({ isLoading: true, error: null });
        setAuthTokenProvider(() => useAuthStore.getState().session?.token ?? undefined);

        try {
          const response = await api.get<CurrentUserResponse>('/auth/me');
          const { user: backendUser, shift } = response.data;
          const role = toUserRole(backendUser.roles);
          const permissions = resolvePermissions(role);

          setStoreContexts(backendUser.hotelId, backendUser.hotelCode);
          const hotel = await hydrateDomainStores();

          const session = get().session;
          const mergedSession: AuthSession = {
            token: session?.token ?? '',
            expiresAt: session?.expiresAt ?? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            shift: mapShiftName(shift?.shiftName) ?? session?.shift ?? 'morning',
            shiftStartTime: shift?.startedAt ?? session?.shiftStartTime ?? new Date().toISOString(),
            hotel: hotel ?? session?.hotel ?? {
              code: backendUser.hotelCode,
              name: backendUser.hotelCode
            }
          };

          set({
            user: buildUser(backendUser, role, permissions),
            session: mergedSession,
            isAuthenticated: true,
            isLoading: false,
            hasBootstrapped: true,
            error: null
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Session expired';
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
            hasBootstrapped: false
          });
          clearDomainStores();
          clearAuthTokenProvider();
        }
      },

      logout: async () => {
        const state = get();
        
        // Log logout before clearing state
        if (state.user) {
          const transactionLog = useTransactionLogStore.getState();
          await transactionLog.logTransaction({
            eventType: 'USER_LOGOUT',
            entityType: 'USER',
            entityId: state.user.id,
            description: `User ${state.user.name} logged out`,
            metadata: {
              userId: state.user.id,
              userName: state.user.name,
              role: state.user.role,
            },
          }).catch((err) => {
            console.warn('Failed to log logout transaction:', err);
          });
        }
        
        if (!state.session?.token) {
          set({ user: null, session: null, isAuthenticated: false, hasBootstrapped: false });
          clearDomainStores();
          clearAuthTokenProvider();
          // Clear persisted auth state
          localStorage.removeItem('hotel-pms-auth');
          return;
        }

        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.warn('Logout request failed', error);
        }

        set({
          user: null,
          session: null,
          isAuthenticated: false,
          error: null,
          hasBootstrapped: false
        });
        clearDomainStores();
        clearAuthTokenProvider();
        // Clear persisted auth state
        localStorage.removeItem('hotel-pms-auth');
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (!email.includes('@')) {
            throw new Error('Invalid email address');
          }
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Password reset failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      syncRolePermissions: (role, permissions) => {
        set((state) => {
          if (!state.user || state.user.role !== role) {
            return state;
          }
          return {
            ...state,
            user: {
              ...state.user,
              permissions: [...permissions]
            }
          };
        });
      },

      syncUserRole: (userId, role, permissions) => {
        set((state) => {
          if (!state.user || state.user.id !== userId) {
            return state;
          }
          return {
            ...state,
            user: {
              ...state.user,
              role,
              permissions: [...permissions]
            }
          };
        });
      },

      hasPermission: (permission) => {
        const user = get().user;
        return user?.permissions.includes(permission) ?? false;
      },

      hasAnyPermission: (permissions) => {
        const user = get().user;
        return permissions.some((permission) => user?.permissions.includes(permission));
      },

      hasRole: (role) => get().user?.role === role
    }),
    {
      name: 'hotel-pms-auth'
    }
  )
);

setAuthTokenProvider(() => useAuthStore.getState().session?.token ?? undefined);
