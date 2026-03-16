import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Permission, Shift, User, UserRole } from '../types';

interface RoleDefinition {
  role: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
}

interface ShiftLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  shift: Shift;
  loginAt: string;
  logoutAt?: string;
  status: 'success' | 'failed';
  device?: string;
  location?: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  shift?: Shift;
}

interface AccessControlState {
  roles: RoleDefinition[];
  users: User[];
  shiftLogs: ShiftLog[];

  createUser: (input: CreateUserInput) => User;
  assignRole: (userId: string, role: UserRole) => Permission[];
  updateUser: (userId: string, updates: Partial<Omit<User, 'id' | 'permissions'>>) => void;
  toggleRolePermission: (role: UserRole, permission: Permission) => Permission[];
  setRolePermissions: (role: UserRole, permissions: Permission[]) => void;
  getRolePermissions: (role: UserRole) => Permission[];
  syncUserAccount: (user: User) => void;
  recordShiftLog: (entry: Omit<ShiftLog, 'id'>) => void;
  ensurePermissions: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const defaultRoleMatrix: RoleDefinition[] = [
  {
    role: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    permissions: [
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
      'manage_property_setup',
      'manage_pos',
      'manage_inventory',
      'view_alerts',
    ],
  },
  {
    role: 'manager',
    name: 'Manager',
    description: 'Oversees operations and reporting',
    permissions: [
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
      'manage_pos',
      'manage_inventory',
      'view_alerts',
    ],
  },
  {
    role: 'front-desk',
    name: 'Front Desk',
    description: 'Handles check-ins and billing',
    permissions: [
      'view_dashboard',
      'manage_reservations',
      'check_in',
      'check_out',
      'manage_guests',
      'process_payments',
      'manage_pos',
      'view_alerts',
    ],
  },
  {
    role: 'housekeeping',
    name: 'Housekeeping',
    description: 'Manages room upkeep and tasks',
    permissions: [
      'view_dashboard',
      'manage_housekeeping',
      'view_alerts',
    ],
  },
  {
    role: 'guest',
    name: 'Guest',
    description: 'Limited access for guest self-service',
    permissions: [
      'view_dashboard',
      'view_alerts',
    ],
  },
];

const defaultUsers: User[] = [
  {
    id: 'USR001',
    email: 'anita@grandplaza.com',
    username: 'anita.sharma',
    name: 'Anita Sharma',
    role: 'manager',
    permissions: [...defaultRoleMatrix.find((role) => role.role === 'manager')!.permissions],
    hotelCode: 'HOTEL001',
    currentShift: 'morning',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'USR002',
    email: 'david@grandplaza.com',
    username: 'david.fernandes',
    name: 'David Fernandes',
    role: 'front-desk',
    permissions: [...defaultRoleMatrix.find((role) => role.role === 'front-desk')!.permissions],
    hotelCode: 'HOTEL001',
    currentShift: 'afternoon',
    lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'USR003',
    email: 'salma@grandplaza.com',
    username: 'salma.khan',
    name: 'Salma Khan',
    role: 'housekeeping',
    permissions: [...defaultRoleMatrix.find((role) => role.role === 'housekeeping')!.permissions],
    hotelCode: 'HOTEL001',
    currentShift: 'night',
    lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

const defaultShiftLogs: ShiftLog[] = [
  {
    id: generateId(),
    userId: 'USR001',
    userName: 'Anita Sharma',
    role: 'manager',
    shift: 'morning',
    loginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    logoutAt: undefined,
    status: 'success',
    device: 'Desktop',
    location: 'Front Office',
  },
  {
    id: generateId(),
    userId: 'USR002',
    userName: 'David Fernandes',
    role: 'front-desk',
    shift: 'afternoon',
    loginAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    logoutAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    device: 'iPad',
    location: 'Lobby Desk',
  },
  {
    id: generateId(),
    userId: 'USR003',
    userName: 'Salma Khan',
    role: 'housekeeping',
    shift: 'night',
    loginAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    logoutAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    device: 'Mobile',
    location: 'Service Area',
  },
];

export const useAccessControlStore = create<AccessControlState>()(
  persist(
    (set, get) => ({
      roles: defaultRoleMatrix,
      users: defaultUsers,
      shiftLogs: defaultShiftLogs,

      createUser: (input) => {
        const roleDefinition = get().roles.find((definition) => definition.role === input.role);
        const user: User = {
          id: generateId(),
          email: input.email,
          username: input.username,
          name: input.name,
          role: input.role,
          permissions: roleDefinition ? [...roleDefinition.permissions] : [],
          hotelCode: 'HOTEL001',
          currentShift: input.shift,
          lastLogin: new Date().toISOString(),
        };

        set((state) => ({ users: [user, ...state.users] }));
        return user;
      },

      assignRole: (userId, role) => {
        const roleDefinition = get().roles.find((definition) => definition.role === role);
        const permissions = roleDefinition ? [...roleDefinition.permissions] : [];

        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId ? { ...user, role, permissions } : user
          ),
        }));

        return permissions;
      },

      updateUser: (userId, updates) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  ...updates,
                }
              : user
          ),
        }));
      },

      toggleRolePermission: (role, permission) => {
        let updatedPermissions: Permission[] = [];

        set((state) => {
          const roles = state.roles.map((definition) => {
            if (definition.role !== role) {
              return definition;
            }
            const hasPermission = definition.permissions.includes(permission);
            const permissions = hasPermission
              ? definition.permissions.filter((item) => item !== permission)
              : [...definition.permissions, permission];
            updatedPermissions = permissions;
            return { ...definition, permissions };
          });

          const users = state.users.map((user) =>
            user.role === role ? { ...user, permissions: updatedPermissions } : user
          );

          return { roles, users };
        });

        return updatedPermissions;
      },

      setRolePermissions: (role, permissions) => {
        set((state) => ({
          roles: state.roles.map((definition) =>
            definition.role === role ? { ...definition, permissions: [...permissions] } : definition
          ),
          users: state.users.map((user) =>
            user.role === role ? { ...user, permissions: [...permissions] } : user
          ),
        }));
      },

      getRolePermissions: (role) => {
        return get().roles.find((definition) => definition.role === role)?.permissions ?? [];
      },

      syncUserAccount: (user) => {
        set((state) => {
          const exists = state.users.find((entry) => entry.id === user.id || entry.username === user.username);
          if (!exists) {
            return { users: [user, ...state.users] };
          }
          return {
            users: state.users.map((entry) =>
              entry.id === exists.id
                ? {
                    ...entry,
                    ...user,
                    permissions: [...user.permissions],
                    lastLogin: user.lastLogin,
                    currentShift: user.currentShift,
                  }
                : entry
            ),
          };
        });
      },

      recordShiftLog: (entry) => {
        const log: ShiftLog = { id: generateId(), ...entry };
        set((state) => ({ shiftLogs: [log, ...state.shiftLogs].slice(0, 50) }));
      },

      // Helper to ensure critical permissions exist (self-healing)
      ensurePermissions: () => {
        const state = get();
        let changed = false;
        
        const updatedRoles = state.roles.map(roleDef => {
          if (roleDef.role === 'admin' || roleDef.role === 'manager') {
            if (!roleDef.permissions.includes('manage_inventory')) {
              changed = true;
              return { ...roleDef, permissions: [...roleDef.permissions, 'manage_inventory' as Permission] };
            }
          }
          return roleDef;
        });

        if (changed) {
          set({ 
            roles: updatedRoles,
            users: state.users.map(user => {
              if (user.role === 'admin' || user.role === 'manager') {
                if (!user.permissions.includes('manage_inventory')) {
                  return { ...user, permissions: [...user.permissions, 'manage_inventory' as Permission] };
                }
              }
              return user;
            })
          });
        }
      }
    }),
    {
      name: 'access-control-storage',
    }
  )
);

export type { RoleDefinition, ShiftLog };
