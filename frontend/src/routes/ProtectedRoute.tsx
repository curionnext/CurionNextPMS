import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Permission } from '../types';

interface ProtectedRouteProps {
  requiredPermissions?: Permission[];
  requireAll?: boolean;
}

export function ProtectedRoute({ 
  requiredPermissions = [], 
  requireAll = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, hasPermission, hasAnyPermission } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? requiredPermissions.every(p => hasPermission(p))
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
