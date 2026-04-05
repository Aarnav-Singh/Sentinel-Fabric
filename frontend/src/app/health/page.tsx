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
                    className="flex items-center gap-2 px-4 py-2 bg-sf-surface hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-600 transition-colors text-xs tracking-wider uppercase disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                    Refresh Node
                </button>
            </div>

            {/* Overall Status Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isLoading ? 'bg-sf-surface/50 border-sf-border' :
                isError ? 'bg-[var(--sf-critical)]/10 border-[var(--sf-critical)]/30' : 'bg-[var(--sf-safe)]/10 border-[var(--sf-safe)]/30'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-inner ${
                        isLoading ? 'bg-slate-700 border-slate-600' :
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* ClickHouse Card */}
                <div className="sf-card p-6 glow-border relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-sf-bg border border-sf-border/50 flex items-center justify-center shadow-inner">
                                <Database className="w-5 h-5 text-[var(--sf-accent)]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">ClickHouse</h3>
                                <p className="text-[10px] text-sf-muted font-mono tracking-widest uppercase">Primary Data Store</p>
                            </div>
                        </div>
                        {renderStatusIcon(data?.components?.clickhouse?.status)}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-sf-border/50 pb-2">
                            <span className="text-xs text-sf-muted font-medium">Event Count</span>
                            <span className="text-sm text-white font-mono font-bold">
                                {isLoading ? '-' : data?.components?.clickhouse?.event_count?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-sf-border/50 pb-2">
                            <span className="text-xs text-sf-muted font-medium">Query Latency</span>
                            <span className="text-sm text-[var(--sf-accent)] font-mono font-bold">
                                {isLoading ? '-' : `${data?.components?.clickhouse?.latency_ms || 0} ms`}
                            </span>
                        </div>
                        
                        {data?.components?.clickhouse?.message && (
                            <div className="mt-2 text-[10px] bg-[var(--sf-critical)]/10 text-[var(--sf-critical)] p-2 rounded border border-[var(--sf-critical)]/20 font-mono">
                                {data.components.clickhouse.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Redis Card */}
                <div className="sf-card p-6 glow-border relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-sf-bg border border-sf-border/50 flex items-center justify-center shadow-inner">
                                <Server className="w-5 h-5 text-[var(--sf-critical)]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Redis Cache</h3>
                                <p className="text-[10px] text-sf-muted font-mono tracking-widest uppercase">Fast Stateful Buffer</p>
                            </div>
                        </div>
                        {renderStatusIcon(data?.components?.redis?.status)}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-sf-border/50 pb-2">
                            <span className="text-xs text-sf-muted font-medium">Ping Latency</span>
                            <span className="text-sm text-[var(--sf-critical)] font-mono font-bold">
                                {isLoading ? '-' : `${data?.components?.redis?.latency_ms || 0} ms`}
                            </span>
                        </div>
                        
                        {data?.components?.redis?.message && (
                            <div className="mt-2 text-[10px] bg-[var(--sf-critical)]/10 text-[var(--sf-critical)] p-2 rounded border border-[var(--sf-critical)]/20 font-mono">
                                {data.components.redis.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Qdrant Card */}
                <div className="sf-card p-6 glow-border relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-sf-bg border border-sf-border/50 flex items-center justify-center shadow-inner">
                                <Layers className="w-5 h-5 text-[var(--sf-accent-2)]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Qdrant Vector DB</h3>
                                <p className="text-[10px] text-sf-muted font-mono tracking-widest uppercase">Behavioral DNA</p>
                            </div>
                        </div>
                        {renderStatusIcon(data?.components?.qdrant?.status)}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-sf-border/50 pb-2">
                            <span className="text-xs text-sf-muted font-medium">Vector Points</span>
                            <span className="text-sm text-white font-mono font-bold">
                                {isLoading ? '-' : data?.components?.qdrant?.vector_count?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-sf-border/50 pb-2">
                            <span className="text-xs text-sf-muted font-medium">Query Latency</span>
                            <span className="text-sm text-[var(--sf-accent-2)] font-mono font-bold">
                                {isLoading ? '-' : `${data?.components?.qdrant?.latency_ms || 0} ms`}
                            </span>
                        </div>
                        
                        {data?.components?.qdrant?.message && (
                            <div className="mt-2 text-[10px] bg-[var(--sf-warning)]/10 text-[var(--sf-warning)] p-2 rounded border border-[var(--sf-warning)]/20 font-mono">
                                {data.components.qdrant.message}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
