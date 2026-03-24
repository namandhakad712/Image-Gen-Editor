'use client';

import React, { useState, useEffect } from 'react';
import {
  Key, Sparkles, ExternalLink, Check, Copy, Eye, EyeOff,
  Shield, Zap, Info, AlertCircle, ArrowRight, Github, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/lib/utils';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setIsValid(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    storage.setApiKey(apiKey.trim());
    setIsValidating(true);

    // Simulate validation (in real app, would make API call)
    setTimeout(() => {
      setIsValidating(false);
      setIsValid(true);
      toast.success('API key saved successfully!');
    }, 1000);
  };

  const handleClearKey = () => {
    setApiKey('');
    setIsValid(null);
    storage.clearApiKey();
    toast.success('API key removed');
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard');
  };

  const maskKey = (key: string) => {
    if (key.length < 10) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#18181a] dark-dots p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EF8354] to-purple-600 flex items-center justify-center">
            <Key className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-zinc-400">Manage your API key and preferences</p>
          </div>
        </div>

        {/* API Key Card */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-[#EF8354]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-zinc-800 mb-1">
                Pollinations API Key
              </h2>
              <p className="text-sm text-zinc-500">
                Get your free API key to start generating images. All registered accounts receive free pollen that refills hourly.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                API Key
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk_..."
                    className="w-full px-4 py-3 pr-12 bg-white/50 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 font-mono"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {apiKey && (
                  <button
                    onClick={handleCopyKey}
                    className="px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors"
                    title="Copy API Key"
                  >
                    <Copy size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            {isValid !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-xl ${isValid
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
              >
                {isValid ? (
                  <>
                    <Check size={16} />
                    <span className="text-sm font-medium">API key is valid and ready to use</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Invalid API key</span>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleSaveKey}
                disabled={isValidating || !apiKey.trim()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all ${isValidating || !apiKey.trim()
                    ? 'bg-zinc-400 cursor-not-allowed'
                    : 'bg-[#EF8354] hover:bg-[#e27344] shadow-lg shadow-[#EF8354]/25'
                  }`}
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Save API Key
                  </>
                )}
              </button>

              {apiKey && (
                <button
                  onClick={handleClearKey}
                  className="px-6 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-700 font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Remove Key
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Get API Key Card */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-zinc-800 mb-2">
                Don't have an API key?
              </h2>
              <p className="text-sm text-zinc-500 mb-4">
                Sign up for free and get instant access to generate images. Free tier includes hourly pollen refills.
              </p>
              <a
                href="https://enter.pollinations.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
              >
                Get Free API Key
                <ExternalLink size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* About Pollen */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EF8354]/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-[#EF8354]" />
              </div>
              <h3 className="font-bold text-zinc-800">About Pollen</h3>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Pollen is the credit system used by Pollinations AI. Approximately 1 pollen = $1.
              Free accounts receive hourly refills, and you can bring your own pollen for higher usage.
            </p>
          </div>

          {/* Documentation */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-zinc-800">Documentation</h3>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Learn more about the Pollinations API, available models, and advanced features
              in the comprehensive documentation.
            </p>
            <a
              href="https://gen.pollinations.ai/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-[#EF8354] hover:text-[#e27344] transition-colors"
            >
              View API Docs
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 glass-panel rounded-2xl p-6 border border-amber-200/50 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">Security Notice</h4>
              <p className="text-sm text-amber-700">
                Your API key is stored locally in your browser and never sent to any server except Pollinations AI API endpoints.
                Never share your API key or commit it to version control.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <a
            href="https://github.com/pollinations/pollinations"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-zinc-700 transition-colors"
          >
            <Github size={16} />
            GitHub
          </a>
          <a
            href="https://pollinations.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 transition-colors"
          >
            Pollinations.ai
          </a>
          <a
            href="https://gen.pollinations.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 transition-colors"
          >
            API Reference
          </a>
        </div>
      </div>
    </div>
  );
}
