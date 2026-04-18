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
 <Lock className="w-8 h-8 text-ng-cyan drop-shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
 <div>
 <h2 className="font-headline tracking-widest uppercase text-2xl font-bold text-ng-on text-shadow-cyan">Secure Vault</h2>
 <p className="text-ng-muted text-sm">Credentials and sensitive asset security posture</p>
 </div>
 </div>

 {isLoading ? (
 <div className="animate-pulse bg-ng-mid/60 h-32 rounded-none border border-ng-outline-dim/40" />
 ) : (
 <div className={`ng-surface border ${configured ? 'border-[var(--ng-lime)]/30' : 'border-[var(--ng-magenta)]/30'} p-6 rounded-none flex items-center gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden`}>
 {configured && <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at right, var(--ng-lime), transparent)' }}></div>}
 <div className={`w-16 h-16 rounded-none border bg-ng-base/80 ${configured ? 'border-[var(--ng-lime)]/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-[var(--ng-magenta)]/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'} flex items-center justify-center flex-shrink-0 z-10`}>
 <Lock className={`w-8 h-8 ${configured ? 'text-[var(--ng-lime)] drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'text-[var(--ng-magenta)]'}`} />
 </div>
 <div className="z-10 flex-1">
 <h3 className="text-xl font-bold text-ng-on">
 Vault Status: <span className={configured ? 'text-[var(--ng-lime)]' : 'text-[var(--ng-magenta)]'}>
 {configured ? 'Secure & Connected' : 'Unconfigured'}
 </span>
 </h3>
 <p className="text-ng-muted text-sm mt-1">{statusText}</p>
 {configured && (
 <div className="mt-4 flex gap-4 text-xs font-mono text-ng-muted">
 <span className="bg-ng-mid/50 px-2 py-1 rounded-none border border-ng-outline-dim/40">Mount: {mountPoint}</span>
 <span className="bg-ng-mid/50 px-2 py-1 rounded-none border border-ng-outline-dim/40">Auto-Rotation: Enabled</span>
 </div>
 )}
 {!configured && (
 <div className="mt-5">
 <button className="px-4 py-2 border border-ng-on bg-ng-on hover:bg-transparent text-ng-base hover:text-ng-on transition-colors text-[10px] font-mono tracking-widest uppercase font-bold">
 Configure Vault
 </button>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
