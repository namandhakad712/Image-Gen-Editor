'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, Trash2, ExternalLink, Check, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Toggle } from '@/components/Toggle';
import { pollinationsAPI } from '@/lib/api';
import { storage } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [safeMode, setSafeMode] = useState(false);

  useEffect(() => {
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
      checkBalance(savedKey);
    }
  }, []);

  const checkBalance = async (key: string) => {
    setIsLoadingBalance(true);
    pollinationsAPI.setApiKey(key);
    const bal = await pollinationsAPI.checkBalance();
    setBalance(bal);
    setIsLoadingBalance(false);
  };

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    storage.setApiKey(apiKey.trim());
    pollinationsAPI.setApiKey(apiKey.trim());
    setIsKeySaved(true);
    checkBalance(apiKey.trim());
    toast.success('API key saved successfully');
  };

  const handleRemoveKey = () => {
    setApiKey('');
    storage.removeApiKey();
    pollinationsAPI.setApiKey(null);
    setIsKeySaved(false);
    setBalance(null);
    toast.success('API key removed');
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsLoadingBalance(true);
    pollinationsAPI.setApiKey(apiKey.trim());
    const bal = await pollinationsAPI.checkBalance();
    setIsLoadingBalance(false);

    if (bal !== null) {
      setBalance(bal);
      toast.success('API key is valid!');
    } else {
      toast.error('Invalid API key or connection error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your API key and preferences</p>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-card rounded-xl p-6 border border-input space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">API Key</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Get your free API key from{' '}
          <a
            href="https://enter.pollinations.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            enter.pollinations.ai
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        <div className="space-y-3">
          <Input
            type="password"
            placeholder="sk_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isKeySaved}
            className="font-mono"
          />

          <div className="flex gap-2">
            {!isKeySaved ? (
              <>
                <Button onClick={handleSaveKey} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Key
                </Button>
                <Button variant="outline" onClick={handleTestKey} isLoading={isLoadingBalance}>
                  Test Key
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsKeySaved(false)} className="gap-2">
                  Edit
                </Button>
                <Button variant="danger" onClick={handleRemoveKey} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Balance Display */}
        {isKeySaved && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pollen Balance</span>
              {isLoadingBalance ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : balance !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{balance}</span>
                  <span className="text-sm text-muted-foreground">pollen</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unable to fetch</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pollen refills hourly based on your tier. Check your full account at{' '}
              <a
                href="https://enter.pollinations.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                enter.pollinations.ai
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Preferences Section */}
      <div className="bg-card rounded-xl p-6 border border-input space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>

        <div className="border-t border-input pt-4">
          <Toggle
            checked={autoEnhance}
            onChange={(e) => setAutoEnhance(e.target.checked)}
            label="Auto-enhance prompts"
            description="Automatically improve prompts with AI before generation"
          />
          <Toggle
            checked={safeMode}
            onChange={(e) => setSafeMode(e.target.checked)}
            label="Safe mode by default"
            description="Enable content filtering for all generations"
          />
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-card rounded-xl p-6 border border-input space-y-4">
        <h2 className="text-lg font-semibold text-foreground">About Pollinations</h2>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Pollinations AI provides free access to 38+ AI models for image, video, audio, and text generation.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-foreground font-medium">Free Tier</p>
              <p>0.01-0.15 pollen/hour</p>
            </div>
            <div>
              <p className="text-foreground font-medium">Image Cost</p>
              <p>~1000 images/pollen (Flux)</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <a
            href="https://gen.pollinations.ai/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm inline-flex items-center gap-1"
          >
            API Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-muted-foreground">•</span>
          <a
            href="https://github.com/pollinations/pollinations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm inline-flex items-center gap-1"
          >
            GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
