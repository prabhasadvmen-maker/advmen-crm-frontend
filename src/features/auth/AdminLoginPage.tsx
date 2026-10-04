import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Server,
  Activity,
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Sparkles,
  X,
} from 'lucide-react';
import { authApi } from './api/authApi';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { user, isAuthenticated, isInitialized, checkAuthSession } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [forgotStep, setForgotStep] = useState<'closed' | 'email' | 'reset'>('closed');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      void checkAuthSession();
    }
  }, [isInitialized, checkAuthSession]);

  // This portal is reserved for platform Super Admin accounts.
  useEffect(() => {
    if (isAuthenticated && user.role === 'SUPER_ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    } else if (isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isInitialized, user.role, navigate]);

  const handleQuickPreset = () => {
    setEmail('');
    setPassword('');
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      addToast({
        type: 'danger',
        title: 'Missing Credentials',
        message: 'Please provide both Admin Email and Password.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate with backend
      const result = await authApi.login({
        email: email.trim(),
        password: password,
      });

      if (!result?.user) {
        throw new Error('Invalid authentication response from backend server.');
      }

      const userRole = result.user.role;

      // 2. Validate that the account has platform-level administrator access.
      if (userRole !== 'SUPER_ADMIN') {
        throw new Error(
          `Access Denied: Account (${result.user.email}) has role '${userRole}'. This portal is reserved for Super Admin.`
        );
      }

      // 3. Establish Session
      useSessionStore.getState().setUserSession({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: userRole as UserRole,
        organizationId: result.user.organizationId,
        organizationName: result.user.organizationName || 'ADVMEN Platform Ops',
        employeeId: result.user.employeeId,
      });

      addToast({
        type: 'success',
        title: `Welcome, Administrator ${result.user.name}`,
        message: `Admin Command Clearance Granted [${userRole.replace(/_/g, ' ')}]`,
      });

      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.warn('⚠️ Admin login attempt failed:', err);

      // Distinguish an authorization failure from a failed database-backed login.
      if (err?.message?.includes('Access Denied')) {
        addToast({
          type: 'danger',
          title: 'Admin Clearance Denied',
          message: err.message,
        });
      } else if (err?.code === 'INVALID_CREDENTIALS') {
        addToast({
          type: 'danger',
          title: 'Login Details Galat Hain',
          message: 'Admin email ya password galat hai. Dobara check karke try karein.',
        });
      } else {
        addToast({
          type: 'danger',
          title: 'Admin Login Failed',
          message: err?.message || 'Could not verify administrator credentials with the server.',
        });
      }
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
      setForgotStep('reset');
      addToast({
        type: 'success',
        title: 'OTP Code Dispatched',
        message: result.message || 'Check your Admin inbox for verification code.',
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Reset Request Failed',
        message: err?.message || 'No Super Admin account found with this email.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({
        type: 'danger',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.',
      });
      return;
    }
    setForgotLoading(true);
    try {
      await authApi.resetPassword(otp, newPassword);
      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'You can now sign in with your new admin password.',
      });
      setForgotStep('closed');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Reset Failed',
        message: err?.message || 'Invalid or expired OTP token.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Subtle Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">
                ADVMEN <span className="text-blue-400 font-bold">AdminPortal</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                Root Clearance
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              Multi-Tenant Executive Control Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Staff / Agent Login</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Admin System Status & Clearance Details */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Privileged System Gateway • Port 5001</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Admin Command <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
                  Executive Access
                </span>
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Dedicated administrator gateway to provision staff, manage access, and monitor RevOps infrastructure.
              </p>
            </div>

            {/* Security Pillars Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold font-mono">
                  <Server className="w-4 h-4" />
                  <span>Tenant Isolation</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Multi-tenant database schema with cryptographic organization boundaries.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                  <Activity className="w-4 h-4" />
                  <span>Live Audit Trails</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Real-time SOC2 audit logging for user provisioning and permission shifts.
                </p>
              </div>
            </div>

            {/* Quick Demo Access Pills */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono block">
                Quick One-Click Admin Autofill:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleQuickPreset}
                  className="text-xs px-3 py-1.5 rounded-lg border font-mono transition-all flex items-center gap-1.5 bg-blue-600/30 border-blue-500 text-blue-300"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>Platform Super Admin</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Secure Admin Login Card */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 relative overflow-hidden">
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400" />

              {/* Card Title */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    Admin Authentication
                  </h2>
                  <p className="text-xs text-slate-400">
                    Enter your administrative credentials to continue.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                  ROOT
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                {/* Admin Clearance Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Administrative Clearance Level</span>
                    <span className="text-[10px] text-slate-500 font-mono">Required</span>
                  </label>
                  <div className="rounded-xl border border-blue-500 bg-blue-950/60 p-3 text-white">
                    <div className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Super Admin
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Cross-tenant root access</div>
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Admin Work Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@advmen.local"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password with Show/Hide Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotStep('email')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Reset Super Admin Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Security Warning Notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] leading-relaxed">
                    <p className="font-semibold text-amber-200">Restricted Corporate Gateway</p>
                    <p className="text-amber-300/80">
                      Unauthorized access attempts are logged with client IP address and reported to platform security.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 border-0"
                  isLoading={isLoading}
                  icon={<KeyRound className="w-4 h-4" />}
                >
                  Verify Clearance & Launch Admin Dashboard
                </Button>
              </form>

              {/* Bottom Switcher */}
              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Are you a Sales Rep, Telecaller, or Manager?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Go to Staff Portal <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password / OTP Modal */}
      {forgotStep !== 'closed' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setForgotStep('closed')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                {forgotStep === 'email' ? 'Request Admin Reset OTP' : 'Submit New Admin Password'}
              </h3>
              <p className="text-xs text-slate-400">
                {forgotStep === 'email'
                  ? 'Enter the Super Admin email address to receive a 6-digit OTP code.'
                  : 'Enter the OTP received along with your new password.'}
              </p>
            </div>

            {forgotStep === 'email' ? (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <Input
                  label="Super Admin Email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@advmen.local"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={forgotLoading}
                >
                  Send Verification OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <Input
                  label="6-Digit OTP Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  required
                />
                <Input
                  label="New Admin Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={forgotLoading}
                >
                  Update Admin Password
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
