import { useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ShieldCheck, Plus, X, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useAccessControlStore } from '../../stores/accessControlStore';
import { useAuthStore } from '../../stores/authStore';
import type { Permission, Shift, UserRole } from '../../types';

const PERMISSION_CATALOG: Array<{ key: Permission; label: string; description: string }> = [
  { key: 'view_dashboard', label: 'View Dashboard', description: 'Access main dashboard widgets and analytics' },
  { key: 'manage_reservations', label: 'Manage Reservations', description: 'Create and modify reservations' },
  { key: 'check_in', label: 'Check-in', description: 'Perform guest check-ins' },
  { key: 'check_out', label: 'Check-out', description: 'Complete guest departures' },
  { key: 'manage_rooms', label: 'Manage Rooms', description: 'Edit room inventory details' },
  { key: 'manage_rates', label: 'Manage Rates', description: 'Adjust pricing and rate plans' },
  { key: 'view_reports', label: 'View Reports', description: 'Access financial and occupancy reports' },
  { key: 'manage_guests', label: 'Manage Guests', description: 'Modify guest directory information' },
  { key: 'process_payments', label: 'Process Payments', description: 'Capture payments and settlements' },
  { key: 'manage_housekeeping', label: 'Manage Housekeeping', description: 'Assign and track housekeeping tasks' },
  { key: 'manage_users', label: 'Manage Users', description: 'Administer user accounts and roles' },
  { key: 'manage_property_setup', label: 'Property Setup', description: 'Configure hotel details and taxes' },
];

const SHIFT_OPTIONS: { value: Shift; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'night', label: 'Night' },
];

export function UserManagementPage() {
  const {
    users,
    roles,
    shiftLogs,
    createUser,
    assignRole,
    toggleRolePermission,
  } = useAccessControlStore();
  const { syncRolePermissions, syncUserRole } = useAuthStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    role: roles[0]?.role ?? 'manager',
    shift: 'morning' as Shift,
  });

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.role, label: role.name })),
    [roles]
  );

  const handleCreateUser = () => {
    if (!form.name || !form.email || !form.username) {
      return;
    }
    createUser({
      name: form.name,
      email: form.email,
      username: form.username,
      role: form.role as UserRole,
      shift: form.shift,
    });
    setIsCreateOpen(false);
    setForm({ name: '', email: '', username: '', role: roles[0]?.role ?? 'manager', shift: 'morning' });
  };

  const handleRoleChange = (userId: string, role: string) => {
    const updated = assignRole(userId, role as UserRole);
    syncUserRole(userId, role as UserRole, updated);
  };

  const handleTogglePermission = (role: UserRole, permission: Permission) => {
    const updated = toggleRolePermission(role, permission);
    syncRolePermissions(role, updated);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User &amp; Role Management</h1>
          <p className="mt-1 text-sm text-gray-500">Create user accounts, adjust permissions, and audit shift logins.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-2" onClick={() => setIsMatrixOpen(true)}>
            <Settings2 className="h-4 w-4" /> Permission Matrix
          </Button>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New User
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">User Directory</p>
            <p className="text-xs text-gray-500">Role assignments and permission coverage</p>
          </div>
          <Badge variant="info">{users.length} active users</Badge>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Permissions</th>
                <th className="px-3 py-3">Last Login</th>
                <th className="px-3 py-3">Current Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600">
                        {user.name
                          .split(' ')
                          .map((part) => part.charAt(0))
                          .join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-gray-600">{user.email}</td>
                  <td className="px-3 py-4">
                    <Select
                      value={user.role}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      options={roleOptions}
                    />
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.slice(0, 4).map((permission) => (
                        <Badge key={permission} variant="default">
                          {permission.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {user.permissions.length > 4 && (
                        <Badge variant="info">+{user.permissions.length - 4} more</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-gray-600">
                    {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d, h:mm a') : 'Never'}
                  </td>
                  <td className="px-3 py-4 text-gray-600 capitalize">{user.currentShift || '—'}</td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Shift Login Logs</p>
            <p className="text-xs text-gray-500">Shift-wise authentication history</p>
          </div>
          <Badge variant="warning">Latest {Math.min(shiftLogs.length, 10)} entries</Badge>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Shift</th>
                <th className="px-3 py-3">Login</th>
                <th className="px-3 py-3">Logout</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shiftLogs.slice(0, 10).map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-3 text-gray-700">{log.userName}</td>
                  <td className="px-3 py-3 capitalize text-gray-600">{log.role.replace('-', ' ')}</td>
                  <td className="px-3 py-3 capitalize text-gray-600">{log.shift}</td>
                  <td className="px-3 py-3 text-gray-600">{format(new Date(log.loginAt), 'MMM d, h:mm a')}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {log.logoutAt ? format(new Date(log.logoutAt), 'MMM d, h:mm a') : 'Active'}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                      {log.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{log.device || 'Unknown'}</td>
                </tr>
              ))}
              {!shiftLogs.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No login activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateOpen && (
        <Modal onClose={() => setIsCreateOpen(false)} title="Create User">
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Jane Doe"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="jane.doe@example.com"
              required
            />
            <Input
              label="Username"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="jane.doe"
              required
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              options={roleOptions}
            />
            <Select
              label="Default Shift"
              value={form.shift}
              onChange={(event) => setForm((prev) => ({ ...prev, shift: event.target.value as Shift }))}
              options={SHIFT_OPTIONS}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>Create User</Button>
            </div>
          </div>
        </Modal>
      )}

      {isMatrixOpen && (
        <Modal onClose={() => setIsMatrixOpen(false)} title="Permission Matrix">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr>
                  <th className="w-1/3 px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Permission</th>
                  {roles.map((role) => (
                    <th key={role.role} className="px-4 py-3 text-xs font-semibold uppercase text-gray-500">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PERMISSION_CATALOG.map((permission) => (
                  <tr key={permission.key}>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-gray-900">{permission.label}</p>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </td>
                    {roles.map((role) => {
                      const enabled = role.permissions.includes(permission.key);
                      return (
                        <td key={role.role} className="px-4 py-4 text-center">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              checked={enabled}
                              onChange={() => handleTogglePermission(role.role, permission.key)}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2 text-gray-900">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-sm font-semibold">{title}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
