"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Briefcase, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Info, 
  Check, 
  TrendingUp, 
  ShieldCheck, 
  PieChart 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time password validation flags
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasUppercase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !companyName.trim()) {
      toast.error('All fields are required.');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements before registering.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Account registered successfully for ${data.user.companyName}!`);
        
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
        toast.error(data.message || 'Registration failed. Email might already be taken.');
      }
    } catch (err) {
      toast.error('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white">
      
      {/* Left Pane: Value Proposition & Trust Pane (lg only) */}
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

        {/* Center Marketing List */}
        <div className="relative z-10 my-auto py-8">
          <div className="max-w-xl space-y-10">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Your Financial Data.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Smarter Decisions.
                </span>
              </h1>
              <p className="text-slate-400 text-sm xl:text-base leading-relaxed font-light">
                Create your account and unlock the full power of advanced corporate financial analytics, multi-entity sync, and real-time cash flow forecasting.
              </p>
            </div>

            {/* Vertical list of features */}
            <div className="space-y-6">
              {/* Feature 1 */}
              <div className="flex gap-4 items-start group">
                <span className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Real-time Insights</h4>
                  <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
                    Get up-to-date financial data and key performance metrics (KPIs) at your fingertips instantly.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4 items-start group">
                <span className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Secure & Reliable</h4>
                  <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
                    Enterprise-grade bank-level security and automated backups keep your organization's data safe.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4 items-start group">
                <span className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <PieChart className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Powerful Analytics</h4>
                  <p className="text-xs text-slate-400 font-light mt-0.5 leading-relaxed">
                    Visualize, analyze, model scenarios, and grow your business with automated reporting you can trust.
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial / Social Proof Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl flex gap-5 items-center hover:border-slate-800 transition duration-300">
              
              {/* Mini Mockup Dashboard (SVG) */}
              <div className="w-28 h-20 bg-slate-950/80 rounded-lg border border-slate-800/60 p-2 flex flex-col gap-1.5 flex-shrink-0 select-none overflow-hidden">
                {/* Top bar */}
                <div className="flex justify-between items-center pb-1 border-b border-slate-800/50">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500/80" />
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="h-2 w-8 bg-slate-800 rounded-full" />
                </div>
                {/* Content */}
                <div className="flex gap-2 h-full">
                  {/* Side menu */}
                  <div className="w-4 bg-slate-900/50 rounded flex flex-col gap-1 p-0.5">
                    <div className="h-1 bg-blue-500/80 rounded" />
                    <div className="h-1 bg-slate-800 rounded" />
                    <div className="h-1 bg-slate-800 rounded" />
                  </div>
                  {/* Grid */}
                  <div className="flex-grow flex flex-col gap-1">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="h-3 bg-slate-800/80 rounded flex items-center px-0.5">
                        <div className="h-1 w-2 bg-emerald-400 rounded-full" />
                      </div>
                      <div className="h-3 bg-slate-800/80 rounded flex items-center px-0.5">
                        <div className="h-1 w-2 bg-blue-400 rounded-full" />
                      </div>
                    </div>
                    {/* Chart mock */}
                    <div className="flex-grow bg-slate-900/80 rounded p-1 flex items-end justify-around gap-0.5">
                      <div className="w-1 bg-blue-500 rounded-t" style={{ height: '40%' }} />
                      <div className="w-1 bg-blue-500 rounded-t" style={{ height: '65%' }} />
                      <div className="w-1 bg-indigo-500 rounded-t" style={{ height: '50%' }} />
                      <div className="w-1 bg-emerald-400 rounded-t" style={{ height: '80%' }} />
                      <div className="w-1 bg-blue-400 rounded-t" style={{ height: '30%' }} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Testimonial text & avatars */}
              <div className="space-y-2">
                <p className="text-slate-300 text-xs italic font-medium leading-relaxed">
                  "Join thousands of finance professionals using vCFO to drive growth."
                </p>
                <div className="flex items-center gap-3">
                  {/* Overlapping Avatars */}
                  <div className="flex -space-x-2">
                    <span className="h-6 w-6 rounded-full border border-slate-900 bg-gradient-to-tr from-rose-400 to-orange-400 flex items-center justify-center text-[8px] font-bold text-white select-none">JD</span>
                    <span className="h-6 w-6 rounded-full border border-slate-900 bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-[8px] font-bold text-white select-none">AM</span>
                    <span className="h-6 w-6 rounded-full border border-slate-900 bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-[8px] font-bold text-white select-none">SR</span>
                    <span className="h-6 w-6 rounded-full border border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300 select-none">+2k</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-tight">Trusted by 2,000+ users</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Pane: Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-radial from-[#f1f5f9] via-[#f8fafc] to-[#e2e8f0]">
        
        <div className="w-full max-w-md bg-white/80 border border-slate-200/80 backdrop-blur-md rounded-3xl p-8 md:p-10 shadow-2xl shadow-slate-200/40 flex flex-col justify-between min-h-[620px]">
          
          <div>
            {/* Logo / Title Block */}
            <div className="text-center flex flex-col items-center mb-6">
              <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/25 text-sm mb-3">
                vCFO
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Your Account</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Get your own secure tenant financial cockpit</p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Company Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company / Workspace Name</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400"><Briefcase className="h-4 w-4" /></span>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 hover:bg-slate-50 transition"
                    required
                  />
                </div>
              </div>

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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400"><Lock className="h-4 w-4" /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
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

              {/* Real-time Password Checklist alert box */}
              <div className="bg-blue-50/40 border border-blue-100/70 rounded-xl p-3 flex gap-2.5 items-start text-[10px] text-slate-600 transition duration-300">
                <span className="text-blue-500 flex-shrink-0 mt-0.5">
                  <Info className="h-3.5 w-3.5" />
                </span>
                <div className="space-y-1">
                  <span className="font-bold text-slate-700">Password must contain:</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-slate-500 font-medium">
                    <span className={`flex items-center gap-1 transition ${hasMinLength ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className={`h-3 w-3 ${hasMinLength ? 'text-emerald-500 stroke-[3]' : 'text-slate-300'}`} />
                      At least 6 chars
                    </span>
                    <span className={`flex items-center gap-1 transition ${hasNumber ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className={`h-3 w-3 ${hasNumber ? 'text-emerald-500 stroke-[3]' : 'text-slate-300'}`} />
                      One number
                    </span>
                    <span className={`flex items-center gap-1 transition ${hasUppercase ? 'text-emerald-600 font-bold' : ''}`}>
                      <Check className={`h-3 w-3 ${hasUppercase ? 'text-emerald-500 stroke-[3]' : 'text-slate-300'}`} />
                      One uppercase
                    </span>
                  </div>
                </div>
              </div>

              {/* Get Started Submit */}
              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/10 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Details */}
          <div className="text-center mt-6 border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 font-bold hover:underline">
                Sign In
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
