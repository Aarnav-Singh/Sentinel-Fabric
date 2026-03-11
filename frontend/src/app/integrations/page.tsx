"use client";

import { useState, useCallback } from "react";
import { AddIntegrationModal, IntegrationSettingsModal } from "@/components/features/integrations/IntegrationModals";
import useSWR from "swr";
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Settings2,
    Shield,
    Network,
    Server,
    Cloud,
    Database,
    Search,
    Plus,
    Activity,
    Target,
    RefreshCw,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Types ───────────────────────────────────────────────

interface Integration {
    id: string;
    name: string;
    category: string;
    status: "connected" | "disconnected" | "error";
    lastSync: string;
    icon: React.ElementType;
}

interface ConnectorFromAPI {
    id: string;
    name: string;
    source_type?: string;
    connection_pattern?: string;
    is_active?: boolean;
    status?: string;
    last_sync?: string;
    category?: string;
}

// ─── Demo data ────────────────────────────────────────────

const INITIAL_INTEGRATIONS: Integration[] = [
    { id: "suricata", name: "Suricata IDS/IPS", category: "Network", status: "connected", lastSync: "Just now", icon: Shield },
    { id: "zeek", name: "Zeek Network Security Monitor", category: "Network", status: "connected", lastSync: "2 mins ago", icon: Network },
    { id: "palo-alto", name: "Palo Alto NGFW", category: "Firewall", status: "connected", lastSync: "5 mins ago", icon: Server },
    { id: "crowdstrike", name: "CrowdStrike Falcon", category: "Endpoint", status: "error", lastSync: "1 hour ago", icon: Shield },
    { id: "aws-cloudtrail", name: "AWS CloudTrail", category: "Cloud", status: "connected", lastSync: "12 mins ago", icon: Cloud },
    { id: "azure-ad", name: "Microsoft Entra ID (AD)", category: "Identity", status: "connected", lastSync: "10 mins ago", icon: Database },
    { id: "okta", name: "Okta Identity Cloud", category: "Identity", status: "disconnected", lastSync: "Never", icon: Database },
    { id: "meraki", name: "Cisco Meraki", category: "Network", status: "disconnected", lastSync: "Never", icon: Network },
];

const ICON_BY_CATEGORY: Record<string, React.ElementType> = {
    network: Network,
    firewall: Server,
    endpoint: Shield,
    cloud: Cloud,
    identity: Database,
    default: Activity,
};

// ─── Helpers ─────────────────────────────────────────────

function mapConnector(c: ConnectorFromAPI): Integration {
    const status: Integration['status'] = c.is_active === false
        ? 'disconnected'
        : (c.status as Integration['status']) ?? (c.is_active ? 'connected' : 'disconnected');
    const category = c.category ?? c.source_type ?? 'Network';
    const iconKey = category.toLowerCase();
    const icon = ICON_BY_CATEGORY[iconKey] ?? ICON_BY_CATEGORY.default;
    return {
        id: c.id,
        name: c.name,
        category,
        status,
        lastSync: c.last_sync ?? 'Unknown',
        icon,
    };
}

function SkeletonCard() {
    return (
        <div className="bg-[#101827]/70 backdrop-blur-md p-5 rounded-xl border border-brand-accent/20 animate-pulse flex flex-col gap-3">
            <div className="flex justify-between">
                <div className="w-12 h-12 bg-slate-700/60 rounded-lg" />
                <div className="w-6 h-6 bg-slate-700/40 rounded" />
            </div>
            <div className="h-4 bg-slate-700/60 rounded w-3/4" />
            <div className="h-3 bg-slate-700/40 rounded w-1/2" />
            <div className="h-3 bg-slate-700/30 rounded w-full mt-2" />
        </div>
    );
}

