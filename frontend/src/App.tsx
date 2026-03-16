import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useAccessControlStore } from './stores/accessControlStore';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './modules/auth/LoginPage';
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { PropertySetupPage } from './modules/property/PropertySetupPage';
import { ReservationsPage } from './modules/reservations/ReservationsPage';
import { FrontDeskPage } from './modules/frontdesk/FrontDeskPage';
import { GuestsPage } from './modules/guests/GuestsPage';
import { BillingPage } from './modules/billing/BillingPage';
import { HousekeepingPage } from './modules/housekeeping/HousekeepingPage';
import { UserManagementPage } from './modules/admin/UserManagementPage';
import { PosPage } from './modules/pos/PosPage';
import { RoomsPage } from './modules/rooms/RoomsPage';
import { InventoryManagementPage } from './modules/inventory/InventoryManagementPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import NightAuditRoutes from './modules/night-audit';
import { 
  OTAConfigurationPage, 
  WhatsAppConfigurationPage, 
  FeatureFlagsPage 
} from './modules/admin';
import OTAManagementPage from './modules/admin/OTAManagementPage';

const SettingsPage = () => (
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
    <p className="mt-2 text-gray-600">System settings coming soon...</p>
  </div>
);

const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900">403</h1>
      <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, initialize, isLoading } = useAuthStore();

  // Initialize auth state on app mount
  useEffect(() => {
    initialize();
    // Self-healing: ensure permissions are synced for admin/manager
    const { ensurePermissions } = useAccessControlStore.getState();
    ensurePermissions();
  }, [initialize]);

  // Show loading state during initialization
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/forgot-password" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} 
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute requiredPermissions={['view_dashboard']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/front-desk" element={<FrontDeskPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/guests" element={<GuestsPage />} />
            <Route path="/housekeeping" element={<HousekeepingPage />} />
            <Route element={<ProtectedRoute requiredPermissions={[ 'manage_pos' ]} /> }>
              <Route path="/pos" element={<PosPage />} />
            </Route>
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/inventory" element={<InventoryManagementPage />} />
            {/* Advanced Features */}
            <Route element={<ProtectedRoute requiredPermissions={[ 'manage_users' ]} /> }>
              <Route path="/night-audit/*" element={<NightAuditRoutes />} />
              <Route path="/ota-management" element={<OTAManagementPage />} />
              <Route path="/ota-configuration" element={<OTAConfigurationPage />} />
              <Route path="/whatsapp-configuration" element={<WhatsAppConfigurationPage />} />
              <Route path="/feature-flags" element={<FeatureFlagsPage />} />
            </Route>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/property-setup" element={<PropertySetupPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<ProtectedRoute requiredPermissions={[ 'manage_users' ]} /> }>
              <Route path="/users" element={<UserManagementPage />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
