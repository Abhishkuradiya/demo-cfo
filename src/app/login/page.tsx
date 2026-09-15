"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  ShieldCheck, 
  PieChart, 
  ChevronDown, 
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'postgres' | 'json'>('checking');

  useEffect(() => {
    fetch(`/api/db-status?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDbStatus(data.isPostgres ? 'postgres' : 'json');
        }
      })
      .catch(() => setDbStatus('json'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Welcome back! Logged in as ${data.user.email}`);
        
        login('session_token', {
          id: String(data.user.id),
          name: data.user.email.split('@')[0],
          email: data.user.email,
          role: 'owner',
          permissions: ['*']
        });
        
        // Redirect to dashboard
        window.location.href = '/overview';
      } else {
        toast.error(data.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      toast.error('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = (provider: string) => {
    toast.info(`${provider} integration is not configured for this workspace yet.`);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white">
      
      {/* Left Pane: Interactive Financial Dashboard Showcase (lg only) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-[#091529] via-[#0E1E38] to-[#040A15] text-white overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
        
        {/* Top Header Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 text-sm tracking-tighter">
            vCFO
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-tight leading-none text-slate-100">Virtual CFO</h2>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Intelligence Platform</p>
          </div>
        </div>

        {/* Center Marketing Graphics */}
        <div className="relative z-10 my-auto py-8">
          <div className="max-w-xl space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Smart Financial Insights.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Better Business Decisions.
                </span>
              </h1>
              <p className="text-slate-400 text-sm xl:text-base leading-relaxed font-light">
                Your all-in-one platform for real-time financial analytics, advanced reporting, cash-flow forecasting, and automated business intelligence.
              </p>
            </div>

            {/* Dashboard Cards Mock Visualizer */}
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: Revenue */}
              <div className="bg-slate-900/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-blue-500/40 transition duration-300 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                  <div className="flex items-center text-[9px] text-slate-400 bg-slate-800/60 rounded px-1.5 py-0.5 gap-1">
                    This Month <ChevronDown className="h-2 w-2" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-100 tracking-tight">$98,750</span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <ArrowUpRight className="h-2 w-2" /> 12.5%
                  </span>
                </div>
                <div className="mt-3">
                  <svg className="w-full h-12 overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,45 C 30,35 40,55 70,30 C 100,5 120,40 150,15 C 170,0 185,10 200,5"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="group-hover:stroke-blue-400 transition-colors"
                    />
                    <path
                      d="M 0,45 C 30,35 40,55 70,30 C 100,5 120,40 150,15 C 170,0 185,10 200,5 L 200,60 L 0,60 Z"
                      fill="url(#rev-grad)"
                    />
                  </svg>
                </div>
              </div>

              {/* Card 2: Cash Flow Donut */}
              <div className="bg-slate-900/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition duration-300 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Flow</span>
                  <div className="flex items-center text-[9px] text-slate-400 bg-slate-800/60 rounded px-1.5 py-0.5 gap-1">
                    This Month <ChevronDown className="h-2 w-2" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  {/* Mini Donut Chart */}
                  <div className="relative h-14 w-14 flex-shrink-0">
                    <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-indigo-500"
                        strokeWidth="3.5"
                        strokeDasharray="72, 100"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-100 leading-none">72%</span>
                      <span className="text-[6px] text-slate-400 uppercase font-semibold scale-90 mt-0.5">Healthy</span>
                    </div>
                  </div>
                  {/* Legend stats */}
                  <div className="flex flex-col gap-1.5 text-[8.5px]">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span className="text-slate-400 font-medium">In: $125k</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      <span className="text-slate-400 font-medium">Out: $48k</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-100 font-bold">Net: $77k</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Expenses */}
              <div className="bg-slate-900/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-purple-500/40 transition duration-300 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</span>
                  <div className="flex items-center text-[9px] text-slate-400 bg-slate-800/60 rounded px-1.5 py-0.5 gap-1">
                    This Month <ChevronDown className="h-2 w-2" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-100 tracking-tight">$32,680</span>
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <ArrowUpRight className="h-2 w-2" /> 6.8%
                  </span>
                </div>
                <div className="mt-3">
                  <svg className="w-full h-12 overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="exp-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,15 C 20,25 40,5 60,35 C 80,65 110,25 140,40 C 160,50 180,30 200,20"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="group-hover:stroke-purple-400 transition-colors"
                    />
                    <path
                      d="M 0,15 C 20,25 40,5 60,35 C 80,65 110,25 140,40 C 160,50 180,30 200,20 L 200,60 L 0,60 Z"
                      fill="url(#exp-grad)"
                    />
                  </svg>
                </div>
              </div>

              {/* Card 4: Profit Margin */}
              <div className="bg-slate-900/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition duration-300 group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profit Margin</span>
                  <div className="flex items-center text-[9px] text-slate-400 bg-slate-800/60 rounded px-1.5 py-0.5 gap-1">
                    This Month <ChevronDown className="h-2 w-2" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-100 tracking-tight">28.4%</span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <ArrowUpRight className="h-2 w-2" /> 8.3%
                  </span>
                </div>
                <div className="mt-3">
                  <svg className="w-full h-12 overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="margin-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,40 C 30,45 60,35 90,20 C 120,5 150,15 200,2"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="group-hover:stroke-emerald-400 transition-colors"
                    />
                    <path
                      d="M 0,40 C 30,45 60,35 90,20 C 120,5 150,15 200,2 L 200,60 L 0,60 Z"
                      fill="url(#margin-grad)"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer Badges */}
        <div className="relative z-10 grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/80">
          <div className="flex gap-2.5 items-start">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-[11px] font-bold text-slate-200">Real-time Analytics</h4>
              <p className="text-[9.5px] text-slate-400 font-light mt-0.5">Live financial insights at your fingertips</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-[11px] font-bold text-slate-200">Secure & Reliable</h4>
              <p className="text-[9.5px] text-slate-400 font-light mt-0.5">Enterprise-grade security for your data</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <PieChart className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-[11px] font-bold text-slate-200">Data-Driven Decisions</h4>
              <p className="text-[9.5px] text-slate-400 font-light mt-0.5">Powerful reports to grow your business</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-radial from-[#f1f5f9] via-[#f8fafc] to-[#e2e8f0]">
        
        <div className="w-full max-w-md bg-white/80 border border-slate-200/80 backdrop-blur-md rounded-3xl p-8 md:p-10 shadow-2xl shadow-slate-200/40 flex flex-col justify-between min-h-[580px]">
          
          <div>
            {/* Logo / Title Block */}
            <div className="text-center flex flex-col items-center mb-8">
              <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/25 text-sm mb-3">
                vCFO
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back!</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Sign in to your Virtual CFO dashboard</p>

              {/* Database Connection Status Badge */}
              {dbStatus === 'postgres' && (
                <div className="mt-3.5 flex items-center gap-1.5 justify-center bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-200/80 shadow-sm shadow-emerald-100/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  PostgreSQL Connected
                </div>
              )}
              {dbStatus === 'json' && (
                <div className="mt-3.5 flex items-center gap-1.5 justify-center bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-red-200/80 shadow-sm shadow-red-100/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-550 animate-pulse" />
                  PostgreSQL Connection Failed
                </div>
              )}
              {dbStatus === 'checking' && (
                <div className="mt-3.5 flex items-center gap-1.5 justify-center bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                  Checking DB Status...
                </div>
              )}
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400"><Mail className="h-4 w-4" /></span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 hover:bg-slate-50 transition"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400"><Lock className="h-4 w-4" /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 hover:bg-slate-50 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Extra actions: Remember Me / Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs text-slate-500 font-medium hover:text-slate-700 transition">Remember me</span>
                </label>
                <Link href="#" onClick={(e) => { e.preventDefault(); toast.info("Password reset flow is not implemented in this demo."); }} className="text-xs text-blue-600 hover:text-blue-700 font-bold transition hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/10 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Separator / Divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn('Google')}
                className="flex items-center justify-center py-2.5 px-4 text-xs border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-slate-100"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('Microsoft')}
                className="flex items-center justify-center py-2.5 px-4 text-xs border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl transition cursor-pointer shadow-sm shadow-slate-100"
              >
                <svg className="w-3.5 h-3.5 mr-2" viewBox="0 0 23 23" fill="currentColor">
                  <rect x="0" y="0" width="11" height="11" fill="#F25022" />
                  <rect x="12" y="0" width="11" height="11" fill="#7FBA00" />
                  <rect x="0" y="12" width="11" height="11" fill="#00A1F1" />
                  <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
                </svg>
                Microsoft
              </button>
            </div>
          </div>

          {/* Footer Details */}
          <div className="text-center mt-6 border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-600 font-bold hover:underline">
                Create one now
              </Link>
            </p>

            {/* Copyright, exuberantglobal designed by, Developer Rajan Goswami Tooltip */}
            <p className="text-[10px] text-slate-400 mt-5 leading-relaxed">
              © 2026 Virtual CFO. All rights reserved.<br />
              Designed by{' '}
              <a 
                href="https://exuberantglobal.co.uk" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:text-blue-600 font-semibold transition hover:underline"
              >
                exuberantglobal.co.uk
              </a>{' '}
              | Developed by{' '}
              <span className="relative group inline-block">
                <span className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer border-b border-dashed border-blue-400 hover:border-blue-700 transition pb-0.5">
                  Rajan Goswami
                </span>
                
                {/* Premium Developer Tooltip Box */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 w-72 p-4 bg-slate-900/98 text-white rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-350 ease-out z-50 flex flex-col text-left font-normal normal-case tracking-normal">
                  
                  {/* Header info */}
                  <span className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-2.5">
                    <span className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20">
                      RG
                    </span>
                    <span className="flex flex-col">
                      <span className="font-bold text-sm text-slate-100">Rajan Goswami</span>
                      <span className="text-[9px] text-blue-400 font-bold tracking-wider uppercase">Senior Full Stack Developer</span>
                    </span>
                  </span>

                  {/* Body text */}
                  <span className="text-xs text-slate-300 leading-relaxed font-light">
                    Specializing in high-performance enterprise dashboards, finance integrations, and state-of-the-art responsive UI/UX designs.
                  </span>

                  {/* Bottom tags */}
                  <span className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium">📍 Noida, India</span>
                    <span className="text-blue-400 font-bold">exuberantglobal.co.uk</span>
                  </span>

                  {/* Tooltip Down Arrow */}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-slate-800 rotate-45"></span>
                </span>
              </span>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
