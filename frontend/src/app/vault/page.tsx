"use client";

import React from 'react';
import useSWR from 'swr';
import { Lock } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function VaultPage() {
  const { data, isLoading } = useSWR('/api/proxy/api/v1/vault/status', fetcher, { refreshInterval: 60000 });
  const configured = data?.configured ?? false;
  const statusText = configured ? `Connected to ${data?.url}` : 'Vault integration not configured';
  const mountPoint = data?.mount_point ?? '';

  return (
    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-sf-accent drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
            <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.6)]">Secure Vault</h2>
                <p className="text-sf-muted text-sm">Credentials and sensitive asset security posture</p>
            </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse bg-sf-surface/60 h-32 rounded-xl" />
        ) : (
          <div className={`bg-sf-surface/70 border ${configured ? 'border-emerald-500/30' : 'border-amber-500/30'} p-6 rounded-xl flex items-center gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden`}>
            {configured && <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at right, var(--sf-safe), transparent)' }}></div>}
            <div className={`w-16 h-16 rounded-full bg-sf-bg/80 border ${configured ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'} flex items-center justify-center flex-shrink-0 z-10`}>
              <Lock className={`w-8 h-8 ${configured ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-amber-400'}`} />
            </div>
            <div className="z-10 flex-1">
              <h3 className="text-xl font-bold text-slate-200">
                Vault Status: <span className={configured ? 'text-emerald-400' : 'text-amber-400'}>
                  {configured ? 'Secure & Connected' : 'Unconfigured'}
                </span>
              </h3>
              <p className="text-sf-muted text-sm mt-1">{statusText}</p>
              {configured && (
                <div className="mt-4 flex gap-4 text-xs font-mono text-sf-muted">
                  <span className="bg-sf-surface/50 px-2 py-1 rounded border border-sf-border">Mount: {mountPoint}</span>
                  <span className="bg-sf-surface/50 px-2 py-1 rounded border border-sf-border">Auto-Rotation: Enabled</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
