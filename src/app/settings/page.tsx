'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Settings as SettingsIcon, Key, LogIn, ExternalLink,
  Eye, EyeOff, Check, Trash2, Wand2, History, Shield, Info,
  Zap, Globe, ImagePlus, User, Calendar, Shield as ShieldIcon,
  Video, BarChart3, Sparkles, Images, Clock, TrendingUp,
  ChevronRight, Copy, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/lib/utils';
import { pollinationsAPI } from '@/lib/api';
import { UserProfile, ApiKeyInfo, HistoryItem } from '@/types';

const APP_REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin + '/settings' : 'https://image-gen-editor.vercel.app/settings';
const BYOP_AUTH_URL = 'https://enter.pollinations.ai/authorize';

export default function SettingsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentImages, setRecentImages] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, pollenSpent: 0 });
  
  // Model settings - fetched live from API
  const [textModels, setTextModels] = useState<any[]>([]);
  const [imageModels, setImageModels] = useState<any[]>([]);
  const [videoModels, setVideoModels] = useState<any[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState('openai');
  const [selectedImageModel, setSelectedImageModel] = useState('flux');
  const [selectedVideoModel, setSelectedVideoModel] = useState('wan-fast');
  const [modelsLoading, setModelsLoading] = useState(false);

  // Fetch live models from API
  const fetchLiveModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const response = await fetch('https://image.pollinations.ai/models');
      const data = await response.json();
      
      // Filter by supported_endpoints and output_modalities
      const textModelsFiltered = data.filter((m: any) => 
        m.supported_endpoints?.includes('/v1/chat/completions') ||
        m.supported_endpoints?.includes('/text/{prompt}')
      ).filter((m: any) => m.output_modalities?.includes('text'));
      
      const imageModelsFiltered = data.filter((m: any) => 
        m.supported_endpoints?.includes('/image/{prompt}') ||
        m.supported_endpoints?.includes('/v1/images/generations')
      ).filter((m: any) => m.output_modalities?.includes('image'));
      
      const videoModelsFiltered = data.filter((m: any) => 
        m.output_modalities?.includes('video')
      );
      
      setTextModels(textModelsFiltered);
      setImageModels(imageModelsFiltered);
      setVideoModels(videoModelsFiltered);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveModels();
  }, [fetchLiveModels]);

  // Load data with caching
  const loadAllData = useCallback(async () => {
    if (!hasKey) return;
    setLoading(true);
    try {
      const [bal, prof, info, history] = await Promise.all([
        pollinationsAPI.checkBalance(),
        pollinationsAPI.getProfile(),
        pollinationsAPI.getApiKeyInfo(),
        Promise.resolve(storage.getHistory()),
      ]);
      setBalance(bal);
      setProfile(prof);
      setKeyInfo(info);
      setRecentImages(history.slice(0, 6));
      
      // Calculate stats
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const weekImages = history.filter(h => h.createdAt > weekAgo);
      const totalCost = history.reduce((sum, h) => sum + (h.params?.width ? 0.001 : 0.002), 0);
      
      setStats({
        total: history.length,
        thisWeek: weekImages.length,
        pollenSpent: parseFloat(totalCost.toFixed(2)),
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [hasKey]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const key = hashParams.get('api_key');
      if (key) {
        storage.setApiKey(key);
        setApiKey(key);
        setHasKey(true);
        pollinationsAPI.setApiKey(key);
        toast.success('Connected! API key received');
        window.history.replaceState(null, '', window.location.pathname);
        loadAllData();
      }
    }
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setHasKey(true);
      pollinationsAPI.setApiKey(savedKey);
      loadAllData();
    }
  }, [loadAllData]);

  const handleSaveKey = () => {
    if (!apiKey.trim()) { toast.error('Please enter an API key'); return; }
    storage.setApiKey(apiKey.trim());
    pollinationsAPI.setApiKey(apiKey.trim());
    setHasKey(true);
    loadAllData();
    toast.success('API key saved!');
  };

  const handleRemoveKey = () => {
    storage.removeApiKey();
    pollinationsAPI.setApiKey(null);
    setApiKey('');
    setHasKey(false);
    setBalance(null);
    setProfile(null);
    setKeyInfo(null);
    setRecentImages([]);
    toast.success('API key removed');
  };

  const handleBYOPAuth = () => {
    const params = new URLSearchParams({ redirect_url: APP_REDIRECT_URL });
    window.location.href = `${BYOP_AUTH_URL}?${params}`;
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied!');
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      spore: 'from-zinc-500 to-zinc-600',
      seed: 'from-green-500 to-emerald-600',
      flower: 'from-pink-500 to-rose-600',
      nectar: 'from-amber-500 to-orange-600',
    };
    return colors[tier?.toLowerCase()] || 'from-zinc-400 to-zinc-500';
  };

  const getTierIcon = (tier: string) => {
    const icons: Record<string, string> = {
      spore: '🍄',
      seed: '🌱',
      flower: '🌸',
      nectar: '🍯',
    };
    return icons[tier?.toLowerCase()] || '🌟';
  };

  return (
    <div className="w-full h-[100dvh] relative selection:bg-[#EF8354] selection:text-white overflow-auto bg-gradient-to-br from-zinc-50 via-white to-zinc-100">

      {/* Top Navigation */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-lg backdrop-blur-xl bg-white/80">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-semibold text-sm ${menuOpen ? 'bg-[#EF8354] text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
          >
            <LayoutGrid size={16} />
            Menu
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 glass-panel rounded-2xl p-2 shadow-2xl backdrop-blur-xl bg-white/90 z-[60]">
              <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <Wand2 size={16} className="text-[#EF8354]" /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <History size={16} /> History / Gallery
              </a>
              <a href="/edit" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <ImagePlus size={16} /> Image Editor
              </a>
              <a href="/video" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <Video size={16} /> Video Generation
              </a>
              <a href="/usage" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <BarChart3 size={16} /> Usage Dashboard
              </a>
              <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/10 transition-all">
                <SettingsIcon size={16} /> Settings
              </a>
            </div>
          )}
        </div>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Main Content - Bento Grid */}
      <div className="max-w-7xl mx-auto pt-28 px-4 md:px-6 pb-10">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-800 mb-2">Settings</h1>
          <p className="text-zinc-500">Manage your account, API keys, and preferences</p>
        </div>

        {/* Connection Status Banner */}
        {!hasKey && (
          <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Key size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800">Connect Your API Key</h3>
              <p className="text-sm text-amber-600">Unlock full features and track your usage</p>
            </div>
            <button
              onClick={handleBYOPAuth}
              className="px-6 py-3 rounded-xl font-bold text-white bg-[#EF8354] hover:bg-[#e27344] transition-all shadow-lg hover:shadow-xl"
            >
              Connect Now
            </button>
          </div>
        )}

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

          {/* Profile Card - Large */}
          {hasKey && profile && (
            <div className="lg:col-span-2 row-span-2 rounded-3xl glass-panel p-6 md:p-8 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getTierColor(profile.tier)} flex items-center justify-center text-3xl shadow-lg`}>
                    {getTierIcon(profile.tier)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-800">{profile.name || 'Anonymous'}</h2>
                    <p className="text-sm text-zinc-500">{profile.email}</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-xs font-semibold">
                      <Zap size={12} className="text-[#EF8354]" />
                      {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)} Tier
                    </div>
                  </div>
                </div>
                <button onClick={handleRemoveKey} className="p-2 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-50/80">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Calendar size={14} />
                    <span className="text-xs font-semibold uppercase">Member Since</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-700">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-50/80">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Clock size={14} />
                    <span className="text-xs font-semibold uppercase">Next Reset</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-700">
                    {profile.nextResetAt ? new Date(profile.nextResetAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-[10px] font-semibold text-blue-400 uppercase mt-1">Total Images</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
                  <p className="text-2xl font-bold text-green-600">{stats.thisWeek}</p>
                  <p className="text-[10px] font-semibold text-green-400 uppercase mt-1">This Week</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-[#EF8354]/10 to-[#EF8354]/20">
                  <p className="text-2xl font-bold text-[#EF8354]">{balance !== null ? balance.toFixed(1) : '--'}</p>
                  <p className="text-[10px] font-semibold text-[#EF8354]/70 uppercase mt-1">Pollen Left</p>
                </div>
              </div>
            </div>
          )}

          {/* API Key Card */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Key size={18} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-800">API Key</h3>
                <p className="text-xs text-zinc-400">Your secret key</p>
              </div>
            </div>
            
            {hasKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100/80 border border-zinc-200">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    readOnly
                    className="flex-1 bg-transparent text-xs font-mono text-zinc-600"
                  />
                  <button onClick={() => setShowKey(!showKey)} className="p-1.5 hover:bg-zinc-200 rounded-lg transition-all">
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={copyApiKey} className="p-1.5 hover:bg-zinc-200 rounded-lg transition-all">
                    <Copy size={14} />
                  </button>
                </div>
                {keyInfo && (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${keyInfo.type === 'secret' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {keyInfo.type}
                    </span>
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-green-100 text-green-600">
                      {keyInfo.valid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20"
                />
                <button
                  onClick={handleSaveKey}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] transition-all shadow-lg"
                >
                  Save Key
                </button>
              </div>
            )}
          </div>

          {/* Model Settings - Text Models */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                  <Wand2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800">Text Model</h3>
                  <p className="text-xs text-zinc-400">For prompt enhancement</p>
                </div>
              </div>
              <button
                onClick={fetchLiveModels}
                disabled={modelsLoading}
                className="p-2 hover:bg-zinc-100 rounded-full transition-all"
              >
                <RefreshCw size={16} className={modelsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <select
              value={selectedTextModel}
              onChange={e => setSelectedTextModel(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20"
            >
              {textModels.map(m => (
                <option key={m.id} value={m.id}>{m.description || m.id}</option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-400 mt-2">
              Used for enhancing prompts before image/video generation
            </p>
          </div>

          {/* Model Settings - Image Models */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                  <ImagePlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800">Image Models</h3>
                  <p className="text-xs text-zinc-400">Live from API</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {imageModels.slice(0, 8).map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedImageModel(m.id)}
                  className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                    selectedImageModel === m.id
                      ? 'bg-[#EF8354]/10 border border-[#EF8354] text-[#EF8354]'
                      : 'bg-zinc-50 border border-zinc-200 hover:border-[#EF8354]/50'
                  }`}
                >
                  <span className="font-semibold">{m.description || m.id}</span>
                </button>
              ))}
              {imageModels.length > 8 && (
                <p className="text-[10px] text-zinc-400 text-center">+{imageModels.length - 8} more models available</p>
              )}
            </div>
          </div>

          {/* Model Settings - Video Models */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800">Video Models</h3>
                  <p className="text-xs text-zinc-400">Live from API</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {videoModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedVideoModel(m.id)}
                  className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                    selectedVideoModel === m.id
                      ? 'bg-[#EF8354]/10 border border-[#EF8354] text-[#EF8354]'
                      : 'bg-zinc-50 border border-zinc-200 hover:border-[#EF8354]/50'
                  }`}
                >
                  <span className="font-semibold">{m.description || m.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EF8354] to-orange-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-800">Quick Actions</h3>
                <p className="text-xs text-zinc-400">Shortcuts</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href="/usage" className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-all group">
                <div className="flex items-center gap-3">
                  <BarChart3 size={16} className="text-zinc-400 group-hover:text-[#EF8354]" />
                  <span className="text-sm font-medium text-zinc-700">Usage Stats</span>
                </div>
                <ChevronRight size={14} className="text-zinc-300" />
              </a>
              <a href="/history" className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-all group">
                <div className="flex items-center gap-3">
                  <Images size={16} className="text-zinc-400 group-hover:text-[#EF8354]" />
                  <span className="text-sm font-medium text-zinc-700">My Gallery</span>
                </div>
                <ChevronRight size={14} className="text-zinc-300" />
              </a>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-zinc-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw size={16} className={`text-zinc-400 group-hover:text-[#EF8354] ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium text-zinc-700">Refresh Data</span>
                </div>
                <ChevronRight size={14} className="text-zinc-300" />
              </button>
            </div>
          </div>

          {/* BYOP Connect */}
          <div className="md:col-span-2 lg:col-span-2 rounded-3xl glass-panel p-6 backdrop-blur-xl bg-gradient-to-br from-[#EF8354]/10 to-orange-100/50 border border-[#EF8354]/20 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-[#EF8354] shadow-lg">
                  <LogIn size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800 text-lg">Bring Your Own Pollen</h3>
                  <p className="text-sm text-zinc-500 mt-1">Let users pay for their own AI generations</p>
                </div>
              </div>
              <button
                onClick={handleBYOPAuth}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] transition-all shadow-lg flex items-center gap-2"
              >
                <ExternalLink size={14} />
                Connect
              </button>
            </div>
            <div className="mt-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm">
              <p className="text-xs text-zinc-600 leading-relaxed">
                <strong className="text-zinc-800">How it works:</strong> Your users connect their Pollinations account and use their own pollen balance. 
                You pay $0 for API usage. Perfect for scaling apps without compute costs.
              </p>
            </div>
          </div>

          {/* Recent Images */}
          <div className="md:col-span-2 lg:col-span-2 rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Images size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800">Recent Generations</h3>
                  <p className="text-xs text-zinc-400">Your latest creations</p>
                </div>
              </div>
              <a href="/history" className="text-sm font-semibold text-[#EF8354] hover:underline flex items-center gap-1">
                View All <ChevronRight size={14} />
              </a>
            </div>
            
            {recentImages.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {recentImages.map(img => (
                  <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-zinc-100 group cursor-pointer">
                    <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Images size={48} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-sm font-medium text-zinc-500">No images yet</p>
                <p className="text-xs text-zinc-400 mt-1">Start creating to see your work here</p>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-800">Privacy</h3>
                <p className="text-xs text-zinc-400">Your data is safe</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li className="flex items-start gap-2">
                <Check size={12} className="text-green-500 mt-0.5 shrink-0" />
                <span>API key stored locally in browser</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={12} className="text-green-500 mt-0.5 shrink-0" />
                <span>History saved on your device only</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={12} className="text-green-500 mt-0.5 shrink-0" />
                <span>Images served from Pollinations CDN</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="rounded-3xl glass-panel p-6 backdrop-blur-xl bg-white/80 border border-white/30 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white shadow-lg">
                <Globe size={18} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-800">Resources</h3>
                <p className="text-xs text-zinc-400">Helpful links</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href="https://enter.pollinations.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-zinc-50 transition-all text-sm font-medium text-zinc-700">
                <ExternalLink size={14} />
                Pollinations Dashboard
              </a>
              <a href="https://gen.pollinations.ai/api/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-zinc-50 transition-all text-sm font-medium text-zinc-700">
                <ExternalLink size={14} />
                API Documentation
              </a>
              <a href="https://github.com/pollinations/pollinations" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-zinc-50 transition-all text-sm font-medium text-zinc-700">
                <ExternalLink size={14} />
                GitHub Repository
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
