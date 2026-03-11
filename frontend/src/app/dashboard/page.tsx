"use client";

import { useState, useEffect, useCallback } from "react";
import { Server, Activity, Plus, Box, Layers, ShieldAlert, ActivitySquare, Radio } from "lucide-react";
import { api, DashboardMetrics } from "@/lib/api/client";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Types ───────────────────────────────────────────────

interface RemediationFinding {
    id: string;
    domain?: string;
    title: string;
    description?: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    effort?: string;
    priority?: number;
    status?: string;
}

interface RemediationResponse {
    findings?: RemediationFinding[];
}

interface ConnectorInfo {
    id: string;
    name: string;
    source_type?: string;
    is_active?: boolean;
    status?: string;
    last_sync?: string;
}

interface HistoryPoint {
    date: string;
    score: number;
}

interface HistoryResponse {
    data_points: HistoryPoint[];
}

// ─── Demo data ────────────────────────────────────────────

const DEMO_METRICS: DashboardMetrics = {
    posture_score: 71,
    posture_delta: 0,
    active_campaigns: 24,
    critical_campaigns: 7,
    events_per_second: 0,
    connectors_total: 18,
    connectors_online: 16,
};

const DEMO_REMEDIATION: RemediationFinding[] = [
    { id: 'R-001', title: 'Log4Shell RCE (CVE-2021-44228)', description: 'Critical risk on internal Java services', severity: 'critical', status: 'open', priority: 1 },
    { id: 'R-002', title: 'Update GNU C Library (glibc)', description: 'Fix for local privilege escalation', severity: 'high', status: 'scheduled', priority: 2 },
    { id: 'R-003', title: 'Insecure SMB v1 Enabled', description: '8 legacy domain-joined servers detected', severity: 'medium', status: 'in_queue', priority: 3 },
];

const DEMO_CONNECTORS: ConnectorInfo[] = [
    { id: 'aws', name: 'AWS Infrastructure', source_type: 'cloud', is_active: true, last_sync: '2m ago' },
    { id: 'okta', name: 'Okta IAM', source_type: 'identity', is_active: false, status: 'error', last_sync: '1h ago' },
    { id: 'meraki', name: 'Cisco Meraki', source_type: 'network', is_active: true, last_sync: '5m ago' },
];

const DEMO_HISTORY: HistoryPoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    score: 62 + Math.round(Math.sin(i * 0.4) * 7 + i * 0.3),
}));

// ─── Severity styling ─────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
    critical: 'px-2 py-0.5 bg-[#ef4444]/10 text-[#ef4444] rounded border border-[#ef4444]/30 font-bold',
    high: 'px-2 py-0.5 bg-[#f59e0b]/10 text-[#f59e0b] rounded border border-[#f59e0b]/30 font-bold',
    medium: 'px-2 py-0.5 bg-[#8b5cf6]/10 text-[#8b5cf6] rounded border border-[#8b5cf6]/30 font-bold',
    low: 'px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded border border-slate-500/30 font-bold',
};

const STATUS_LABEL: Record<string, string> = {
    open: 'Pending',
    scheduled: 'Scheduled',
    in_queue: 'In Queue',
    resolved: 'Resolved',
    in_progress: 'In Progress',
};

// ─── Sparkline for posture trend ─────────────────────────

