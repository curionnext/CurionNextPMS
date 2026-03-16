import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  DoorOpen, 
  Bed, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Clock,
  Building2,
  ReceiptIndianRupee,
  Sparkles,
  ShieldCheck,
  UtensilsCrossed,
  Moon,
  Wifi,
  ScrollText,
  Package,
  type LucideIcon
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../utils';
import type { UserRole, Permission } from '../types';
import { format } from 'date-fns';
import { AlertBell, AlertCenterPanel, AlertsToaster } from '../components/alerts/AlertCenter';
import { useAlertStore } from '../stores/alertStore';
import { PWAInstallPrompt } from '../components/pwa/PWAInstallPrompt';
import { GlobalSearch } from '../components/ui/GlobalSearch';
import { TransactionLogsViewer } from '../components/ui/TransactionLogsViewer';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  roles?: UserRole[];
}

// Role-based navigation configuration
const navigationConfig: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    permission: 'view_dashboard',
    roles: ['admin', 'manager', 'front-desk', 'housekeeping']
  },
  { 
    name: 'Reservations', 
    href: '/reservations', 
    icon: Calendar, 
    permission: 'manage_reservations',
    roles: ['admin', 'manager', 'front-desk']
  },
  { 
    name: 'Front Desk', 
    href: '/front-desk', 
    icon: DoorOpen, 
    permission: 'check_in',
    roles: ['admin', 'manager', 'front-desk']
  },
  { 
    name: 'Billing', 
    href: '/billing', 
    icon: ReceiptIndianRupee, 
    permission: 'process_payments',
    roles: ['admin', 'manager', 'front-desk']
  },
  { 
    name: 'Light POS', 
    href: '/pos', 
    icon: UtensilsCrossed, 
    permission: 'manage_pos',
    roles: ['admin', 'manager', 'front-desk']
  },
  { 
    name: 'Guests', 
    href: '/guests', 
    icon: Users, 
    permission: 'manage_guests',
    roles: ['admin', 'manager', 'front-desk']
  },
  { 
    name: 'Housekeeping', 
    href: '/housekeeping', 
    icon: Sparkles, 
    permission: 'manage_housekeeping',
    roles: ['admin', 'manager', 'housekeeping']
  },
  { 
    name: 'Rooms', 
    href: '/rooms', 
    icon: Bed, 
    permission: 'manage_rooms',
    roles: ['admin', 'manager', 'housekeeping']
  },
  { 
    name: 'Inventory', 
    href: '/inventory', 
    icon: Package, 
    permission: 'manage_inventory',
    roles: ['admin', 'manager']
  },
  { 
    name: 'Night Audit', 
    href: '/night-audit', 
    icon: Moon, 
    permission: 'manage_users',
    roles: ['admin', 'manager']
  },
  { 
    name: 'OTA Management', 
    href: '/ota-management', 
    icon: Wifi, 
    permission: 'manage_users',
    roles: ['admin', 'manager']
  },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: FileText, 
    permission: 'view_reports',
    roles: ['admin', 'manager']
  },
  { 
    name: 'Property Setup', 
    href: '/property-setup', 
    icon: Building2, 
    permission: 'manage_property_setup',
    roles: ['admin']
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    roles: ['admin', 'manager']
  },
  { 
    name: 'User Management', 
    href: '/users', 
    icon: ShieldCheck, 
    permission: 'manage_users',
    roles: ['admin']
  },
];