export default function IntegrationsPage() {
    const [localIntegrations, setLocalIntegrations] = useState<Integration[] | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [search, setSearch] = useState('');
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, 'ok' | 'fail'>>({});

    const { data: apiData, isLoading, mutate } = useSWR<ConnectorFromAPI[]>(
        '/api/proxy/api/v1/connectors',
        fetcher,
        { refreshInterval: 15000 }
    );

    // Use API data if non-empty, else fall back to INITIAL_INTEGRATIONS
    const integrations: Integration[] = localIntegrations ?? (
        apiData && Array.isArray(apiData) && apiData.length > 0
            ? apiData.map(mapConnector)
            : INITIAL_INTEGRATIONS
    );

    const filtered = integrations.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteIntegration = useCallback((id: string) => {
        setLocalIntegrations(prev => (prev ?? integrations).filter(i => i.id !== id));
    }, [integrations]);

    const handleTestConnection = useCallback(async (integration: Integration) => {
        setTestingId(integration.id);
        try {
            const res = await fetch('/api/proxy/api/v1/connectors/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connector_id: integration.id }),
            });
            setTestResults(p => ({ ...p, [integration.id]: res.ok ? 'ok' : 'fail' }));
        } catch {
            setTestResults(p => ({ ...p, [integration.id]: 'fail' }));
        } finally {
            setTestingId(null);
        }
    }, []);

    const getStatusIcon = (status: Integration['status']) => {
        switch (status) {
            case 'connected': return <CheckCircle2 className="w-4 h-4 text-sf-green" />;
            case 'disconnected': return <XCircle className="w-4 h-4 text-slate-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-brand-critical" />;
        }
    };

    const getStatusTextClasses = (status: Integration['status']) => {
        switch (status) {
            case 'connected': return 'text-sf-green';
            case 'disconnected': return 'text-slate-500';
            case 'error': return 'text-brand-critical';
        }
    };

    const connectedCount = integrations.filter(i => i.status === 'connected').length;
    const errorCount = integrations.filter(i => i.status === 'error').length;

    return (
        <div className="flex-1 overflow-auto custom-scrollbar bg-[linear-gradient(rgba(0,242,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]">
            <div className="p-6 max-w-7xl mx-auto space-y-8">

                {/* Hero Section: Cyber Infrastructure Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-slate-100 text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-warning" />
                            Global Infrastructure Grid
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                                {connectedCount} CONNECTED
                            </span>
                            {errorCount > 0 && (
                                <span className="text-[10px] font-mono text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20 animate-pulse">
                                    {errorCount} ERROR
                                </span>
                            )}
                            <span className="bg-brand-accent/20 text-brand-accent text-[10px] px-2 py-1 rounded-full border border-brand-accent/30 uppercase tracking-widest font-bold">Live Visualizer</span>
                        </div>
                    </div>

                    <div className="relative w-full aspect-[4/3] md:aspect-[21/9] lg:aspect-[32/9] bg-[#0a0f18] rounded-xl overflow-hidden border border-slate-800 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
                        {/* Abstract Grid Background */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #9ca3af 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 400">
                            <path d="M 200 150 Q 300 200 450 250" fill="none" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                            <path d="M 450 250 Q 600 350 800 300" fill="none" stroke="rgba(0,242,255,0.3)" strokeWidth="1.5" />
                            <path d="M 450 250 Q 350 320 150 280" fill="none" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5" />
                            <path d="M 450 250 Q 550 150 710 120" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" strokeDasharray="2 2" />
                            <path d="M 710 120 Q 800 100 900 180" fill="none" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5" />
                            <path d="M 200 150 Q 150 100 100 150" fill="none" stroke="rgba(0,242,255,0.3)" strokeWidth="1.5" />
                            <path d="M 450 250 L 510 90" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" />
                        </svg>

                        {/* Node Points */}
                        <div className="absolute top-[35%] left-[19%] w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_12px_#00f2ff]" />
                        <div className="absolute top-[61.5%] left-[44.5%] w-3 h-3 rounded-full bg-brand-critical shadow-[0_0_15px_#f43f5e] animate-pulse" />
                        <div className="absolute top-[28.5%] left-[70.5%] w-2 h-2 rounded-full bg-brand-warning shadow-[0_0_12px_#fbbf24]" />
                        <div className="absolute top-[74%] left-[79.5%] w-2.5 h-2.5 rounded-full bg-brand-accent shadow-[0_0_12px_#00f2ff]" />
                        <div className="absolute top-[69%] left-[14.5%] w-2.5 h-2.5 rounded-full bg-slate-500" />
                        <div className="absolute top-[21%] left-[50.5%] w-2.5 h-2.5 rounded-full bg-brand-warning shadow-[0_0_12px_#fbbf24]" />
                        <div className="absolute top-[44%] left-[89.5%] w-2.5 h-2.5 rounded-full bg-brand-critical shadow-[0_0_12px_#f43f5e]" />

                        <div className="absolute top-[20%] left-[80%] w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <div className="absolute top-[50%] left-[30%] w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <div className="absolute top-[80%] left-[50%] w-1 h-1 rounded-full bg-blue-500/50" />
                        <div className="absolute top-[10%] left-[40%] w-1.5 h-1.5 rounded-full bg-red-500/50" />
                        <div className="absolute top-[90%] left-[20%] w-1.5 h-1.5 rounded-full bg-orange-500/50" />

                        {/* Labels */}
                        <div className="absolute top-[64%] left-[45%] -translate-x-1/2 border border-brand-critical/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-critical flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-critical/20 pb-0.5 mb-0.5">THREAT_LVL: CRITICAL</span>
                            <span>SRC_IP: 104.22.7.12</span>
                        </div>
                        <div className="absolute top-[31%] left-[71%] border border-brand-warning/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-warning flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-warning/20 pb-0.5 mb-0.5">NODE: SYD-HUB</span>
                            <span>STATUS: NOMINAL</span>
                        </div>
                        <div className="absolute top-[76%] left-[80%] border border-brand-accent/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-accent flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-accent/20 pb-0.5 mb-0.5">NODE: SYD-CORE-02</span>
                            <span>STATUS: ACTIVE_SYNC</span>
                        </div>
                        <div className="absolute top-[37%] left-[19%] border border-brand-accent/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-accent flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-accent/20 pb-0.5 mb-0.5">NODE: HKD-EDGE-01</span>
                            <span>LATENCY: 342ms</span>
                        </div>
                        <div className="absolute top-[12%] left-[51%] border border-brand-warning/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-warning flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-warning/20 pb-0.5 mb-0.5">NODE: LON-SEC-01</span>
                            <span>LATENCY: 12ms</span>
                            <span className="text-slate-400">ROUTING_UPLINK: ACTIVE</span>
                        </div>

                        {/* Location Data Block */}
                        <div className="absolute bottom-5 left-5 border border-brand-warning/30 bg-[#0d1421]/90 backdrop-blur-md px-4 py-3 rounded-lg text-[10px] sm:text-xs font-mono text-brand-warning flex flex-col gap-1 w-48 sm:w-56 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                            <div className="flex justify-between">
                                <span className="text-slate-500">LAT:</span>
                                <span className="font-bold">34.0522 N</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">LNG:</span>
                                <span className="font-bold">118.2437 W</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-brand-warning/20 font-bold opacity-90 text-center text-brand-critical animate-pulse">
                                THREAT: DDOS_DETECTED
                            </div>
                        </div>

                        {/* Top Controls */}
                        <div className="absolute top-4 right-16 flex gap-2">
                            <button className="bg-[#1f2937]/90 hover:bg-[#374151] backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider text-slate-300 border border-slate-600 transition-colors">
                                OSINT
                            </button>
                            <button className="bg-[#1f2937]/90 hover:bg-[#374151] backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider text-slate-300 border border-slate-600 transition-colors">
                                INTERNAL
                            </button>
                        </div>

                        {/* Zoom/Pan Controls */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-[#1f2937]/90 backdrop-blur-md rounded-lg p-1.5 border border-slate-700 shadow-xl">
                            <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors font-bold text-xl">+</button>
                            <div className="w-6 h-px bg-slate-600 mx-auto my-0.5" />
                            <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors font-bold text-xl">-</button>
                            <div className="w-6 h-px bg-slate-600 mx-auto my-0.5" />
                            <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
                                <Target className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>

                <section>
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                        <h3 className="text-slate-100 text-lg font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-brand-accent" /> Available Integrations
                            <span className="text-sm text-slate-500 font-normal ml-2">({filtered.length})</span>
                        </h3>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search components..."
                                    className="w-full bg-[#111827]/80 backdrop-blur border border-brand-accent/20 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-100 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all placeholder:text-slate-500 shadow-[inset_0_0_10px_rgba(0,242,255,0.05)]"
                                />
                            </div>
                            <button
                                onClick={() => mutate()}
                                title="Refresh"
                                className="p-2 rounded-lg border border-brand-accent/20 text-slate-400 hover:text-brand-accent hover:border-brand-accent/40 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-accent hover:bg-[#00d0db] text-brand-dark px-4 py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] whitespace-nowrap text-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Integration
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {isLoading && localIntegrations === null
                            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                            : filtered.map((integration) => (
                                <div key={integration.id} className="bg-[#101827]/70 backdrop-blur-md p-5 rounded-xl border border-brand-accent/20 hover:border-brand-accent/60 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-brand-dark flex items-center justify-center border border-slate-700 group-hover:border-brand-accent/40 group-hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all text-slate-400 group-hover:text-brand-accent">
                                            <integration.icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {testResults[integration.id] && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${testResults[integration.id] === 'ok' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                                    {testResults[integration.id] === 'ok' ? 'OK' : 'FAIL'}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setSelectedIntegration(integration)}
                                                className="p-1.5 hover:bg-brand-accent/10 rounded-md text-slate-500 hover:text-brand-accent transition-colors border border-transparent hover:border-brand-accent/20"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-slate-100 font-bold text-sm mb-1 group-hover:text-brand-accent transition-colors">{integration.name}</h3>
                                        <p className="text-slate-400 text-xs font-mono">{integration.category}</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-brand-accent/10 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-medium text-[11px]">
                                            {getStatusIcon(integration.status)}
                                            <span className={getStatusTextClasses(integration.status)}>
                                                {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 font-mono">{integration.lastSync}</span>
                                            <button
                                                onClick={() => handleTestConnection(integration)}
                                                disabled={testingId === integration.id}
                                                title="Test connection"
                                                className="text-[9px] text-brand-accent/60 hover:text-brand-accent transition-colors disabled:opacity-50"
                                            >
                                                {testingId === integration.id
                                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                                    : <RefreshCw className="w-3 h-3" />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    {!isLoading && filtered.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No integrations match your search.</p>
                        </div>
                    )}
                </section>

                <section className="pt-4 pb-8">
                    <h3 className="text-slate-100 text-lg font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-accent" /> Tool Health Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#101827]/70 backdrop-blur-md p-5 rounded-xl border border-brand-accent/10 flex items-center gap-5">
                            <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
                                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8" className="text-brand-dark" stroke="currentColor" />
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" className="text-brand-accent drop-shadow-[0_0_5px_rgba(0,242,255,0.6)]" stroke="currentColor" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-accent">75%</div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-slate-100 font-bold">API Latency</p>
                                    <span className="text-xs text-brand-accent font-mono">42ms</span>
                                </div>
                                <p className="text-slate-400 text-xs leading-relaxed">System stability within normal parameters for the last 24h.</p>
                            </div>
                        </div>

                        <div className="bg-[#101827]/70 backdrop-blur-md p-5 rounded-xl border border-brand-accent/10 flex items-center gap-5">
                            <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
                                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8" className="text-brand-dark" stroke="currentColor" />
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={`${251.2 * (1 - connectedCount / Math.max(1, integrations.length))}`}
                                        strokeLinecap="round" className="text-brand-accent/40" stroke="currentColor" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-accent">
                                    {Math.round(connectedCount / Math.max(1, integrations.length) * 100)}%
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-slate-100 font-bold">Sync Integrity</p>
                                    <span className="text-xs text-brand-accent font-mono">{connectedCount}/{integrations.length} online</span>
                                </div>
                                <p className="text-slate-400 text-xs leading-relaxed">Data reconciliation completed for all nodes across the mesh.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <AddIntegrationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            <IntegrationSettingsModal
                integration={selectedIntegration}
                onClose={() => setSelectedIntegration(null)}
                onDelete={handleDeleteIntegration}
            />
        </div>
    );
}
