import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Hotel, ArrowLeft, CheckCircle, Mail, AlertCircle } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email.trim()) {
      setFormError('Email address is required');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      console.error('Password reset failed:', err);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg">
              <Hotel className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Hotel PMS</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
              <p className="mt-2 text-sm text-gray-600">
                We've sent password reset instructions to:
              </p>
              <p className="mt-1 font-medium text-gray-900">{email}</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <div className="flex gap-3">
                  <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Didn't receive the email?</p>
                    <p className="mt-1 text-blue-700">
                      Check your spam folder or contact your system administrator.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                  variant="primary"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to login
                </Button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setResetSent(false)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Try a different email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg">
            <Hotel className="h-8 w-8" />
          </div>
            <h1 className="text-3xl font-bold text-gray-900">NexusNext</h1>
            <p className="mt-2 text-gray-600">Hospitality Customized</p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Reset your password</h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hotel.com"
              error={formError}
              required
              autoComplete="email"
              disabled={isLoading}
            />

            {error && (
              <div className="rounded-lg bg-red-50 p-3 flex items-start gap-3 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send reset instructions'}
              </Button>

              <Link to="/login">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Need help?</p>
              <p>
                If you don't have access to your email or continue to experience issues, 
                please contact your system administrator.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Secure password recovery
        </p>
      </div>
    </div>
  );
}
