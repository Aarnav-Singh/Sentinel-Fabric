"use client";

import { useState, useCallback, useRef } from "react";
import { AddIntegrationModal, IntegrationSettingsModal } from "@/components/features/integrations/IntegrationModals";
import useSWR from "swr";
import {
    Activity,
    Target,
    RefreshCw,
    Network,
    Server,
    Cloud,
    Database,
    Shield,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Settings2,
    Search,
    Plus
} from "lucide-react";
import { PanelCard, ShimmerSkeleton, AnimatedNumber } from "@/components/ui/MotionWrappers";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Integration { id: string; name: string; category: string; status: "connected" | "disconnected" | "error"; lastSync: string; icon: React.ElementType; }
interface ConnectorFromAPI { id: string; name: string; source_type?: string; connection_pattern?: string; is_active?: boolean; status?: string; last_sync?: string; category?: string; }

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
    network: Network, firewall: Server, endpoint: Shield, cloud: Cloud, identity: Database, default: Activity,
};

function mapConnector(c: ConnectorFromAPI): Integration {
    const status: Integration['status'] = c.is_active === false ? 'disconnected' : (c.status as Integration['status']) ?? (c.is_active ? 'connected' : 'disconnected');
    const category = c.category ?? c.source_type ?? 'Network';
    const icon = ICON_BY_CATEGORY[category.toLowerCase()] ?? ICON_BY_CATEGORY.default;
    return { id: c.id, name: c.name, category, status, lastSync: c.last_sync ?? 'Unknown', icon };
}

function SkeletonCard() {
    return (
        <PanelCard className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <ShimmerSkeleton className="w-10 h-10 border border-sf-border" />
                <ShimmerSkeleton className="w-6 h-6 border border-sf-border" />
            </div>
            <div className="flex-1 mt-2 space-y-2">
                <ShimmerSkeleton className="h-4 w-3/4" />
                <ShimmerSkeleton className="h-3 w-1/2" />
            </div>
        </PanelCard>
    );
}