function getShiftStatus(shift: string): { color: string; label: string } {
  const shifts = {
    morning: { color: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20', label: 'Morning Shift' },
    afternoon: { color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20', label: 'Afternoon Shift' },
    night: { color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20', label: 'Night Shift' },
  };
  return shifts[shift as keyof typeof shifts] || shifts.morning;
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session, logout, hasPermission } = useAuthStore();
  const evaluateAlerts = useAlertStore((state) => state.evaluateRules);
  const canViewAlerts = hasPermission('view_alerts' as Permission);

  useEffect(() => {
    if (!canViewAlerts) {
      setAlertsOpen(false);
    }
  }, [canViewAlerts]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canViewAlerts) {
      return;
    }
    evaluateAlerts();
    const timer = setInterval(() => evaluateAlerts(), 60000);
    return () => clearInterval(timer);
  }, [evaluateAlerts, canViewAlerts]);

  useEffect(() => {
    if (canViewAlerts) {
      evaluateAlerts();
    }
  }, [location.pathname, evaluateAlerts, canViewAlerts]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter navigation based on role and permissions
  const filteredNavigation = navigationConfig.filter(item => {
    // Check if user has required permission
    if (item.permission && !hasPermission(item.permission as any)) {
      return false;
    }
    // Check if user's role is in allowed roles
    if (item.roles && user && !item.roles.includes(user.role)) {
      return false;
    }
    return true;
  });

  const shiftInfo = session ? getShiftStatus(session.shift) : null;
  const shiftStartTime = session?.shiftStartTime ? new Date(session.shiftStartTime) : null;

  return (
    <div className="relative min-h-screen bg-white">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-zinc-900/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center shadow-md flex-shrink-0">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-bold text-zinc-900 tracking-tight">NexusNext</h1>
                  <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Hospitality Customized</p>
                  {session?.hotel && (
                    <p className="text-xs text-zinc-600 font-medium truncate mt-0.5">{session.hotel.name}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="flex-shrink-0">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            
            {/* Scrollable Navigation */}
            <nav className="flex-1 overflow-y-auto mt-4 px-3 space-y-1 sidebar-scroll">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'sidebar-nav-item mb-1',
                      isActive && 'sidebar-nav-item-active'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col h-full bg-white border-r border-zinc-200">
          {/* Sticky Header - Brand Section */}
          <div className="sticky top-0 z-10 bg-white border-b border-zinc-200">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center shadow-md">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-zinc-900 tracking-tight">NexusNext</h1>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Hospitality Customized</p>
                </div>
              </div>
              {session?.hotel && (
                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-lg px-3 py-2 border border-zinc-200">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wide mb-0.5">Current Property</p>
                  <p className="text-sm text-zinc-900 font-semibold truncate">{session.hotel.name}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Scrollable Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 sidebar-scroll">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'sidebar-nav-item',
                    isActive && 'sidebar-nav-item-active'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sticky Footer - User Profile Section */}
          <div className="sticky bottom-0 z-10 bg-white border-t border-zinc-200 p-4">
            {/* Shift Info */}
            {shiftInfo && (
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium', shiftInfo.color)}>
                <Clock className="h-4 w-4" />
                <div className="flex-1">
                  <p>{shiftInfo.label}</p>
                  {shiftStartTime && (
                    <p className="text-[10px] opacity-75">
                      Started: {format(shiftStartTime, 'h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* User Info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-semibold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user?.role?.replace('-', ' ')}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-zinc-200 bg-white px-4 shadow-sm lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-zinc-700 hover:text-zinc-900"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex items-center gap-4">
            {/* Hotel Info - Desktop */}
            {session?.hotel && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <Building2 className="h-4 w-4 text-zinc-500" />
                <div className="text-sm">
                  <p className="font-medium text-zinc-900">{session.hotel.code}</p>
                </div>
              </div>
            )}

            {/* Current Time */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700">
                {format(currentTime, 'MMM d, h:mm a')}
              </span>
            </div>

            {/* Global Search */}
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            {canViewAlerts && <AlertBell onClick={() => setAlertsOpen((prev) => !prev)} />}
            
            {/* Transaction Logs Button */}
            <button
              onClick={() => setLogsOpen(true)}
              className="relative p-2 rounded-lg hover:bg-zinc-100 transition-colors"
              title="View Transaction Logs"
            >
              <ScrollText className="h-5 w-5 text-zinc-600" />
            </button>
            
            {/* Mobile: Show shift badge */}
            {shiftInfo && (
              <div className="lg:hidden">
                <div className={cn('px-2 py-1 rounded text-xs font-medium', shiftInfo.color)}>
                  {session?.shift.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2 ml-2">
              <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="relative p-4 lg:p-6 bg-zinc-50 min-h-[calc(100vh-4rem)]">
          {canViewAlerts && <AlertCenterPanel isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />}
          <Outlet />
        </main>
      </div>
      {canViewAlerts && <AlertsToaster />}
      <PWAInstallPrompt />
      <TransactionLogsViewer isOpen={logsOpen} onClose={() => setLogsOpen(false)} />
    </div>
  );
}
