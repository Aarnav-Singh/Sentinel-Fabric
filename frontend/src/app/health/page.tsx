"use client";

import useSWR from "swr";
import { Activity, Server, Database, Layers, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface HealthComponent {
 status: 'ok' | 'error' | 'disabled';
 message?: string;
 latency_ms?: number;
 event_count?: number;
 vector_count?: number;
}

interface DeepHealthResponse {
 status: 'healthy' | 'degraded';
 components: Record<string, HealthComponent>;
}

export default function HealthDashboardPage() {
 const { data, error, isValidating, mutate } = useSWR<DeepHealthResponse>(
 '/api/proxy/api/v1/health/deep',
 fetcher,
 { refreshInterval: 5000, keepPreviousData: true }
 );

 const isLoading = !data && !error;
 const isError = error || (data?.status === 'degraded');

 const renderStatusIcon = (status?: string) => {
 if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-[var(--ng-lime)]" />;
 if (status === 'error') return <XCircle className="w-5 h-5 text-[var(--ng-error)]" />;
 if (status === 'disabled') return <AlertTriangle className="w-5 h-5 text-[var(--ng-magenta)]" />;
 return <Activity className="w-5 h-5 text-ng-muted" />;
 };

 return (
 <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 bg-transparent">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="font-headline tracking-widest uppercase text-2xl font-bold text-ng-on tracking-tight flex items-center gap-3">
 <Activity className="w-6 h-6 text-[var(--ng-lime)]" />
 System Health Overview
 </h1>
 <p className="text-sm text-ng-muted mt-1">Real-time infrastructure status and latencies</p>
 </div>
 <button 
 onClick={() => mutate()} 
 disabled={isValidating}
 className="flex items-center gap-2 px-4 py-2 bg-ng-mid hover:bg-ng-mid/50 text-ng-on font-bold rounded-none border border-ng-outline-dim/40 transition-colors text-[10px] tracking-widest font-mono uppercase disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
 Refresh Node
 </button>
 </div>

 {/* Overall Status Banner */}
 <div className={`p-4 rounded-none ng-surface border flex items-center justify-between ${
 isLoading ? 'bg-ng-mid/50 border-ng-outline-dim/40' :
 isError ? 'bg-[var(--ng-error)]/10 border-[var(--ng-error)]/30' : 'bg-[var(--ng-lime)]/10 border-[var(--ng-lime)]/30'
 }`}>
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-none flex items-center justify-center border shadow-inner ${
 isLoading ? 'bg-ng-mid border-ng-outline-dim/40' :
 isError ? 'bg-[var(--ng-error)]/20 border-[var(--ng-error)]/50' : 'bg-[var(--ng-lime)]/20 border-[var(--ng-lime)]/50'
 }`}>
 {isLoading ? <Activity className="w-6 h-6 text-ng-muted" /> :
 isError ? <XCircle className="w-6 h-6 text-[var(--ng-error)]" /> :
 <CheckCircle2 className="w-6 h-6 text-[var(--ng-lime)]" />}
 </div>
 <div>
 <h2 className="font-headline tracking-widest uppercase text-lg font-bold text-ng-on tracking-wide">
 {isLoading ? 'Scanning Infrastructure...' : 
 isError ? 'System Degraded' : 'All Systems Operational'}
 </h2>
 <p className={`text-xs font-mono mt-1 ${
 isLoading ? 'text-ng-muted' : 
 isError ? 'text-[var(--ng-error)]' : 'text-[var(--ng-lime)]'
 }`}>
 Current Status: {isLoading ? 'SCANNING' : isError ? 'DEGRADED' : data?.status?.toUpperCase() || 'UNKNOWN'}
 </p>
 </div>
 </div>
 </div>

 {/* Components Grid */}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {Object.entries(data?.components || {}).map(([name, svc]: [string, any]) => (
 <div key={name} className="ng-surface p-4">
 <div className="flex items-center justify-between mb-2">
 <span className="text-[12px] text-ng-on font-bold uppercase tracking-widest font-mono">{name}</span>
 <span className={`text-[9px] font-mono px-1.5 py-0.5 border uppercase ${
 svc.status === 'ok' || svc.status === 'healthy' ? 'border-ng-lime text-ng-lime bg-ng-lime/10' :
 svc.status === 'degraded' || svc.status === 'error' ? 'border-ng-error text-ng-error bg-ng-error/10' :
 'border-ng-magenta text-ng-magenta bg-ng-magenta/10'
 }`}>{svc.status}</span>
 </div>
 {svc.latency_ms !== undefined && (
 <div className="text-[11px] font-mono text-ng-muted tracking-widest mt-2">{svc.latency_ms} ms</div>
 )}
 {svc.event_count !== undefined && (
 <div className="text-[10px] font-mono text-ng-muted mt-1">Events: {svc.event_count.toLocaleString()}</div>
 )}
 {svc.vector_count !== undefined && (
 <div className="text-[10px] font-mono text-ng-muted mt-1">Vectors: {svc.vector_count.toLocaleString()}</div>
 )}
 {svc.message && (
 <div className="text-[9px] font-mono text-ng-muted mt-2 uppercase line-clamp-2">{svc.message}</div>
 )}
 </div>
 ))}
 </div>
 </div>
 );
}
