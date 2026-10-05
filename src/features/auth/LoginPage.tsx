import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore, getDashboardForRole } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Layers,
  Sparkles,
  ShieldCheck,
  Lock,
  PhoneCall,
  ArrowRight,
  TrendingUp,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { authApi } from './api/authApi';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useUIStore();
  const { user, isAuthenticated, isInitialized, checkAuthSession, logout } = useSessionStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot-password modal state
  const [forgotStep, setForgotStep] = useState<'closed' | 'email' | 'reset'>('closed');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [sentEmailMsg, setSentEmailMsg] = useState('');

  // Handle explicit logout parameter
  useEffect(() => {
    if (location.search.includes('logout')) {
      void logout();
    }
  }, [location.search, logout]);

  useEffect(() => {
    if (!isInitialized) {
      void checkAuthSession();
    }
  }, [isInitialized, checkAuthSession]);

  // Auto-redirect if already signed in (unless deliberately logging out)
  useEffect(() => {
    if (isAuthenticated && user && !location.search.includes('logout')) {
      const targetDashboard = getDashboardForRole(user.role);
      navigate(targetDashboard, { replace: true });
    }
  }, [isAuthenticated, user, location.search, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setLoginError('Please enter both your Employee ID/email and password.');
      addToast({
        type: 'danger',
        title: 'Missing Fields',
        message: 'Please enter your Employee ID or admin email and password.',
      });
      return;
    }

    setIsLoading(true);
    setLoginError('');

    try {
      const isEmail = cleanId.includes('@');
      // Authenticate credentials against the backend database using Employee ID, phone, or email.
      const result = await authApi.login({
        identifier: cleanId,
        email: isEmail ? cleanId.toLowerCase() : undefined,
        phone: !isEmail ? cleanId : undefined,
        password: password,
      });

      if (!result?.user) {
        throw new Error('Invalid authentication response from server.');
      }

      const dashboard = getDashboardForRole(result.user.role);

      useSessionStore.getState().setUserSession({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
        organizationName: result.user.organizationName || 'ADVMEN Workspace',
        employeeId: result.user.employeeId,
      });

      addToast({
        type: 'success',
        title: `Welcome, ${result.user.name}!`,
        message: `Authenticated as ${result.user.role.replace(/_/g, ' ')}`,
      });

      navigate(dashboard, { replace: true });
    } catch (err: any) {
      console.error('❌ Login failed:', err);
      const isInvalidCredentials = err?.code === 'INVALID_CREDENTIALS';
      const message = isInvalidCredentials
        ? 'The Employee ID/email or password is incorrect. Please check your details and try again.'
        : err?.message || 'Unable to sign in. Please try again later.';
      setLoginError(message);
      addToast({
        type: 'danger',
        title: 'Authentication Failed',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const result = await authApi.forgotPassword(forgotEmail.trim());
      setSentEmailMsg(result.message);
      setForgotStep('reset');
      addToast({
        type: 'success',
        title: 'OTP Sent',
        message: 'Check your Super Admin email inbox.',
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Request Failed',
        message: err?.message || 'No Super Admin account found with this email.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ type: 'danger', title: 'Passwords Do Not Match', message: 'Please confirm your new password.' });
      return;
    }
    setForgotLoading(true);
    try {
      await authApi.resetPassword(otp, newPassword);
      addToast({ type: 'success', title: 'Password Updated', message: 'Sign in with your new password.' });
      setForgotStep('closed');
      setForgotEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setSentEmailMsg('');
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Reset Failed',
        message: err?.message || 'OTP is incorrect or expired.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-neutral-200 sticky top-0 z-30 px-6 sm:px-12 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 flex items-center justify-center text-white border border-blue-700 shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-neutral-900 block leading-tight">
              ADVMEN <span className="text-blue-600 font-bold">SalesOS</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono block">
              Enterprise Revenue Operating System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auth Service Online</span>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Admin Portal →</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Platform Value & System Capabilities */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Autonomous RevOps • Fault-Isolated Micro-Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 leading-tight">
            Enterprise Sales Operations <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 bg-clip-text text-transparent">
              Built for Scale & Security
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 max-w-xl leading-relaxed">
            Unified revenue operating system with high-velocity lead pipelines, intelligent telephony autodialing, multi-tenant RBAC isolation, and end-to-end payment reconciliation.
          </p>

          {/* 3 Core Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-2 hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 w-fit">
                <PhoneCall className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-neutral-900">Telephony Engine</h4>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Autodialer with real-time call disposition and disposition metrics.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-2 hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 w-fit">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-neutral-900">Pipeline & CPQ</h4>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Kanban deal tracking, automated quotes, and invoice reconciliation.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-2 hover:shadow-md transition-all">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700 border border-neutral-200 w-fit">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-neutral-900">Zero-Trust RBAC</h4>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Cryptographically validated multi-tenant session isolation.
              </p>
            </div>
          </div>

          {/* Security & Compliance Highlights */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-neutral-800">Enterprise Grade Security</span>
            </div>
            <div className="flex items-center gap-5 text-neutral-500 font-mono text-[11px]">
              <span>JWT + HTTP-Only Cookies</span>
              <span>Multi-Tenant DB Scoping</span>
              <span>Audit Logged</span>
            </div>
          </div>
        </div>

        {/* Right Column: Standard Production Sign-In Card */}
        <div className="lg:col-span-5">
          <div className="bg-white text-neutral-900 rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-xl space-y-5 relative overflow-hidden">
            {/* Top Accent Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-500" />

            {/* Header */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                  Sign in to Workspace
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Employees sign in here with their Employee ID and password.
              </p>
            </div>

            {/* Dedicated 2-Panel Policy Notice */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Super Admin & Employee Access</p>
                <p className="text-[11px] text-blue-700 leading-snug">
                  Super Admins manage employee accounts. Employees sign in using their unique <strong>Employee ID</strong> and password.
                </p>
              </div>
            </div>

            {/* If currently signed in, show status banner with Continue or Sign Out buttons */}
            {isAuthenticated && user && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-emerald-900">Active Workspace Session</span>
                  </div>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold uppercase">
                    {(user.role || '').replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="font-semibold text-neutral-900 text-sm">{user.name} ({user.email})</div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="flex-1 text-xs py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={() => navigate(getDashboardForRole(user.role))}
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    onClick={async () => {
                      await logout();
                      addToast({
                        type: 'info',
                        title: 'Signed Out',
                        message: 'You have been signed out. You can now log in with another account.',
                      });
                    }}
                  >
                    Sign Out / Switch
                  </Button>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input
                label="Employee ID or Work Email"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="e.g. EMP-000001 or admin@company.com"
                required
                autoComplete="username"
                helperText="Use the Employee ID provided by your administrator"
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />

              {loginError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-neutral-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center text-sm py-3 font-bold shadow-md hover:shadow-lg transition-all"
                isLoading={isLoading}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Sign In to Workspace
              </Button>

            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-4 px-6 text-center text-xs text-neutral-500">
        <p>© 2026 ADVMEN SalesOS Inc. All rights reserved. Enterprise Revenue Operating System.</p>
      </footer>

      {/* Forgot Password Modal */}
      {forgotStep !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setForgotStep('closed')}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-200 p-8 z-10 shadow-2xl space-y-5">
            {/* Accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-violet-700 rounded-t-2xl" />

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50 border border-violet-200">
                <KeyRound className="w-5 h-5 text-violet-700" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">
                  {forgotStep === 'email' ? 'Super Admin Password Reset' : 'Set New Password'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {forgotStep === 'email'
                    ? 'Enter your Super Admin email to generate a reset token.'
                    : 'Enter the reset token and choose a new password.'}
                </p>
              </div>
            </div>

            {forgotStep === 'email' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input
                  label="Super Admin Email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="superadmin@advmen.com"
                  required
                />
                <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-[11px] text-violet-800 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
                  <span>A <strong>6-digit OTP</strong> will be emailed to your Super Admin address. It expires in <strong>10 minutes</strong>.</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setForgotStep('closed')} className="flex-1 justify-center">Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={forgotLoading} className="flex-1 justify-center">Send OTP</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {sentEmailMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-2">
                    <span className="text-base leading-none">📬</span>
                    <span>{sentEmailMsg}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-700">6-Digit OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="● ● ● ● ● ●"
                    required
                    className="w-full text-center text-2xl font-bold tracking-[0.5em] py-3 px-4 rounded-lg border border-neutral-300 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-neutral-900 placeholder:text-neutral-300 placeholder:tracking-normal placeholder:text-base"
                  />
                  <p className="text-[10px] text-neutral-400 text-center">Enter the code sent to {forgotEmail}</p>
                </div>
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setForgotStep('email'); setOtp(''); }} className="flex-1 justify-center">← Resend OTP</Button>
                  <Button type="submit" variant="primary" isLoading={forgotLoading} className="flex-1 justify-center">Update Password</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
