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
        if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-[var(--sf-safe)]" />;
        if (status === 'error') return <XCircle className="w-5 h-5 text-[var(--sf-critical)]" />;
        if (status === 'disabled') return <AlertTriangle className="w-5 h-5 text-[var(--sf-warning)]" />;
        return <Activity className="w-5 h-5 text-sf-muted" />;
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Activity className="w-6 h-6 text-[var(--sf-safe)]" />
                        System Health Overview
                    </h1>
                    <p className="text-sm text-sf-muted mt-1">Real-time infrastructure status and latencies</p>
                </div>
                <button 
                    onClick={() => mutate()} 
                    disabled={isValidating}
                    className="flex items-center gap-2 px-4 py-2 bg-sf-surface hover:bg-sf-surface/50 text-white font-bold rounded-none border border-sf-border transition-colors text-[10px] tracking-widest font-mono uppercase disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                    Refresh Node
                </button>
            </div>

            {/* Overall Status Banner */}
            <div className={`p-4 rounded-none sf-panel border flex items-center justify-between ${
                isLoading ? 'bg-sf-surface/50 border-sf-border' :
                isError ? 'bg-[var(--sf-critical)]/10 border-[var(--sf-critical)]/30' : 'bg-[var(--sf-safe)]/10 border-[var(--sf-safe)]/30'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-none flex items-center justify-center border shadow-inner ${
                        isLoading ? 'bg-sf-surface border-sf-border' :
                        isError ? 'bg-[var(--sf-critical)]/20 border-[var(--sf-critical)]/50' : 'bg-[var(--sf-safe)]/20 border-[var(--sf-safe)]/50'
                    }`}>
                        {isLoading ? <Activity className="w-6 h-6 text-sf-muted" /> :
                         isError ? <XCircle className="w-6 h-6 text-[var(--sf-critical)]" /> :
                         <CheckCircle2 className="w-6 h-6 text-[var(--sf-safe)]" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide">
                            {isLoading ? 'Scanning Infrastructure...' : 
                             isError ? 'System Degraded' : 'All Systems Operational'}
                        </h2>
                        <p className={`text-xs font-mono mt-1 ${
                            isLoading ? 'text-sf-muted' : 
                            isError ? 'text-[var(--sf-critical)]' : 'text-[var(--sf-safe)]'
                        }`}>
                            Current Status: {isLoading ? 'SCANNING' : isError ? 'DEGRADED' : data?.status?.toUpperCase() || 'UNKNOWN'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Components Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(data?.components || {}).map(([name, svc]: [string, any]) => (
                    <div key={name} className="sf-panel p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] text-sf-text font-bold uppercase tracking-widest font-mono">{name}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 border uppercase ${
                                svc.status === 'ok' || svc.status === 'healthy' ? 'border-sf-safe text-sf-safe bg-sf-safe/10' :
                                svc.status === 'degraded' || svc.status === 'error' ? 'border-sf-critical text-sf-critical bg-sf-critical/10' :
                                'border-sf-warning text-sf-warning bg-sf-warning/10'
                            }`}>{svc.status}</span>
                        </div>
                        {svc.latency_ms !== undefined && (
                            <div className="text-[11px] font-mono text-sf-muted tracking-widest mt-2">{svc.latency_ms} ms</div>
                        )}
                        {svc.event_count !== undefined && (
                            <div className="text-[10px] font-mono text-sf-muted mt-1">Events: {svc.event_count.toLocaleString()}</div>
                        )}
                        {svc.vector_count !== undefined && (
                            <div className="text-[10px] font-mono text-sf-muted mt-1">Vectors: {svc.vector_count.toLocaleString()}</div>
                        )}
                        {svc.message && (
                           <div className="text-[9px] font-mono text-sf-muted mt-2 uppercase line-clamp-2">{svc.message}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
