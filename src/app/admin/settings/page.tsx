"use client";

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Database, 
  Mail, 
  Bell, 
  Cpu, 
  Lock, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  Key,
  Globe,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // SMTP Settings
  const [smtpPreset, setSmtpPreset] = useState<'gmail' | 'outlook' | 'custom' | 'sendgrid'>('gmail');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpEncryption, setSmtpEncryption] = useState('TLS');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('noreply@virtualcfo.com');
  const [smtpSenderName, setSmtpSenderName] = useState('Virtual CFO Platform');
  const [smtpUser, setSmtpUser] = useState('admin@virtualcfo.com');
  const [smtpPass, setSmtpPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  // Verification states
  const [testRecipient, setTestRecipient] = useState('admin@virtualcfo.com');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Feature Flags
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [multiTenancyEnabled, setMultiTenancyEnabled] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);
  const [rateLimit, setRateLimit] = useState('1000');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        const s = data.settings;
        setSmtpHost(s.smtpHost || 'smtp.gmail.com');
        setSmtpPort(String(s.smtpPort || 587));
        setSmtpEncryption(s.smtpEncryption || 'TLS');
        setSmtpSenderEmail(s.smtpSenderEmail || 'noreply@virtualcfo.com');
        setSmtpSenderName(s.smtpSenderName || 'Virtual CFO Platform');
        setSmtpUser(s.smtpUser || 'admin@virtualcfo.com');
        setSmtpPass(s.smtpPass || '');
        setIsVerified(s.smtpVerified || false);
        setMaintenanceMode(s.maintenanceMode || false);
        setMultiTenancyEnabled(s.multiTenancyEnabled ?? true);
        setAuditLogging(s.auditLogging ?? true);
        setRateLimit(s.rateLimit || '1000');
      }
    } catch (e) {
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleApplyPreset = (preset: 'gmail' | 'outlook' | 'custom' | 'sendgrid') => {
    setSmtpPreset(preset);
    setIsVerified(false);
    setVerificationError('');

    if (preset === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort('587');
      setSmtpEncryption('TLS');
      toast.info('Applied Gmail SMTP preset (Port 587 TLS)');
    } else if (preset === 'outlook') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort('587');
      setSmtpEncryption('TLS');
      toast.info('Applied Outlook / O365 SMTP preset (Port 587 TLS)');
    } else if (preset === 'sendgrid') {
      setSmtpHost('smtp.sendgrid.net');
      setSmtpPort('587');
      setSmtpEncryption('TLS');
      toast.info('Applied SendGrid SMTP preset (Port 587 TLS)');
    } else {
      toast.info('Switched to Custom SMTP configuration');
    }
  };

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setVerificationError('');
    try {
      const res = await fetch('/api/admin/settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpEncryption,
          smtpUser,
          smtpPass,
          testRecipient
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsVerified(true);
        toast.success(`Test Email Delivered! SMTP Server Verified ✓`);
      } else {
        setIsVerified(false);
        setVerificationError(data.message || 'SMTP Verification Failed');
        toast.error(data.message || 'SMTP Verification Failed');
      }
    } catch (err) {
      setIsVerified(false);
      setVerificationError('Error connecting to SMTP server test endpoint');
      toast.error('Error verifying SMTP connection');
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!isVerified) {
      toast.error('Please verify SMTP settings with a test email before saving!');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpEncryption,
          smtpSenderEmail,
          smtpSenderName,
          smtpUser,
          smtpPass,
          smtpVerified: isVerified,
          maintenanceMode,
          multiTenancyEnabled,
          auditLogging,
          rateLimit
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('System Settings & SMTP Configuration Saved!');
      } else {
        toast.error(data.message || 'Failed to save configuration');
      }
    } catch (err) {
      toast.error('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 select-none pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>System Settings & SMTP Configuration</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Configure SMTP email delivery servers, test mail verifications, security switches, and throttling limits.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* SECTION 1: SMTP EMAIL SERVER CONFIGURATION & TEST VERIFICATION */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">SMTP Outbound Mail Server Setup</h3>
              <p className="text-xs text-slate-500">Configure email server for sending invitations, notifications, and 2FA alerts.</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600 overflow-x-auto">
            {[
              { id: 'gmail', label: 'Gmail SMTP' },
              { id: 'outlook', label: 'Outlook / O365' },
              { id: 'sendgrid', label: 'SendGrid' },
              { id: 'custom', label: 'Custom Host' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-xl capitalize transition cursor-pointer ${
                  smtpPreset === p.id ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SMTP Form Fields */}
        <form onSubmit={handleTestSmtp} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host / Server</label>
              <div className="relative">
                <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => { setSmtpHost(e.target.value); setIsVerified(false); }}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Port</label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => { setSmtpPort(e.target.value); setIsVerified(false); }}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                placeholder="587"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Encryption Protocol</label>
              <select
                value={smtpEncryption}
                onChange={(e) => { setSmtpEncryption(e.target.value); setIsVerified(false); }}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold cursor-pointer"
              >
                <option value="TLS">TLS / STARTTLS (Recommended)</option>
                <option value="SSL">SSL</option>
                <option value="NONE">None (Plaintext)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sender Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={smtpSenderEmail}
                  onChange={(e) => setSmtpSenderEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  placeholder="noreply@virtualcfo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sender Display Name</label>
              <input
                type="text"
                value={smtpSenderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                placeholder="Virtual CFO Platform"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Username / Email</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => { setSmtpUser(e.target.value); setIsVerified(false); }}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                placeholder="admin@gmail.com"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SMTP Password / Gmail App Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={smtpPass}
                  onChange={(e) => { setSmtpPass(e.target.value); setIsVerified(false); }}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  placeholder="Enter SMTP password or 16-character Gmail App Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Test Email</label>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                placeholder="admin@virtualcfo.com"
                required
              />
            </div>

          </div>

          {/* Test Verification Status Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isVerified ? (
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isVerified ? 'SMTP Server Connection Verified ✓' : 'SMTP Server Unverified'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isVerified 
                    ? 'Test email delivered successfully! You can now save your system settings.'
                    : verificationError || 'Run test mail verification to confirm server connectivity before saving.'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Send className={`h-4 w-4 ${verifying ? 'animate-bounce' : ''}`} />
              <span>{verifying ? 'Verifying SMTP Server...' : 'Send & Verify Test Email ✉️'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: SYSTEM FEATURE FLAGS & RATE LIMITS */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">System Feature Switches & Rate Limits</h3>
            <p className="text-xs text-slate-500">Configure global platform toggles, security boundaries, and API request throttles.</p>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          
          <div className="pt-2 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Maintenance Mode</h4>
              <p className="text-[11px] text-slate-500">Puts client tenant dashboards into read-only scheduled maintenance mode.</p>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className="text-2xl text-blue-600 cursor-pointer"
            >
              {maintenanceMode ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
            </button>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Strict Multi-Tenant Isolation</h4>
              <p className="text-[11px] text-slate-500">Enforces schema row-level security per tenant ID.</p>
            </div>
            <button
              onClick={() => setMultiTenancyEnabled(!multiTenancyEnabled)}
              className="text-2xl text-blue-600 cursor-pointer"
            >
              {multiTenancyEnabled ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
            </button>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Audit Stream Logging</h4>
              <p className="text-[11px] text-slate-500">Records security events, API token refreshes, and admin actions.</p>
            </div>
            <button
              onClick={() => setAuditLogging(!auditLogging)}
              className="text-2xl text-blue-600 cursor-pointer"
            >
              {auditLogging ? <ToggleRight className="h-8 w-8 text-blue-600" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
            </button>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max API Requests / Min per Tenant</label>
              <input
                type="text"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
              />
            </div>
          </div>

        </div>
      </div>

      {/* SAVE CONFIGURATION BAR */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          {!isVerified && (
            <span className="text-xs text-amber-700 font-bold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Please verify SMTP with a test email to enable saving.
            </span>
          )}
          {isVerified && (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> SMTP Verified & Ready to Save.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={!isVerified || saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving System Configuration...' : 'Save System & SMTP Configuration'}</span>
        </button>
      </div>

    </div>
  );
}
