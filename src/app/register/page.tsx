"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Briefcase, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !companyName.trim()) {
      toast.error('All fields are required.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
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
        router.push('/overview');
        router.refresh();
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
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-slate-50 via-slate-100 to-slate-200 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 p-8 shadow-xl flex flex-col space-y-6">
        {/* Header Branding */}
        <div className="text-center flex flex-col items-center">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-md mb-3">
            vCFO
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Create Your Account</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Get your own secure tenant financial cockpit</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Company / Workspace Name</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400"><Briefcase className="h-4 w-4" /></span>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white/50"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400"><Mail className="h-4 w-4" /></span>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white/50"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400"><Lock className="h-4 w-4" /></span>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white/50"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Get Started'}
            {!loading && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </form>

        {/* Footer info */}
        <div className="border-t border-slate-200/50 pt-4 text-center">
          <p className="text-[11.5px] text-slate-500 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
