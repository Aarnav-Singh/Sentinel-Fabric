"use client";

import { useState, useCallback, useRef } from "react";
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
        <div className="bg-sf-surface/70 backdrop-blur-md p-5 rounded-xl border border-sf-accent/20 animate-pulse flex flex-col gap-3">
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
    
    // Grid visualizer state
    const [zoomScale, setZoomScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [liveMode, setLiveMode] = useState(true);
    const dragStart = useRef({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            case 'disconnected': return <XCircle className="w-4 h-4 text-sf-muted" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-sf-critical" />;
        }
    };

    const getStatusTextClasses = (status: Integration['status']) => {
        switch (status) {
            case 'connected': return 'text-sf-green';
            case 'disconnected': return 'text-sf-muted';
            case 'error': return 'text-sf-critical';
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
                            <Activity className="w-5 h-5 text-sf-warning" />
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
                            <button onClick={() => setLiveMode(!liveMode)} className={`text-[10px] px-2 py-1 rounded-full border uppercase tracking-widest font-bold transition-all ${liveMode ? 'bg-sf-accent/20 text-sf-accent border-sf-accent/30 shadow-[0_0_10px_rgba(0,242,255,0.2)]' : 'bg-surface-elevated text-text-muted border-surface-border'}`}>
                                Live Visualizer
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] xl:aspect-[24/9] min-h-[400px] bg-sf-bg rounded-xl overflow-hidden border border-sf-border shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
                        {/* Abstract Background Deep Gradient */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--sf-surface)_0%,_var(--sf-bg)_100%)] opacity-80 pointer-events-none" />

                        {/* SCALABLE/PANNABLE CONTENT CONTAINER */}
                        <div 
                            className={`absolute inset-0 w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
                            style={{ 
                                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`, 
                                transformOrigin: 'center', 
                                transition: isDragging ? 'none' : 'transform 0.3s ease' 
                            }}
                            onMouseDown={(e) => {
                                setIsDragging(true);
                                dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                            }}
                            onMouseMove={(e) => {
                                if (!isDragging) return;
                                setPanOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
                            }}
                            onMouseUp={() => setIsDragging(false)}
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            {/* Bounding Bubbles */}
                            <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] sm:w-[45%] md:w-[35%] aspect-square rounded-full border border-sf-accent/20 bg-gradient-to-b from-sf-accent/5 to-transparent backdrop-blur-[2px] pointer-events-none" />
                            <div className="absolute left-[25%] top-[35%] -translate-x-1/2 -translate-y-1/2 w-[35%] sm:w-[25%] md:w-[20%] aspect-square rounded-full border border-sf-accent/20 bg-gradient-to-tr from-sf-accent/5 to-transparent backdrop-blur-[2px] pointer-events-none" />
                            <div className="absolute left-[30%] top-[65%] -translate-x-1/2 -translate-y-1/2 w-[35%] sm:w-[25%] md:w-[20%] aspect-square rounded-full border border-sf-accent/20 bg-gradient-to-bl from-sf-accent/5 to-transparent backdrop-blur-[2px] pointer-events-none" />
                            <div className="absolute left-[75%] top-[65%] -translate-x-1/2 -translate-y-1/2 w-[40%] sm:w-[28%] md:w-[22%] aspect-square rounded-full border border-sf-accent/20 bg-gradient-to-br from-sf-accent/5 to-transparent backdrop-blur-[2px] pointer-events-none" />

                            {/* Connecting Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_0_5px_rgba(0,242,255,0.8)]" preserveAspectRatio="none" viewBox="0 0 1000 400">
                                <defs>
                                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="var(--sf-accent)" stopOpacity="1" />
                                        <stop offset="100%" stopColor="var(--sf-accent)" stopOpacity="0.5" />
                                    </linearGradient>
                                    <linearGradient id="lineGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="var(--sf-accent)" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="var(--sf-accent)" stopOpacity="0.3" />
                                    </linearGradient>
                                </defs>
                                {/* Center Cross Connections */}
                                <line x1="500" y1="200" x2="500" y2="140" stroke="url(#lineGrad)" strokeWidth="2.5" />
                                <line x1="500" y1="200" x2="500" y2="260" stroke="url(#lineGrad)" strokeWidth="2.5" />
                                <line x1="500" y1="200" x2="420" y2="200" stroke="url(#lineGrad)" strokeWidth="2.5" />
                                <line x1="500" y1="200" x2="580" y2="200" stroke="url(#lineGrad)" strokeWidth="2.5" />

                                {/* Bubble Interconnects */}
                                <line x1="500" y1="200" x2="250" y2="140" stroke="url(#lineGradDark)" strokeWidth="2" strokeDasharray="5,5" className={liveMode ? "animate-pulse" : ""} />
                                <line x1="500" y1="200" x2="320" y2="268" stroke="url(#lineGradDark)" strokeWidth="2" />
                                
                                {/* Intra-Bubble connections */}
                                <line x1="280" y1="252" x2="320" y2="268" stroke="url(#lineGrad)" strokeWidth="2.5" className={liveMode ? "animate-pulse" : ""} />
                                <line x1="720" y1="252" x2="780" y2="268" stroke="url(#lineGrad)" strokeWidth="2.5" className={liveMode ? "animate-[pulse_3s_infinite]" : ""} />
                            </svg>

                            {/* Nodes */}
                            {/* Center 1 */}
                            <div className={`absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20 tooltip-trigger ${liveMode ? 'hover:scale-110 transition-transform cursor-pointer' : ''}`}>
                                <div className="relative flex items-center justify-center p-2 rounded-full border-2 border-sf-accent bg-sf-bg/90 shadow-[0_0_15px_var(--sf-accent)]">
                                    <Activity className="w-4 h-4 text-sf-accent" />
                                    {liveMode && <div className="absolute -inset-2 rounded-full border border-sf-accent/30 animate-pulse pointer-events-none" />}
                                </div>
                                <div className="text-[10px] text-white font-bold tracking-wider mt-1 drop-shadow-md bg-sf-bg/50 px-1 rounded">BlueBridge</div>
                                <div className="text-[8px] text-sf-muted font-mono leading-none bg-sf-bg/50 px-1 rounded">domain name</div>
                            </div>
                            <div className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-warning/50 bg-sf-bg/80">
                                    <Cloud className="w-3.5 h-3.5 text-sf-warning" />
                                </div>
                                <div className="text-[10px] text-white font-medium mt-1 drop-shadow-md">Opus Wea...</div>
                            </div>
                            <div className="absolute top-[65%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-emerald-400/50 bg-sf-bg/80">
                                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <div className="text-[10px] text-white font-medium mt-1 drop-shadow-md">Legacy C...</div>
                            </div>
                            <div className="absolute top-[50%] left-[42%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-accent-2/50 bg-sf-bg/80">
                                    <Shield className="w-3.5 h-3.5 text-sf-accent-2" />
                                </div>
                                <div className="text-[10px] text-white font-medium mt-1 drop-shadow-md">Vertex Fi...</div>
                            </div>
                            <div className="absolute top-[50%] left-[58%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-accent-2/50 bg-sf-bg/80">
                                    <Shield className="w-3.5 h-3.5 text-sf-accent-2" />
                                </div>
                                <div className="text-[10px] text-white font-medium mt-1 drop-shadow-md">Pinnacle...</div>
                            </div>

                            {/* Top Left */}
                            <div className="absolute top-[35%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-accent/50 bg-sf-bg/80 shadow-[0_0_10px_var(--sf-accent)]">
                                    <Cloud className="w-3.5 h-3.5 text-sf-accent" />
                                    <div className="absolute -inset-1.5 rounded-full border border-sf-accent/30 pointer-events-none" />
                                </div>
                                <div className="text-[10px] text-white font-bold mt-1 drop-shadow-md">Aurora W...</div>
                                <div className="text-[8px] text-sf-muted font-mono leading-none">domain name</div>
                            </div>

                            {/* Bottom Left */}
                            <div className="absolute top-[63%] left-[28%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-accent/50 bg-sf-bg/80">
                                    <Server className="w-3.5 h-3.5 text-sf-accent" />
                                </div>
                                <div className="text-[10px] text-white font-medium mt-1 drop-shadow-md">Valor Equ...</div>
                            </div>
                            <div className="absolute top-[67%] left-[32%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-warning/50 bg-sf-bg/80 text-sf-warning font-mono text-[9px] font-bold">
                                    {'</>'}
                                </div>
                                <div className="text-[10px] text-white font-bold mt-1 drop-shadow-md">Evertrus...</div>
                            </div>

                            {/* Bottom Right */}
                            <div className="absolute top-[63%] left-[72%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-sf-critical/50 bg-sf-bg/80">
                                    <Target className="w-3.5 h-3.5 text-sf-critical" />
                                </div>
                                <div className="text-[10px] text-white font-medium mt-1 drop-shadow-md">PrimePat...</div>
                            </div>
                            <div className="absolute top-[67%] left-[78%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20">
                                <div className="relative flex items-center justify-center p-1.5 rounded-full border border-orange-400/50 bg-sf-bg/80">
                                    <Network className="w-3.5 h-3.5 text-orange-400" />
                                </div>
                                <div className="text-[10px] text-white font-bold mt-1 drop-shadow-md">Elmwood...</div>
                            </div>

                            {/* Custom Edge Labels (Business Data) */}
                            <div className="absolute top-[26%] left-[37%] -translate-x-1/2 -translate-y-1/2 rotate-[-22deg] text-[6px] md:text-[8px] text-sf-accent/60 tracking-widest font-mono select-none">Business Data</div>
                            <div className="absolute top-[26%] left-[49%] -translate-x-1/2 -translate-y-1/2 rotate-[90deg] text-[6px] md:text-[8px] text-sf-accent/60 tracking-widest font-mono select-none">Business Data</div>
                            <div className="absolute top-[49%] left-[46%] -translate-x-1/2 -translate-y-1/2 text-[6px] md:text-[8px] text-sf-accent/60 tracking-widest font-mono select-none">Business Data</div>
                            <div className="absolute top-[54%] left-[45%] -translate-x-1/2 -translate-y-1/2 rotate-[42deg] text-[6px] md:text-[8px] text-sf-accent/60 tracking-widest font-mono select-none">Business Data</div>
                            <div className="absolute top-[52%] left-[53%] -translate-x-1/2 -translate-y-1/2 rotate-[-60deg] text-[6px] md:text-[8px] text-sf-accent/60 tracking-widest font-mono select-none">Business Data</div>
                            <div className="absolute top-[64%] left-[75%] -translate-x-1/2 -translate-y-1/2 rotate-[12deg] text-[6px] md:text-[8px] text-sf-accent/60 tracking-widest font-mono select-none">Business Data</div>
                        </div>
                        {/* Overlays / Top Controls */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => setIsAddModalOpen(true)} className="bg-sf-surface/90 hover:bg-sf-accent/20 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-300 border border-sf-border hover:border-sf-accent/50 transition-colors flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Add Org
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.json" onChange={(e) => { 
                                if (e.target.files?.length) { 
                                    alert(`Importing ${e.target.files[0].name}. (Not supported in standalone layout).`); 
                                    e.target.value = ""; 
                                } 
                            }} />
                            <button onClick={() => fileInputRef.current?.click()} className="bg-sf-surface/90 hover:bg-sf-accent/20 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-300 border border-sf-border hover:border-sf-accent/50 transition-colors hidden sm:block">
                                Import Orgs
                            </button>
                            <button onClick={() => window.print()} className="bg-sf-surface/90 hover:bg-sf-accent/20 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-bold text-slate-300 border border-sf-border hover:border-sf-accent/50 transition-colors hidden sm:block">
                                Export As PDF
                            </button>
                        </div>

                        {/* Left Side Menu Metrics */}
                        <div className="absolute left-4 top-4 hidden md:flex flex-col gap-1 w-48 text-[10px]">
                            <div className="bg-sf-surface/70 backdrop-blur-md border px-3 py-2 rounded border-sf-accent/20 flex justify-between items-center text-slate-300 shadow-lg">
                                <span className="font-bold">Total</span>
                                <span className="text-sf-accent font-mono font-bold">8</span>
                            </div>
                            <div className="bg-sf-surface/70 backdrop-blur-md border px-3 py-2 rounded border-sf-border flex justify-between items-center text-slate-300">
                                <span>Business Data <AlertCircle className="inline w-3 h-3 opacity-50 ml-1"/></span>
                                <span className="font-mono">2</span>
                            </div>
                            <div className="bg-sf-surface/70 backdrop-blur-md border px-3 py-2 rounded border-sf-border flex justify-between items-center text-slate-300">
                                <span>Customer Data <AlertCircle className="inline w-3 h-3 opacity-50 ml-1"/></span>
                                <span className="font-mono">2</span>
                            </div>
                            <div className="bg-sf-surface/70 backdrop-blur-md border px-3 py-2 rounded border-sf-border flex justify-between items-center text-slate-300">
                                <span>Network Access <AlertCircle className="inline w-3 h-3 opacity-50 ml-1"/></span>
                                <span className="font-mono">3</span>
                            </div>
                            <div className="bg-sf-surface/70 backdrop-blur-md border px-3 py-2 rounded border-sf-border flex justify-between items-center text-slate-300">
                                <span>Owner <AlertCircle className="inline w-3 h-3 opacity-50 ml-1"/></span>
                                <span className="font-mono">1</span>
                            </div>
                        </div>

                        {/* Recommended Collections Select */}
                        <div className="absolute bottom-4 left-4 hidden sm:block">
                            <select className="bg-sf-surface/80 border border-sf-accent/20 rounded-md text-[10px] px-3 py-2 text-sf-accent w-48 shadow-lg font-bold appearance-none outline-none cursor-pointer hover:bg-sf-accent/10 transition-colors">
                                <option>Recommended Collections (0)</option>
                                <option>Cloud Connectors (AWS/GCP)</option>
                                <option>Zero Trust Architecture</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-sf-accent text-[8px] font-bold">
                                ▼
                            </div>
                        </div>

                        {/* Zoom/Pan Controls */}
                        <div className="absolute right-4 bottom-4 flex items-center gap-1.5 bg-sf-surface/80 backdrop-blur-md rounded-md p-1.5 border border-sf-border shadow-xl text-[10px]">
                            <div className="px-2 font-mono text-sf-muted flex items-center gap-1">
                                <button onClick={() => setZoomScale(p => Math.max(0.5, p - 0.1))} className="hover:text-sf-accent transition-colors px-1">-</button>
                                <span className="w-8 text-center">{Math.round(zoomScale * 100)}%</span>
                                <button onClick={() => setZoomScale(p => Math.min(2.0, p + 0.1))} className="hover:text-sf-accent transition-colors px-1">+</button>
                            </div>
                            <div className="w-px h-4 bg-slate-600 mx-1" />
                            <button 
                                onClick={() => { setZoomScale(1); setPanOffset({x:0, y:0}); }} 
                                title="Recenter View"
                                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-sf-accent hover:bg-sf-surface transition-colors rounded"
                            >
                                <Target className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => setLiveMode(!liveMode)} 
                                title="Toggle Live Animations"
                                className={`w-6 h-6 flex items-center justify-center transition-colors rounded ${liveMode ? 'text-sf-accent bg-sf-surface' : 'text-slate-300 hover:bg-sf-surface'}`}
                            >
                                <Activity className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </section>

                <section>
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                        <h3 className="text-slate-100 text-lg font-bold flex items-center gap-2">
                            <Database className="w-5 h-5 text-sf-accent" /> Available Integrations
                            <span className="text-sm text-sf-muted font-normal ml-2">({filtered.length})</span>
                        </h3>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sf-muted" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search components..."
                                    className="w-full bg-sf-surface/80 backdrop-blur border border-sf-accent/20 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-100 focus:border-sf-accent focus:ring-1 focus:ring-sf-accent outline-none transition-all placeholder:text-sf-muted shadow-[inset_0_0_10px_rgba(0,242,255,0.05)]"
                                />
                            </div>
                            <button
                                onClick={() => mutate()}
                                title="Refresh"
                                className="p-2 rounded-lg border border-sf-accent/20 text-sf-muted hover:text-sf-accent hover:border-sf-accent/40 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-sf-accent hover:bg-sf-accent text-sf-bg px-4 py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] whitespace-nowrap text-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Integration
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {isLoading && localIntegrations === null
                            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                            : filtered.map((integration) => (
                                <div key={integration.id} className="bg-sf-surface/70 backdrop-blur-md p-5 rounded-xl border border-sf-accent/20 hover:border-sf-accent/60 hover:shadow-[0_0_20px_rgba(0,242,255,0.15)] transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-sf-bg flex items-center justify-center border border-sf-border group-hover:border-sf-accent/40 group-hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all text-sf-muted group-hover:text-sf-accent">
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
                                                className="p-1.5 hover:bg-sf-accent/10 rounded-md text-sf-muted hover:text-sf-accent transition-colors border border-transparent hover:border-sf-accent/20"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-slate-100 font-bold text-sm mb-1 group-hover:text-sf-accent transition-colors">{integration.name}</h3>
                                        <p className="text-sf-muted text-xs font-mono">{integration.category}</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-sf-accent/10 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-medium text-[11px]">
                                            {getStatusIcon(integration.status)}
                                            <span className={getStatusTextClasses(integration.status)}>
                                                {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-sf-muted font-mono">{integration.lastSync}</span>
                                            <button
                                                onClick={() => handleTestConnection(integration)}
                                                disabled={testingId === integration.id}
                                                title="Test connection"
                                                className="text-[9px] text-sf-accent/60 hover:text-sf-accent transition-colors disabled:opacity-50"
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
                        <div className="text-center py-12 text-sf-muted">
                            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No integrations match your search.</p>
                        </div>
                    )}
                </section>

                <section className="pt-4 pb-8">
                    <h3 className="text-slate-100 text-lg font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-sf-accent" /> Tool Health Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-sf-surface/70 backdrop-blur-md p-5 rounded-xl border border-sf-accent/10 flex items-center gap-5">
                            <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
                                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8" className="text-sf-bg" stroke="currentColor" />
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" className="text-sf-accent drop-shadow-[0_0_5px_rgba(0,242,255,0.6)]" stroke="currentColor" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-sf-accent">75%</div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-slate-100 font-bold">API Latency</p>
                                    <span className="text-xs text-sf-accent font-mono">42ms</span>
                                </div>
                                <p className="text-sf-muted text-xs leading-relaxed">System stability within normal parameters for the last 24h.</p>
                            </div>
                        </div>

                        <div className="bg-sf-surface/70 backdrop-blur-md p-5 rounded-xl border border-sf-accent/10 flex items-center gap-5">
                            <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
                                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8" className="text-sf-bg" stroke="currentColor" />
                                    <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="8"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={`${251.2 * (1 - connectedCount / Math.max(1, integrations.length))}`}
                                        strokeLinecap="round" className="text-sf-accent/40" stroke="currentColor" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-sf-accent">
                                    {Math.round(connectedCount / Math.max(1, integrations.length) * 100)}%
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-slate-100 font-bold">Sync Integrity</p>
                                    <span className="text-xs text-sf-accent font-mono">{connectedCount}/{integrations.length} online</span>
                                </div>
                                <p className="text-sf-muted text-xs leading-relaxed">Data reconciliation completed for all nodes across the mesh.</p>
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
