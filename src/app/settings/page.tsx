'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Settings as SettingsIcon, Key, LogIn, ExternalLink,
  Eye, EyeOff, Check, Trash2, X, Wand2, History, Shield, Info,
  Zap, Globe, ImagePlus, User, CreditCard, Calendar, Shield as ShieldIcon,
  Video, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/lib/utils';
import { pollinationsAPI } from '@/lib/api';
import { UserProfile, ApiKeyInfo } from '@/types';

const APP_REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin + '/settings' : 'https://image-gen-editor.vercel.app/settings';
const BYOP_AUTH_URL = 'https://enter.pollinations.ai/authorize';

export default function SettingsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const checkUserBalance = async () => {
    const bal = await pollinationsAPI.checkBalance();
    setBalance(bal);
  };

  const loadProfile = async () => {
    const prof = await pollinationsAPI.getProfile();
    setProfile(prof);
  };

  const loadKeyInfo = async () => {
    const info = await pollinationsAPI.getApiKeyInfo();
    setKeyInfo(info);
  };

  // Grab key from BYOP hash redirect
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const key = hashParams.get('api_key');
      if (key) {
        storage.setApiKey(key);
        setApiKey(key);
        setHasKey(true);
        pollinationsAPI.setApiKey(key);
        checkUserBalance();
        loadProfile();
        loadKeyInfo();
        toast.success('Connected! API key received via Pollinations');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setHasKey(true);
      pollinationsAPI.setApiKey(savedKey);
      checkUserBalance();
      loadProfile();
      loadKeyInfo();
    }
  }, []);

  const handleBYOPAuth = () => {
    const params = new URLSearchParams({ redirect_url: APP_REDIRECT_URL });
    window.location.href = `${BYOP_AUTH_URL}?${params}`;
  };

  const handleSaveKey = () => {
    if (!apiKey.trim()) { toast.error('Please enter an API key'); return; }
    storage.setApiKey(apiKey.trim());
    pollinationsAPI.setApiKey(apiKey.trim());
    setHasKey(true);
    setSaved(true);
    checkUserBalance();
    loadProfile();
    loadKeyInfo();
    toast.success('API key saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemoveKey = () => {
    storage.removeApiKey();
    pollinationsAPI.setApiKey(null);
    setApiKey('');
    setHasKey(false);
    setBalance(null);
    setProfile(null);
    setKeyInfo(null);
    toast.success('API key removed');
  };

  const handleClearHistory = () => {
    if (confirm('Clear all generation history?')) {
      storage.clearHistory();
      toast.success('History cleared');
    }
  };

  return (
    <div className="w-full h-[100dvh] relative selection:bg-[#EF8354] selection:text-white overflow-auto">

      {/* Top-left nav pill */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-sm relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-700 hover:bg-black/5'}`}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Gallery</span>
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-2"></div>
          <button className="p-1.5 rounded-full bg-[#EF8354]/10 text-[#EF8354] transition-colors">
            <SettingsIcon size={16} />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> History / Gallery
              </a>
              <a href="/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <ImagePlus size={16} /> Image Editor
              </a>
              <a href="/video" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Video size={16} /> Video Generation
              </a>
              <a href="/usage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <BarChart3 size={16} /> Usage Dashboard
              </a>
              <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/5 transition-colors">
                <SettingsIcon size={16} /> Settings
              </a>
            </div>
          )}
        </div>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Main content */}
      <div className="max-w-xl mx-auto pt-24 px-4 pb-10 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354]">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-800">Settings</h1>
            <p className="text-xs text-zinc-400">Manage your API key and preferences</p>
          </div>
        </div>

        {/* Connection Status */}
        {hasKey && (
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mt-0.5"></div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-green-700">Connected</span>
              <p className="text-xs text-zinc-400">Your API key is active and ready</p>
              {balance !== null && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-[#EF8354]/10 rounded-md">
                   <Zap size={12} className="text-[#EF8354]" />
                   <span className="text-[11px] font-bold text-[#EF8354] uppercase tracking-wider">{balance} Pollen Left</span>
                </div>
              )}
            </div>
            <button onClick={handleRemoveKey} className="text-xs font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1 shrink-0 self-start">
              <Trash2 size={12} /> Remove
            </button>
          </div>
        )}

        {/* Profile Info */}
        {hasKey && profile && (
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                <User size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-800">Account Profile</h2>
                <p className="text-xs text-zinc-400">Your Pollinations account info</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Name</p>
                <p className="text-sm font-medium text-zinc-700">{profile.name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium text-zinc-700">{profile.email || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tier</p>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EF8354]/10">
                  <Zap size={10} className="text-[#EF8354]" />
                  <span className="text-[11px] font-bold text-[#EF8354] uppercase tracking-wider">{profile.tier}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Member Since</p>
                <p className="text-sm font-medium text-zinc-700">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {profile.nextResetAt && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/50">
                <Calendar size={14} className="text-zinc-400" />
                <span className="text-xs text-zinc-500">Next pollen reset: <span className="font-medium text-zinc-700">{new Date(profile.nextResetAt).toLocaleString()}</span></span>
              </div>
            )}
          </div>
        )}

        {/* API Key Info */}
        {hasKey && keyInfo && (
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                <Key size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-800">API Key Details</h2>
                <p className="text-xs text-zinc-400">Information about your current API key</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Key Type</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${keyInfo.type === 'secret' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  <ShieldIcon size={10} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{keyInfo.type}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Status</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${keyInfo.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <Check size={10} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{keyInfo.valid ? 'Valid' : 'Invalid'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Expires</p>
                <p className="text-sm font-medium text-zinc-700">
                  {keyInfo.expiresAt ? new Date(keyInfo.expiresAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Budget</p>
                <p className="text-sm font-medium text-zinc-700">
                  {keyInfo.pollenBudget !== null && keyInfo.pollenBudget !== undefined ? `${keyInfo.pollenBudget} pollen` : 'Unlimited'}
                </p>
              </div>
            </div>

            {keyInfo.permissions && (keyInfo.permissions.models || keyInfo.permissions.account) && (
              <div className="pt-3 border-t border-zinc-200/50 space-y-2">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Permissions</p>
                {keyInfo.permissions.models && (
                  <div className="flex flex-wrap gap-1.5">
                    {keyInfo.permissions.models.slice(0, 5).map((m, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">{m}</span>
                    ))}
                    {keyInfo.permissions.models.length > 5 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">+{keyInfo.permissions.models.length - 5} more</span>
                    )}
                  </div>
                )}
                {keyInfo.permissions.account && keyInfo.permissions.account.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {keyInfo.permissions.account.map((p, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BYOP Connect */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354]">
              <LogIn size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">Connect with Pollinations</h2>
              <p className="text-xs text-zinc-400">One-click sign-in. Your pollen, your usage.</p>
            </div>
          </div>
          <button
            onClick={handleBYOPAuth}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] shadow-lg shadow-[#EF8354]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} /> Connect via Pollinations
          </button>
          <div className="flex items-start gap-2 pt-1">
            <Info size={14} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              You&apos;ll be redirected to Pollinations to authorize. After approval, your API key will be automatically saved. Keys expire in 30 days.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-200"></div>
          <span className="text-xs font-semibold text-zinc-400 uppercase">or use manual key</span>
          <div className="flex-1 h-px bg-zinc-200"></div>
        </div>

        {/* Manual API Key */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Key size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-800">Manual API Key</h2>
              <p className="text-xs text-zinc-400">Paste your sk_ key from enter.pollinations.ai</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-zinc-100/80 rounded-xl px-3 py-2.5 border border-zinc-200/50">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none font-mono"
                onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
              />
            </div>
            <button onClick={() => setShowKey(!showKey)} className="p-2.5 rounded-xl border border-zinc-200/50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            onClick={handleSaveKey}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
          >
            {saved ? <span className="flex items-center justify-center gap-1.5"><Check size={14} /> Saved!</span> : 'Save API Key'}
          </button>
        </div>

        {/* Get Key Info */}
        <div className="glass-panel rounded-3xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
            <Zap size={16} className="text-[#EF8354]" /> How to get an API key
          </h3>
          <ol className="text-xs text-zinc-500 space-y-2 pl-4 list-decimal">
            <li>Go to <a href="https://enter.pollinations.ai" target="_blank" rel="noopener noreferrer" className="text-[#EF8354] hover:underline font-medium">enter.pollinations.ai</a></li>
            <li>Sign in with your GitHub account</li>
            <li>Click <strong>&quot;+ API Key&quot;</strong> to create a secret key (sk_...)</li>
            <li>Paste it above or use the one-click Connect button</li>
          </ol>
          <div className="flex items-start gap-2 pt-2 border-t border-zinc-200/50">
            <Globe size={14} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400">
              Every account gets free Pollen that refills hourly. All images are generated via the Pollinations cloud API — nothing is stored on our servers.
            </p>
          </div>
        </div>

        {/* Data Management */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
            <Shield size={16} className="text-zinc-500" /> Data & Privacy
          </h3>
          <div className="space-y-3 text-xs text-zinc-500">
            <p>• API key is stored only in your browser&apos;s localStorage</p>
            <p>• Generation history is stored locally in your browser</p>
            <p>• Images are served from Pollinations CDN URLs</p>
            <p>• No data is sent to any third-party besides Pollinations AI</p>
          </div>
          <button
            onClick={handleClearHistory}
            className="w-full py-2.5 rounded-xl border border-red-200 text-red-400 font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Clear All History
          </button>
        </div>

      </div>
    </div>
  );
}
