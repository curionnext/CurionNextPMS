import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { AlertCircle, Building2, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { UserRole, Shift } from '../../types';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'front-desk', label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
];

const shiftOptions = [
  { value: 'morning', label: 'Morning Shift (6:00 AM - 2:00 PM)' },
  { value: 'afternoon', label: 'Afternoon Shift (2:00 PM - 10:00 PM)' },
  { value: 'night', label: 'Night Shift (10:00 PM - 6:00 AM)' },
];

export function LoginPage() {
  const [hotelCode, setHotelCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('front-desk');
  const [shift, setShift] = useState<Shift>('morning');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!hotelCode.trim()) {
      errors.hotelCode = 'Hotel code is required';
    } else if (hotelCode.trim().length < 5) {
      errors.hotelCode = 'Hotel code must be at least 5 characters';
    }

    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await login({
        hotelCode: hotelCode.toUpperCase(),
        username,
        password,
        shift,
      });
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the store
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen h-screen flex overflow-hidden">
      {/* Left Side - Hotel Reception Image */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden bg-zinc-950">
        {/* Hotel Reception Image with Dark Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&auto=format&fit=crop&q=90')`,
          }}
        />
        
        {/* Dark Gradient Overlay for Better Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-900/80" />
        
        {/* Additional Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-12 xl:p-16 text-white">
          {/* Logo */}
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">NexusNext</h1>
                <p className="text-xs text-zinc-300/90">Hospitality Customized</p>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <h2 className="text-5xl xl:text-6xl font-bold leading-[1.1] text-white tracking-tight">
                Modern Hotel<br />
                Management<br />
                System
              </h2>
              <p className="text-lg xl:text-xl text-zinc-300/90 leading-relaxed">
                Streamline your hotel operations with our comprehensive PMS solution. Built for efficiency and scale.
              </p>
            </div>
            
            {/* Feature Cards */}
            <div className="grid gap-3">
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Multi-Property Support</h3>
                  <p className="text-xs text-zinc-300/80 mt-0.5">Manage multiple properties from a single dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">OTA Integration</h3>
                  <p className="text-xs text-zinc-300/80 mt-0.5">Seamlessly connect with major booking platforms</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Automated Night Audit</h3>
                  <p className="text-xs text-zinc-300/80 mt-0.5">End-of-day processing and comprehensive reports</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="text-xs text-zinc-400/80">
            &copy; 2026 NexusNext. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 text-white mb-3">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-zinc-950">NexusNext</h1>
            <p className="text-sm text-zinc-600">Hospitality Customized</p>
          </div>

          {/* Login Form Card */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-bold text-zinc-950 tracking-tight">Welcome back</h2>
              <p className="text-base text-zinc-600">Sign in to continue to your dashboard</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hotel Code */}
              <div>
                <Input
                  label="Hotel Code"
                  type="text"
                  value={hotelCode}
                  onChange={(e) => setHotelCode(e.target.value.toUpperCase())}
                  placeholder="HOTEL001"
                  error={formErrors.hotelCode}
                  required
                  autoComplete="organization"
                  disabled={isLoading}
                />
              </div>

              {/* Username */}
              <div>
                <Input
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  error={formErrors.username}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  error={formErrors.password}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              {/* Role Selection */}
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={roleOptions}
                required
                disabled={isLoading}
              />

              {/* Shift Selection */}
              <Select
                label="Shift"
                value={shift}
                onChange={(e) => setShift(e.target.value as Shift)}
                options={shiftOptions}
                required
                disabled={isLoading}
                helperText="Select your current work shift"
              />

              {/* Error Display */}
              {error && (
                <div className="rounded-xl bg-red-50 p-4 flex items-start gap-3 border border-red-200">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Authentication Failed</p>
                    <p className="text-sm text-red-700 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-sm hover:shadow transition-all"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-zinc-600 hover:text-zinc-900 font-medium transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </form>

            {/* Demo Info - Collapsible */}
            <div className="">
              <button
                type="button"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Info className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-zinc-900">Demo Credentials</p>
                    <p className="text-xs text-zinc-600">Click to view test accounts</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                  {showDemoCredentials ? (
                    <ChevronUp className="h-4 w-4 text-zinc-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-600" />
                  )}
                </div>
              </button>
              
              {showDemoCredentials && (
                <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Hotel Code</span>
                      <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <p className="font-mono text-base font-bold text-zinc-900">HOTEL001</p>
                    <p className="text-xs text-zinc-600 mt-1">Grand Plaza Hotel</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-xl p-4 border border-zinc-200">
                    <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-3">Available Users</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors">
                        <span className="font-mono text-sm font-medium text-zinc-900">admin</span>
                        <span className="text-xs font-medium text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-md">Full Access</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors">
                        <span className="font-mono text-sm font-medium text-zinc-900">manager</span>
                        <span className="text-xs font-medium text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-md">Management</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors">
                        <span className="font-mono text-sm font-medium text-zinc-900">frontdesk</span>
                        <span className="text-xs font-medium text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-md">Reception</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors">
                        <span className="font-mono text-sm font-medium text-zinc-900">housekeeper</span>
                        <span className="text-xs font-medium text-zinc-600 bg-zinc-200 px-2 py-0.5 rounded-md">Housekeeping</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-300">
                      <p className="text-xs text-zinc-600">
                        <span className="font-semibold text-zinc-800">Password:</span>{' '}
                        <span className="font-mono font-semibold text-zinc-900">Password!123</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Mobile Only */}
          <div className="lg:hidden text-center mt-8">
            <p className="text-xs text-zinc-500">
              Secure access • Shift tracking enabled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
