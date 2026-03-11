"use client";

import React from 'react';
import useSWR from 'swr';
import { Lock } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function VaultPage() {
  const { data, isLoading } = useSWR('/api/proxy/api/v1/posture/score', fetcher, { refreshInterval: 60000 });
  const composite = data?.composite ?? 0;

  return (
    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-brand-accent drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
            <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.6)]">Secure Vault</h2>
                <p className="text-slate-400 text-sm">Credentials and sensitive asset security posture</p>
            </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse bg-slate-800/60 h-32 rounded-xl" />
        ) : (
          <div className="bg-brand-card/70 border border-brand-accent/20 p-6 rounded-xl flex items-center gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at right, #00f2ff, transparent)' }}></div>
            <div className="w-16 h-16 rounded-full bg-brand-dark/80 border border-brand-accent/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,242,255,0.3)] z-10">
              <Lock className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="z-10">
              <h3 className="text-xl font-bold text-slate-200">Vault Integrity Score: <span className="text-brand-accent">{composite} / 100</span></h3>
              <p className="text-slate-400 text-sm mt-1">Based on global multi-domain evaluation algorithms. Vault is locked and secure.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
