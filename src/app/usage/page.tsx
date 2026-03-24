'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Settings, Wand2, History, Video, Zap,
  TrendingUp, DollarSign, Clock, Calendar, Download,
  RefreshCw, Key, BarChart3, Activity, Image as ImageIcon,
  MessageSquare, Music
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage } from '@/lib/utils';
import { UsageRecord, DailyUsageRecord } from '@/types';

type Tab = 'history' | 'daily';

export default function UsagePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageRecord[] | DailyUsageRecord[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    const savedKey = storage.getApiKey();
    if (savedKey) {
      pollinationsAPI.setApiKey(savedKey);
      loadUsage();
      loadBalance();
    } else {
      setLoading(false);
      toast.error('Please add your API key in Settings');
    }
  }, [activeTab]);

  const loadBalance = async () => {
    const bal = await pollinationsAPI.checkBalance();
    setBalance(bal);
  };

  const loadUsage = async () => {
    setLoading(true);
    try {
      if (activeTab === 'history') {
        const data = await pollinationsAPI.getUsage(100);
        setUsageData(data as UsageRecord[] || []);
        // Calculate totals
        const cost = (data as UsageRecord[])?.reduce((sum, r) => sum + r.cost_usd, 0) || 0;
        setTotalCost(cost);
        setTotalRequests((data as UsageRecord[])?.length || 0);
      } else {
        const data = await pollinationsAPI.getDailyUsage(30);
        setUsageData(data as DailyUsageRecord[] || []);
        const cost = (data as DailyUsageRecord[])?.reduce((sum, r) => sum + r.cost_usd, 0) || 0;
        const requests = (data as DailyUsageRecord[])?.reduce((sum, r) => sum + r.requests, 0) || 0;
        setTotalCost(cost);
        setTotalRequests(requests);
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = activeTab === 'history'
        ? await pollinationsAPI.getUsage(5000, 'csv')
        : await pollinationsAPI.getDailyUsage(90, 'csv');
      
      if (data && typeof data === 'string') {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pollinations-usage-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success('CSV exported!');
      }
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const getModelIcon = (model: string) => {
    if (model.includes('flux') || model.includes('image') || model.includes('nanobanana') || model.includes('seedream') || model.includes('kontext') || model.includes('klein') || model.includes('zimage') || model.includes('grok-imagine') || model.includes('nova-canvas')) {
      return <ImageIcon size={14} />;
    }
    if (model.includes('video') || model.includes('veo') || model.includes('wan') || model.includes('seedance') || model.includes('ltx') || model.includes('nova-reel')) {
      return <Video size={14} />;
    }
    if (model.includes('audio') || model.includes('speech') || model.includes('whisper') || model.includes('eleven')) {
      return <Music size={14} />;
    }
    return <MessageSquare size={14} />;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <BarChart3 size={16} />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> My Generations
              </a>
              <a href="/video" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Video size={16} /> Video Generation
              </a>
              <a href="/usage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/5 transition-colors">
                <BarChart3 size={16} /> Usage Dashboard
              </a>
              <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Settings size={16} /> Settings
              </a>
            </div>
          )}
        </div>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Main content */}
      <div className="max-w-6xl mx-auto pt-24 px-4 pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354]">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-800">Usage Dashboard</h1>
              <p className="text-sm text-zinc-400">Track your API usage and spending</p>
            </div>
          </div>
          <button
            onClick={loadUsage}
            className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balance */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <Zap size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Pollen Balance</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-800">
                {balance !== null ? balance.toFixed(2) : '--'}
              </span>
              <span className="text-sm text-zinc-400">pollen</span>
            </div>
            {balance !== null && balance < 10 && (
              <p className="text-xs text-amber-600 font-medium">Low balance - consider topping up</p>
            )}
          </div>

          {/* Total Cost */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <DollarSign size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {activeTab === 'history' ? 'Total Cost (100 req)' : 'Total Cost (30 days)'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#EF8354]">
                {formatCost(totalCost)}
              </span>
              <span className="text-sm text-zinc-400">USD</span>
            </div>
          </div>

          {/* Total Requests */}
          <div className="glass-panel rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <Activity size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {activeTab === 'history' ? 'Recent Requests' : 'Total Requests (30 days)'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-800">
                {loading ? '--' : totalRequests}
              </span>
              <span className="text-sm text-zinc-400">requests</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-panel rounded-2xl p-1.5 inline-flex items-center gap-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white shadow-sm text-[#EF8354]'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} />
              Request History
            </div>
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'daily'
                ? 'bg-white shadow-sm text-[#EF8354]'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              Daily Summary
            </div>
          </button>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={handleExportCSV}
            disabled={loading || usageData.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* Usage Data */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
              <RefreshCw size={32} className="animate-spin mb-3" />
              <p className="text-sm font-medium">Loading usage data...</p>
            </div>
          ) : usageData.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
              <TrendingUp size={32} className="mb-3 opacity-50" />
              <p className="text-sm font-medium">No usage data found</p>
              <p className="text-xs mt-1">Start generating to see your usage here</p>
            </div>
          ) : activeTab === 'history' ? (
            /* Request History Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50/50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Date & Time</th>
                    <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Model</th>
                    <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Tokens</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Cost</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(usageData as UsageRecord[]).map((record, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-zinc-700">{formatDate(record.timestamp)}</div>
                        <div className="text-xs text-zinc-400">{formatTime(record.timestamp)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">{getModelIcon(record.model)}</span>
                          <span className="text-sm font-medium text-zinc-700">{record.model}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600">
                          {record.type.split('.')[1] || record.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-mono text-zinc-600">
                          {(record.input_text_tokens || 0) + (record.output_text_tokens || 0) || 
                           (record.output_image_tokens || 0) || 
                           (record.input_audio_tokens || 0) + (record.output_audio_tokens || 0) ||
                           '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-[#EF8354]">{formatCost(record.cost_usd)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-mono text-zinc-500">{record.response_time_ms}ms</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Daily Summary Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50/50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Model</th>
                    <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Source</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Requests</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(usageData as DailyUsageRecord[]).map((record, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-zinc-700">{formatDate(record.date)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">{getModelIcon(record.model)}</span>
                          <span className="text-sm font-medium text-zinc-700">{record.model}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600">
                          {record.meter_source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-zinc-700">{record.requests}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-[#EF8354]">{formatCost(record.cost_usd)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="glass-panel rounded-2xl p-4 flex items-start gap-3 bg-blue-50/50 border border-blue-200">
          <Key size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-700 mb-1">About Usage Data</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              Usage data is fetched from Pollinations API and shows your last 100 requests (History tab) or daily summaries for the past 30 days (Daily Summary tab). 
              Data is cached for 1 hour. Export to CSV for detailed analysis.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
