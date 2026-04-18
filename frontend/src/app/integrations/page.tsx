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

const TOPOLOGY_NODES = [
 { id: 'hub', label: 'CENTRAL_HUB', x: 50, y: 50, icon: Activity, main: true },
 { id: 'us-east', label: 'US-EAST-1', x: 50, y: 20, icon: Server },
 { id: 'edge', label: 'EDGE_ROUTER', x: 30, y: 75, icon: Network },
 { id: 'rds', label: 'RDS_CLUSTER', x: 70, y: 75, icon: Database, warning: true },
 { id: 'aws', label: 'AWS_PROD', x: 25, y: 30, icon: Cloud, safe: true },
 { id: 'fw', label: 'FW_PRIMARY', x: 75, y: 30, icon: Shield, critical: true },
 { id: 'ext', label: 'EXT_API', x: 85, y: 62.5, icon: Cloud, isExt: true }
];

const TOPOLOGY_LINKS = [
 { source: 'hub', target: 'us-east', type: 'dashed' },
 { source: 'hub', target: 'edge', type: 'dashed' },
 { source: 'hub', target: 'rds', type: 'dashed' },
 { source: 'hub', target: 'aws', type: 'safe' },
 { source: 'hub', target: 'fw', type: 'warning' },
 { source: 'fw', target: 'ext', type: 'neutral' },
];

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
 <ShimmerSkeleton className="w-10 h-10 border border-ng-outline-dim/40" />
 <ShimmerSkeleton className="w-6 h-6 border border-ng-outline-dim/40" />
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
 <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-ng-base flex flex-col min-h-0 space-y-4">
 <div className="flex flex-col gap-4 w-full max-w-[1600px] mx-auto min-h-0">

 {/* Hero Section: Cyber Infrastructure Grid */}
 <PanelCard className="flex flex-col p-0 overflow-hidden shrink-0 border border-ng-outline-dim/40 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
 <div className="p-3 border-b border-ng-outline-dim/40 bg-ng-mid flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="w-2 h-2 bg-ng-magenta animate-pulse-fast border border-ng-magenta/50 rounded-none" />
 <h2 className="font-headline tracking-widest uppercase text-[11px] font-mono tracking-widest text-ng-on uppercase flex items-center gap-2">
 Global Infrastructure Topology
 </h2>
 </div>
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-mono text-ng-lime px-2 py-0.5 border border-ng-outline-dim/40 bg-ng-base">
 {connectedCount} CONNECTED
 </span>
 {errorCount > 0 && (
 <span className="text-[10px] font-mono text-ng-error px-2 py-0.5 border border-ng-error bg-ng-error/10 shadow-[0_0_10px_var(--ng-error)] animate-pulse-fast">
 {errorCount} ERROR
 </span>
 )}
 </div>
 </div>

 <div className="relative w-full h-[400px] bg-ng-base overflow-hidden cursor-crosshair border-b border-ng-outline-dim/40"
 onMouseDown={(e) => { setIsDragging(true); dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }; }}
 onMouseMove={(e) => { if (!isDragging) return; setPanOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }}
 onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
 >
 {/* Grid Background */}
 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

 <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.15s linear' }} className="w-full h-full absolute inset-0 pointer-events-none">
 <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 400">
 {TOPOLOGY_LINKS.map((link, i) => {
 const srcNode = TOPOLOGY_NODES.find(n => n.id === link.source);
 const tgtNode = TOPOLOGY_NODES.find(n => n.id === link.target);
 if (!srcNode || !tgtNode) return null;
 const x1 = srcNode.x * 10, y1 = srcNode.y * 4, x2 = tgtNode.x * 10, y2 = tgtNode.y * 4;
 
 if (link.type === 'dashed') return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ng-cyan-bright)" strokeWidth="1" strokeDasharray="4 2" className="opacity-50" />;
 if (link.type === 'safe') return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ng-lime)" strokeWidth="1.5" className={liveMode ? "animate-pulse" : ""} />;
 if (link.type === 'warning') return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ng-magenta)" strokeWidth="1.5" className={liveMode ? "animate-pulse-fast" : ""} />;
 return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ng-outline-dim/30)" strokeWidth="1" />;
 })}
 </svg>

 {/* Nodes */}
 {TOPOLOGY_NODES.map(node => (
 <div key={node.id} className="absolute flex flex-col items-center pointer-events-auto group" style={{ top: `${node.y}%`, left: `${node.x}%`, transform: 'translate(-50%, -50%)' }}>
 <div className={`p-2 border bg-ng-base transition-transform group-hover:scale-110 ${
 node.main ? 'p-3 shadow-[0_0_15px_rgba(0,242,255,0.2)] border-ng-cyan/50 text-ng-cyan' :
 node.safe ? 'shadow-[0_0_10px_var(--ng-lime)] border-ng-lime text-ng-lime' :
 node.warning ? 'border-ng-magenta text-ng-magenta' :
 node.critical ? 'border-ng-error text-ng-error' :
 'border-ng-outline-dim/40 text-ng-on'
 }`}>
 <node.icon className={node.main ? "w-5 h-5" : "w-4 h-4"} />
 </div>
 <div className={`mt-1 font-mono tracking-widest ${node.main ? 'mt-2 text-[9px] font-bold bg-ng-mid px-2 py-0.5 border border-ng-outline-dim/40 text-ng-on' : 'text-[8px] text-ng-muted'}`}>
 {node.label}
 </div>
 </div>
 ))}
 </div>
 
 {/* Overlay Controls */}
 <div className="absolute top-3 right-3 flex gap-2">
 <button onClick={() => setIsAddModalOpen(true)} className="bg-ng-mid border border-ng-outline-dim/40 hover:border-ng-cyan/50 px-3 py-1.5 text-[9px] font-bold text-ng-on uppercase tracking-widest flex items-center gap-2 transition-colors">
 <Plus className="w-3 h-3" /> Add Component
 </button>
 </div>
 <div className="absolute bottom-3 left-3 flex gap-2">
 <span className="text-[9px] text-ng-muted font-mono bg-ng-base border border-ng-outline-dim/40 px-2 py-1 flex gap-2"><span className="text-ng-cyan">ZOOM</span> {Math.round(zoomScale * 100)}%</span>
 <span className="text-[9px] text-ng-muted font-mono bg-ng-base border border-ng-outline-dim/40 px-2 py-1 flex gap-2"><span className="text-ng-cyan">PAN</span> X:{Math.round(panOffset.x)} Y:{Math.round(panOffset.y)}</span>
 </div>
 <div className="absolute bottom-3 right-3 flex gap-2">
 <button onClick={() => { setZoomScale(1); setPanOffset({x:0, y:0}); }} title="Recenter View" className="bg-ng-mid border border-ng-outline-dim/40 px-2 py-1 text-ng-muted hover:text-ng-on">
 <Target className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => setLiveMode(!liveMode)} title="Toggle Streams" className={`border px-2 py-1 ${liveMode ? 'bg-ng-cyan-bright/10 border-ng-cyan/50 text-ng-cyan' : 'bg-ng-mid border-ng-outline-dim/40 text-ng-muted'}`}>
 <Activity className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 </PanelCard>

 {/* Integrations Grid Section */}
 <PanelCard className="flex flex-col flex-1 p-0 min-h-0 border-none shadow-none bg-transparent">
 <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 shrink-0 border-b border-ng-outline-dim/40 mb-4">
 <h3 className="text-ng-on text-[14px] font-bold uppercase tracking-widest flex items-center gap-2 font-mono">
 <Database className="w-4 h-4 text-ng-cyan" /> Integration Modules 
 <span className="text-[10px] text-ng-muted font-normal">({filtered.length})</span>
 </h3>

 <div className="flex flex-col sm:flex-row items-center gap-3">
 <div className="relative w-full sm:w-64">
 <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ng-muted" />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="SEARCH MODULES..."
 autoComplete="off"
 className="w-full bg-ng-mid border border-ng-outline-dim/40 rounded-none py-2 pl-9 pr-4 text-[10px] font-mono text-ng-on focus:border-ng-cyan/50 outline-none transition-colors placeholder:text-ng-muted/50"
 />
 </div>
 <button onClick={() => mutate()} title="Refresh" className="p-2 border border-ng-outline-dim/40 text-ng-muted hover:text-ng-on bg-ng-mid">
 <RefreshCw className="w-3.5 h-3.5" />
 </button>
 <button type="button" onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 border border-ng-cyan/50 bg-ng-cyan-bright/10 hover:bg-ng-cyan-bright hover:text-black text-ng-cyan px-4 py-2 font-bold transition-colors font-mono text-[10px] uppercase tracking-widest">
 <Plus className="w-3.5 h-3.5" /> Add Module
 </button>
 </div>
 </header>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
 {isLoading && localIntegrations === null
 ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
 : filtered.map((conn) => (
 <div key={conn.id} className="ng-surface p-3 flex items-center gap-3">
 <div className={`w-2 h-2 rounded-none ${conn.status === "connected" ? "bg-ng-lime" : conn.status === 'error' ? 'bg-ng-error' : "bg-ng-muted"}`} />
 <div className="flex-1">
 <div className="text-[12px] text-ng-on font-mono font-bold uppercase tracking-widest">{conn.name || conn.category}</div>
 <div className="text-[10px] font-mono text-ng-muted">{conn.lastSync ? String(conn.lastSync) : "No events"}</div>
 </div>
 <span className={`text-[9px] font-mono px-1 py-0.5 border ${conn.status === "connected" ? "text-ng-lime border-ng-lime" : conn.status === 'error' ? 'text-ng-error border-ng-error' : "text-ng-muted border-ng-muted"}`}>
 {conn.status?.toUpperCase()}
 </span>
 </div>
 ))
 }
 </div>

 {!isLoading && filtered.length === 0 && (
 <div className="text-center py-12 border border-dashed border-ng-outline-dim/40 bg-ng-mid/50 text-ng-muted">
 <Database className="w-8 h-8 mx-auto mb-3 opacity-30 text-ng-on" />
 <p className="text-[10px] font-mono uppercase tracking-widest text-ng-muted">NO MODULES FOUND.</p>
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