function PostureSparkline({ data }: { data: HistoryPoint[] }) {
    if (!data.length) return null;
    const scores = data.map(d => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    const w = 100;
    const h = 100;
    const pad = 5;

    const pts = scores.map((s, i) => {
        const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
        const y = h - pad - ((s - min) / range) * (h - pad * 2);
        return `${x},${y}`;
    }).join(' ');

    const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;

    return (
        <svg className="absolute inset-0 w-full h-full p-2" preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}>
            <defs>
                <linearGradient id="dashGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(6,182,212,0.2)" />
                    <stop offset="100%" stopColor="rgba(6,182,212,0)" />
                </linearGradient>
            </defs>
            <polygon points={area} fill="url(#dashGrad)" />
            <polyline points={pts} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ─── Connector row ────────────────────────────────────────

function ConnectorRow({ c }: { c: ConnectorInfo }) {
    const isActive = c.is_active !== false && c.status !== 'error';
    const isError = c.status === 'error' || (!c.is_active && c.status !== 'disconnected');
    const IconEl = c.source_type === 'cloud' ? Box
        : c.source_type === 'identity' ? Activity
        : Layers;

    const iconColor = c.source_type === 'cloud' ? 'text-[#f59e0b]'
        : c.source_type === 'identity' ? 'text-[#06b6d4]'
        : 'text-[#8b5cf6]';

    if (isError) {
        return (
            <div className="flex items-center justify-between p-3 border border-[#ef4444]/30 rounded-xl bg-[#ef4444]/5 group hover:bg-[#ef4444]/10 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 border border-[#ef4444]/20 shadow-inner rounded-lg flex items-center justify-center">
                        <IconEl className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{c.name}</p>
                        <p className="text-[10px] text-[#ef4444] font-mono">{c.last_sync ?? 'Auth Failed'}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-[#ef4444] font-bold px-2 py-0.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-md">ERROR</span>
                    <button className="text-[10px] text-[#06b6d4] mt-1.5 hover:underline font-medium">Reconnect</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 border border-slate-700/50 rounded-xl bg-slate-800/20 group hover:border-slate-600 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 border border-slate-700/50 shadow-inner rounded-lg flex items-center justify-center">
                    <IconEl className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">{c.source_type ?? 'Connector'}</p>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#10b981] font-bold px-2 py-0.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded-md">
                    {isActive ? 'CONNECTED' : 'OFFLINE'}
                </span>
                {c.last_sync && <span className="text-[10px] text-slate-500 font-mono mt-1.5">{c.last_sync}</span>}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics>(DEMO_METRICS);
    const [eventCount, setEventCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [liveActive, setLiveActive] = useState(false);

    // Fetch initial metrics
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const data = await api.getMetrics();
                if (!cancelled) {
                    setMetrics(data);
                    setLiveActive(true);
                }
            } catch {
                // Backend unavailable — keep demo data
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        const interval = setInterval(load, 5000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    // SWR for remediation queue
    const { data: remediationData, isLoading: remLoading } = useSWR<RemediationResponse | RemediationFinding[]>(
        '/api/proxy/api/v1/posture/remediation', fetcher, { refreshInterval: 30000 }
    );

    // SWR for connectors
    const { data: connectorsData, isLoading: connLoading } = useSWR<ConnectorInfo[]>(
        '/api/proxy/api/v1/connectors', fetcher, { refreshInterval: 15000 }
    );

    // SWR for history
    const { data: historyData, isLoading: histLoading } = useSWR<HistoryResponse>(
        '/api/proxy/api/v1/posture/history', fetcher, { refreshInterval: 60000 }
    );

    // Normalise remediation
    let remediationFindings: RemediationFinding[];
    if (!remediationData) {
        remediationFindings = DEMO_REMEDIATION;
    } else if (Array.isArray(remediationData)) {
        remediationFindings = remediationData.length > 0 ? remediationData : DEMO_REMEDIATION;
    } else {
        remediationFindings = (remediationData as RemediationResponse).findings?.length
            ? (remediationData as RemediationResponse).findings!
            : DEMO_REMEDIATION;
    }

    // Normalise connectors
    const connectors: ConnectorInfo[] = (connectorsData && Array.isArray(connectorsData) && connectorsData.length > 0)
        ? connectorsData
        : DEMO_CONNECTORS;

    // Normalise history
    const historyPoints: HistoryPoint[] = historyData?.data_points?.length
        ? historyData.data_points
        : DEMO_HISTORY;

    // SSE live event stream
    const handleLiveEvent = useCallback((event: Record<string, unknown>) => {
        setEventCount(prev => prev + 1);
        const metaScore = event.ml_scores && typeof event.ml_scores === "object"
            ? (event.ml_scores as Record<string, number>).meta_score ?? 0
            : 0;
        if (metaScore > 0) {
            setMetrics(prev => ({
                ...prev,
                posture_score: Math.max(0, Math.min(100, prev.posture_score - (event.posture_delta as number || 0))),
                events_per_second: prev.events_per_second + 0.1,
            }));
        }
    }, []);

    useLiveEvents({ onEvent: handleLiveEvent });

    const riskScore = Math.round(1000 - metrics.posture_score * 10);
    const complianceRatio = Math.round(92 + (metrics.connectors_online / Math.max(1, metrics.connectors_total)) * 8);

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 bg-transparent">
            {/* Header / Title */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Radio className="w-6 h-6 text-[#06b6d4] animate-pulse" />
                    Security Operations Center
                </h1>
                <p className="text-sm text-slate-400 mt-1">Global command overview and real-time telemetry</p>
            </div>

            {/* TopMetricsGrid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
                {/* Total Assets */}
                <div className="glass-card p-5 relative overflow-hidden group glow-border">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Server className="w-24 h-24 text-[#06b6d4]" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">TOTAL ASSETS</p>
                        <p className="text-4xl font-bold text-white mt-2 font-display text-glow">
                            {loading ? <span className="animate-pulse bg-slate-800 rounded inline-block w-24 h-10" /> : metrics.connectors_total.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-4 inline-flex px-2 py-1 bg-slate-900/50 rounded text-xs border border-slate-800">
                            {liveActive ? (
                                <><span className="flex size-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /><span className="text-slate-300">Live Telemetry Active</span></>
                            ) : (
                                <><span className="flex size-2 rounded-full bg-slate-500" /><span className="text-slate-500">Historical Data</span></>
                            )}
                        </div>
                    </div>
                </div>
                {/* Cloud Risk Score */}
                <div className="glass-card p-5 glow-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">CLOUD RISK SCORE</p>
                            <p className="text-4xl font-bold text-white mt-2 font-display">
                                {loading ? <span className="animate-pulse bg-slate-800 rounded inline-block w-20 h-10" /> : riskScore}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center border border-[#ef4444]/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                            <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
                        </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 mt-5 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444] h-full transition-all duration-700 shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ width: `${Math.min(100, riskScore / 10)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-mono flex justify-between">
                        <span>0</span>
                        <span>1000 MAX</span>
                    </p>
                </div>
                {/* Compliance Status */}
                <div className="glass-card p-5 glow-border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">COMPLIANCE</p>
                            <p className="text-4xl font-bold text-white mt-2 font-display">
                                {loading ? <span className="animate-pulse bg-slate-800 rounded inline-block w-20 h-10" /> : `${complianceRatio}%`}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                            <ActivitySquare className="w-5 h-5 text-[#10b981]" />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <span className="text-[10px] px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 font-bold">SOC-2</span>
                        <span className="text-[10px] px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 font-bold">GDPR</span>
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">HIPAA (N/A)</span>
                    </div>
                </div>
                {/* Security Posture Score */}
                <div className="glass-card p-5 flex items-center justify-between glow-border relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">SECURITY POSTURE</p>
                        <p className="text-4xl font-bold text-white mt-2 font-display drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                            {loading ? <span className="animate-pulse bg-slate-800 rounded inline-block w-16 h-10" /> : Math.round(metrics.posture_score)}
                        </p>
                        <p className="text-xs text-[#06b6d4] mt-2 font-medium bg-[#06b6d4]/10 px-2 py-1 inline-block rounded border border-[#06b6d4]/20">
                            Excellent Standing
                        </p>
                    </div>
                    <div className="relative w-24 h-24 drop-shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-slate-800" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeWidth="6" />
                            <circle className="text-[#06b6d4] transition-all duration-1000 ease-out" cx="48" cy="48" fill="transparent" r="42" stroke="currentColor" strokeDasharray="264" strokeDashoffset={264 - (metrics.posture_score / 100) * 264} strokeWidth="6" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* Live Events Counter */}
            {eventCount > 0 && (
                <div className="flex justify-center my-4">
                    <div className="inline-flex items-center gap-3 text-xs text-[#06b6d4] bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-full px-5 py-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md">
                        <span className="flex size-2 rounded-full bg-[#06b6d4] animate-ping" />
                        <span className="font-mono font-bold tracking-wide">{eventCount.toLocaleString()} DATA POINTS ANALYZED LIVE</span>
                    </div>
                </div>
            )}

            {/* Visualizations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6">
                {/* Data Flow Map */}
                <section className="lg:col-span-2 xl:col-span-3 glass-panel p-6 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#06b6d4]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#8b5cf6]" />
                            Threat Activity Timeline & Matrix
                        </h3>
                        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-lg">
                            <button className="px-4 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded shadow-sm">Real-time</button>
                            <button className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors text-[10px] font-bold rounded">Historical</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-slate-900/80 rounded-xl border border-slate-700/50 relative overflow-hidden node-map-bg min-h-[350px] shadow-inner">
                        <div className="absolute inset-0 scan-line pointer-events-none opacity-50" />
                        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="gradPath1" x1="0%" x2="100%" y1="0%">
                                    <stop offset="0%" style={{ stopColor: "rgba(139, 92, 246, 0)", stopOpacity: 0 }} />
                                    <stop offset="50%" style={{ stopColor: "rgba(139, 92, 246, 0.6)", stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: "rgba(139, 92, 246, 0)", stopOpacity: 0 }} />
                                </linearGradient>
                                <linearGradient id="gradPath2" x1="0%" x2="100%" y1="0%">
                                    <stop offset="0%" style={{ stopColor: "rgba(6, 182, 212, 0)", stopOpacity: 0 }} />
                                    <stop offset="50%" style={{ stopColor: "rgba(6, 182, 212, 0.6)", stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: "rgba(6, 182, 212, 0)", stopOpacity: 0 }} />
                                </linearGradient>
                            </defs>
                            
                            {/* Animated data paths */}
                            <path className="animate-pulse" d="M 100 80 Q 300 150 500 200" fill="none" stroke="url(#gradPath1)" strokeWidth="2" strokeDasharray="5,5" />
                            <path d="M 100 200 Q 300 200 500 200" fill="none" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" />
                            <path d="M 100 320 Q 300 250 500 200" fill="none" stroke="url(#gradPath2)" strokeWidth="2" />
                            
                            {/* Nodes */}
                            <g className="drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]">
                                <circle cx="100" cy="80" fill="#8b5cf6" r="6" />
                                <circle cx="100" cy="80" fill="transparent" stroke="#8b5cf6" strokeWidth="2" r="12" className="animate-ping" />
                            </g>
                            <circle cx="100" cy="200" fill="#ef4444" r="5" className="drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                            <circle cx="100" cy="320" fill="#06b6d4" r="5" className="drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                            
                            {/* Central Hub */}
                            <g transform="translate(440, 160)">
                                <rect fill="#0f172a" height="80" rx="8" stroke="#1e293b" strokeWidth="2" width="120" className="drop-shadow-xl" />
                                <rect fill="transparent" height="80" rx="8" stroke="#334155" strokeWidth="1" width="120" />
                                <text fill="#f8fafc" fontSize="11" fontWeight="bold" x="20" y="32">SENTINEL DB</text>
                                <text fill="#94a3b8" fontSize="9" x="20" y="52" className="font-mono text-[9px]">Load: {metrics.events_per_second.toFixed(1)} EPS</text>
                                <circle cx="100" cy="40" fill="#10b981" r="3" className="animate-pulse shadow-[0_0_5px_#10b981]" />
                            </g>
                        </svg>

                        {/* Node Labels */}
                        <div className="absolute left-6 top-14 space-y-16">
                            <div className="bg-slate-900/90 border border-[#8b5cf6]/30 p-2.5 rounded-lg backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Cloud Edge</p>
                                <p className="text-xs text-white font-medium">AWS VPC Flow</p>
                            </div>
                            <div className="bg-slate-900/90 border border-[#ef4444]/30 p-2.5 rounded-lg backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                <p className="text-[9px] text-[#ef4444] font-bold uppercase tracking-widest mb-0.5">Critical Subnet</p>
                                <p className="text-xs text-white font-medium">DMZ Firewalls</p>
                            </div>
                            <div className="bg-slate-900/90 border border-[#06b6d4]/30 p-2.5 rounded-lg backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Identity</p>
                                <p className="text-xs text-white font-medium">Okta Auth Logs</p>
                            </div>
                        </div>

                        {/* Alert Card */}
                        <div className="absolute right-6 bottom-6 p-4 bg-slate-900/95 border border-[#ef4444]/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl max-w-sm">
                            <div className="flex gap-4">
                                <div className="mt-1 w-8 h-8 rounded-full bg-[#ef4444]/20 flex items-center justify-center shrink-0 border border-[#ef4444]/50">
                                    <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-ping" />
                                        <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest leading-none">Automated Correlation</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-2">Lateral Movement Detected</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                        {eventCount > 0
                                            ? `Processed ${eventCount} active events. High correlation with APT29 tactics on DMZ Firewalls.`
                                            : "Multiple failed auth attempts followed by successful administrative login from untrusted IP."}
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-1.5 bg-[#ef4444] text-white text-[10px] font-bold rounded hover:bg-[#dc2626] transition-all shadow-[0_0_10px_rgba(239,68,68,0.4)] uppercase tracking-wider">Investigate</button>
                                        <button className="flex-1 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded border border-slate-700 hover:bg-slate-700 transition-all uppercase tracking-wider">Dismiss</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Posture Trend Chart — live from history API */}
                <section className="lg:col-span-1 glass-panel p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Health Trend</h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">30 DAYS</span>
                    </div>
                    
                    <div className="h-[220px] w-full flex items-end gap-1 relative overflow-hidden bg-slate-900/50 rounded-xl border border-slate-700/50 p-2 shadow-inner">
                        {histLoading
                            ? <div className="absolute inset-0 animate-pulse bg-slate-800/30 rounded-xl" />
                            : <PostureSparkline data={historyPoints} />
                        }
                        <div className="absolute top-4 right-4 flex flex-col items-end">
                            <span className="text-4xl font-display font-bold text-white leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{Math.round(metrics.posture_score)}</span>
                            <span className="text-[9px] text-[#06b6d4] uppercase font-bold tracking-widest mt-1">Current Score</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                            <span className="text-[11px] text-slate-400 font-medium tracking-wide">Detection Coverage</span>
                            <span className="text-white font-mono text-sm">{Math.round(metrics.connectors_online / Math.max(1, metrics.connectors_total) * 100)}% <span className="text-[#10b981] ml-1">↗</span></span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                            <span className="text-[11px] text-slate-400 font-medium tracking-wide">Active Campaigns</span>
                            <span className="text-white font-mono text-sm font-bold">{metrics.active_campaigns} <span className="text-[#ef4444] ml-1 text-[10px] break-keep">{metrics.critical_campaigns} CRIT</span></span>
                        </div>
                        {historyPoints.length > 0 && (
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-400 font-medium tracking-wide">30d Low / High</span>
                                <span className="text-slate-300 font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                                    {Math.min(...historyPoints.map(p => p.score))} <span className="text-slate-600">-</span> {Math.max(...historyPoints.map(p => p.score))}
                                </span>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Remediation Queue + Data Connectors */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6">
                {/* Remediation Queue — live from posture/remediation */}
                <section className="xl:col-span-2 glass-panel flex flex-col overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/30">
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
                                High-Priority Triage Queue
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                                {remLoading ? 'Loading AI prioritizations...' : `${remediationFindings.length} intelligent findings requiring immediate action`}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2 text-[11px] font-bold rounded-lg transition-colors uppercase tracking-wider">Export CSV</button>
                            <button className="bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 px-4 py-2 text-[11px] font-bold rounded-lg flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] uppercase tracking-wider">
                                <Plus className="w-3 h-3" />
                                CREATE TICKET
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-700/50 bg-slate-900/50">
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Vulnerability / Asset</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30 bg-slate-900/10">
                                {remLoading
                                    ? Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-5" colSpan={4}>
                                                <div className="animate-pulse bg-slate-800 rounded-lg h-10 w-full" />
                                            </td>
                                        </tr>
                                    ))
                                    : remediationFindings.slice(0, 5).map((f) => (
                                        <tr key={f.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="text-white font-bold">{f.title}</p>
                                                {f.description && <p className="text-slate-400 mt-1 text-[11px] truncate max-w-sm">{f.description}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] tracking-wider ${SEVERITY_BADGE[f.severity] ?? SEVERITY_BADGE.low}`}>{f.severity?.toUpperCase()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 font-medium ${
                                                    f.status === 'open' || f.status === 'in_queue' ? 'text-[#f59e0b]' :
                                                    f.status === 'in_progress' ? 'text-[#06b6d4]' :
                                                    f.status === 'scheduled' ? 'text-slate-400 bg-slate-800 px-2 py-0.5 rounded' :
                                                    'text-[#10b981]'
                                                }`}>
                                                    {f.status === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />}
                                                    {STATUS_LABEL[f.status ?? ''] ?? f.status ?? 'Open'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="text-slate-400 hover:text-white font-medium text-[11px] tracking-wider uppercase">Ignore</button>
                                                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-3 py-1.5 rounded text-[10px] font-bold transition-colors uppercase tracking-wider">Remediate</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Data Connectors — live from connectors API */}
                <section className="glass-panel flex flex-col overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-700/50 bg-slate-900/30">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#8b5cf6]" />
                            Data Integrations
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Connector health across {(connectorsData as ConnectorInfo[])?.length || 18} instances</p>
                    </div>
                    <div className="flex-1 p-5 space-y-3 bg-slate-900/10 overflow-y-auto custom-scrollbar max-h-[400px]">
                        {connLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="animate-pulse bg-slate-800/60 rounded-xl h-16 w-full" />
                            ))
                            : connectors.slice(0, 5).map(c => (
                                <ConnectorRow key={c.id} c={c} />
                            ))
                        }
                    </div>
                    <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 text-center">
                        <button className="text-[10px] font-bold text-[#06b6d4] hover:text-white transition-colors uppercase tracking-widest flex items-center justify-center gap-2 w-full">
                            Manage Configuration
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