export default function IntegrationsPage() {
    const [localIntegrations, setLocalIntegrations] = useState<Integration[] | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [search, setSearch] = useState('');
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, 'ok' | 'fail'>>({});
    
    const [zoomScale, setZoomScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [liveMode, setLiveMode] = useState(true);
    const dragStart = useRef({ x: 0, y: 0 });

    const { data: apiData, isLoading, mutate } = useSWR<ConnectorFromAPI[]>('/api/proxy/api/v1/connectors', fetcher, { refreshInterval: 15000 });

    const integrations: Integration[] = localIntegrations ?? (
        apiData && Array.isArray(apiData) && apiData.length > 0 ? apiData.map(mapConnector) : INITIAL_INTEGRATIONS
    );

    const filtered = integrations.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));

    const handleDeleteIntegration = useCallback((id: string) => { setLocalIntegrations(prev => (prev ?? integrations).filter(i => i.id !== id)); }, [integrations]);

    const handleTestConnection = useCallback(async (integration: Integration) => {
        setTestingId(integration.id);
        try {
            const res = await fetch('/api/proxy/api/v1/connectors/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ connector_id: integration.id }) });
            setTestResults(p => ({ ...p, [integration.id]: res.ok ? 'ok' : 'fail' }));
        } catch {
            setTestResults(p => ({ ...p, [integration.id]: 'fail' }));
        } finally {
            setTestingId(null);
        }
    }, []);

    const connectedCount = integrations.filter(i => i.status === 'connected').length;
    const errorCount = integrations.filter(i => i.status === 'error').length;

    return (
        <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-sf-bg flex flex-col min-h-0 space-y-4">
            <div className="flex flex-col gap-4 w-full max-w-[1600px] mx-auto min-h-0">

                {/* Hero Section: Cyber Infrastructure Grid */}
                <PanelCard className="flex flex-col p-0 overflow-hidden shrink-0 border border-sf-border shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                    <div className="p-3 border-b border-sf-border bg-sf-surface flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 bg-sf-warning animate-pulse-fast border border-sf-warning/50 rounded-none" />
                            <h2 className="text-[11px] font-mono tracking-widest text-sf-text uppercase flex items-center gap-2">
                                Global Infrastructure Topology
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-sf-safe px-2 py-0.5 border border-sf-border bg-sf-bg">
                                {connectedCount} CONNECTED
                            </span>
                            {errorCount > 0 && (
                                <span className="text-[10px] font-mono text-sf-critical px-2 py-0.5 border border-sf-critical bg-sf-critical/10 shadow-[0_0_10px_var(--sf-critical)] animate-pulse-fast">
                                    {errorCount} ERROR
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="relative w-full h-[400px] bg-sf-bg overflow-hidden cursor-crosshair border-b border-sf-border"
                         onMouseDown={(e) => { setIsDragging(true); dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }; }}
                         onMouseMove={(e) => { if (!isDragging) return; setPanOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }}
                         onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
                    >
                         {/* Grid Background */}
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                        <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.15s linear' }} className="w-full h-full absolute inset-0 pointer-events-none">
                             {/* Network Lines */}
                             <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 400">
                                {/* Base Grid lines */}
                                <line x1="500" y1="200" x2="500" y2="80" stroke="var(--sf-accent)" strokeWidth="1" strokeDasharray="4 2" className="opacity-50" />
                                <line x1="500" y1="200" x2="300" y2="300" stroke="var(--sf-accent)" strokeWidth="1" strokeDasharray="4 2" className="opacity-50" />
                                <line x1="500" y1="200" x2="700" y2="300" stroke="var(--sf-accent)" strokeWidth="1" strokeDasharray="4 2" className="opacity-50" />
                                
                                {/* Data streams */}
                                <line x1="500" y1="200" x2="250" y2="120" stroke="var(--sf-safe)" strokeWidth="1.5" className={liveMode ? "animate-pulse" : ""} />
                                <line x1="500" y1="200" x2="750" y2="120" stroke="var(--sf-warning)" strokeWidth="1.5" className={liveMode ? "animate-pulse-fast" : ""} />
                                <line x1="750" y1="120" x2="850" y2="250" stroke="var(--sf-border)" strokeWidth="1" />
                            </svg>

                            {/* Nodes */}
                            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <div className="p-3 border border-sf-accent bg-sf-bg shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                                    <Activity className="w-5 h-5 text-sf-accent" />
                                </div>
                                <div className="mt-2 text-[9px] font-bold tracking-widest bg-sf-surface px-2 py-0.5 border border-sf-border text-sf-text">CENTRAL_HUB</div>
                            </div>

                            <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <div className="p-2 border border-sf-safe bg-sf-bg">
                                    <Server className="w-4 h-4 text-sf-safe" />
                                </div>
                                <div className="mt-1 text-[8px] font-mono tracking-widest text-sf-muted">US-EAST-1</div>
                            </div>

                            <div className="absolute top-[75%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <div className="p-2 border border-sf-border bg-sf-bg">
                                    <Network className="w-4 h-4 text-sf-text" />
                                </div>
                                <div className="mt-1 text-[8px] font-mono tracking-widest text-sf-muted">EDGE_ROUTER</div>
                            </div>
                            
                            <div className="absolute top-[75%] left-[70%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <div className="p-2 border border-sf-warning bg-sf-bg">
                                    <Database className="w-4 h-4 text-sf-warning" />
                                </div>
                                <div className="mt-1 text-[8px] font-mono tracking-widest text-sf-muted">RDS_CLUSTER</div>
                            </div>
                            
                            <div className="absolute top-[30%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <div className="p-2 border border-sf-safe bg-sf-bg shadow-[0_0_10px_var(--sf-safe)]">
                                    <Cloud className="w-4 h-4 text-sf-safe" />
                                </div>
                                <div className="mt-1 text-[8px] font-mono tracking-widest text-sf-muted">AWS_PROD</div>
                            </div>

                            <div className="absolute top-[30%] left-[75%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <div className="p-2 border border-sf-critical bg-sf-bg">
                                    <Shield className="w-4 h-4 text-sf-critical" />
                                </div>
                                <div className="mt-1 text-[8px] font-mono tracking-widest text-sf-muted">FW_PRIMARY</div>
                            </div>

                        </div>
                        
                        {/* Overlay Controls */}
                        <div className="absolute top-3 right-3 flex gap-2">
                             <button onClick={() => setIsAddModalOpen(true)} className="bg-sf-surface border border-sf-border hover:border-sf-accent px-3 py-1.5 text-[9px] font-bold text-sf-text uppercase tracking-widest flex items-center gap-2 transition-colors">
                                <Plus className="w-3 h-3" /> Add Component
                            </button>
                        </div>
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <span className="text-[9px] text-sf-muted font-mono bg-sf-bg border border-sf-border px-2 py-1 flex gap-2"><span className="text-sf-accent">ZOOM</span> {Math.round(zoomScale * 100)}%</span>
                            <span className="text-[9px] text-sf-muted font-mono bg-sf-bg border border-sf-border px-2 py-1 flex gap-2"><span className="text-sf-accent">PAN</span> X:{Math.round(panOffset.x)} Y:{Math.round(panOffset.y)}</span>
                        </div>
                        <div className="absolute bottom-3 right-3 flex gap-2">
                             <button onClick={() => { setZoomScale(1); setPanOffset({x:0, y:0}); }} title="Recenter View" className="bg-sf-surface border border-sf-border px-2 py-1 text-sf-muted hover:text-sf-text">
                                <Target className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setLiveMode(!liveMode)} title="Toggle Streams" className={`border px-2 py-1 ${liveMode ? 'bg-sf-accent/10 border-sf-accent text-sf-accent' : 'bg-sf-surface border-sf-border text-sf-muted'}`}>
                                <Activity className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </PanelCard>

                {/* Integrations Grid Section */}
                <PanelCard className="flex flex-col flex-1 p-0 min-h-0 border-none shadow-none bg-transparent">
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 shrink-0 border-b border-sf-border mb-4">
                        <h3 className="text-sf-text text-[14px] font-bold uppercase tracking-widest flex items-center gap-2 font-mono">
                            <Database className="w-4 h-4 text-sf-accent" /> Integration Modules 
                            <span className="text-[10px] text-sf-muted font-normal">({filtered.length})</span>
                        </h3>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sf-muted" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="SEARCH MODULES..."
                                    className="w-full bg-sf-surface border border-sf-border rounded-none py-2 pl-9 pr-4 text-[10px] font-mono text-sf-text focus:border-sf-accent outline-none transition-colors placeholder:text-sf-muted/50"
                                />
                            </div>
                            <button onClick={() => mutate()} title="Refresh" className="p-2 border border-sf-border text-sf-muted hover:text-sf-text bg-sf-surface">
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 border border-sf-accent bg-sf-accent/10 hover:bg-sf-accent hover:text-black text-sf-accent px-4 py-2 font-bold transition-colors font-mono text-[10px] uppercase tracking-widest">
                                <Plus className="w-3.5 h-3.5" /> Add Module
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                        {isLoading && localIntegrations === null
                            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                            : filtered.map((integration) => (
                                <PanelCard key={integration.id} className="p-4 flex flex-col group hover:border-sf-accent/50 hover:shadow-[0_0_15px_rgba(0,242,255,0.05)] cursor-pointer">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-sf-surface flex items-center justify-center border border-sf-border group-hover:border-sf-accent text-sf-muted group-hover:text-sf-accent transition-colors">
                                            <integration.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {testResults[integration.id] && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 tracking-widest uppercase border ${testResults[integration.id] === 'ok' ? 'text-sf-safe border-sf-safe bg-sf-safe/10' : 'text-sf-critical border-sf-critical bg-sf-critical/10'}`}>
                                                    {testResults[integration.id] === 'ok' ? 'OK' : 'FAIL'}
                                                </span>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedIntegration(integration); }} className="p-1.5 hover:bg-sf-surface border border-transparent hover:border-sf-border text-sf-muted hover:text-sf-text transition-colors">
                                                <Settings2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-sf-text font-bold text-[11px] uppercase tracking-widest mb-1 font-mono">{integration.name}</h3>
                                        <p className="text-sf-muted text-[10px] font-mono uppercase tracking-widest">{integration.category}</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-sf-border flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest uppercase font-bold">
                                            {integration.status === 'connected' ? <CheckCircle2 className="w-3.5 h-3.5 text-sf-safe" /> : integration.status === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-sf-critical" /> : <XCircle className="w-3.5 h-3.5 text-sf-muted" />}
                                            <span className={integration.status === 'connected' ? 'text-sf-safe' : integration.status === 'error' ? 'text-sf-critical' : 'text-sf-muted'}>
                                                {integration.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-sf-muted font-mono">{integration.lastSync}</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleTestConnection(integration); }} disabled={testingId === integration.id} title="Test connection" className="text-sf-muted hover:text-sf-text transition-colors disabled:opacity-50">
                                                <RefreshCw className={`w-3.5 h-3.5 ${testingId === integration.id ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </PanelCard>
                            ))
                        }
                    </div>

                    {!isLoading && filtered.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-sf-border bg-sf-surface/50 text-sf-muted">
                            <Database className="w-8 h-8 mx-auto mb-3 opacity-30 text-sf-text" />
                            <p className="text-[10px] font-mono uppercase tracking-widest text-sf-muted">NO MODULES FOUND.</p>
                        </div>
                    )}
                </PanelCard>
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
