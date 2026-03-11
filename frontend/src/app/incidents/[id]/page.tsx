"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { 
    AlertTriangle, 
    ShieldAlert, 
    Clock, 
    MapPin, 
    Users, 
    MonitorSmartphone, 
    ChevronRight,
    Activity,
    CheckCircle2,
    ShieldOff,
    Search,
    Radar
} from "lucide-react";

// The shape coming from our v1 findings API
interface FindingDetails {
    finding_id: string;
    description: string;
    severity: string;
    confidence: string;
    status: string;
    title?: string; // Optional depending on how it's aggregated
    entities: {
        entity_id: string;
        type: string;
        name?: string;
    }[];
    created_at: string;
    updated_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load incident");
    return res.json();
});

export default function IncidentDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
    // In Next.js App Router, dynamic params can be a Promise
    const resolvedParams = "then" in params ? use(params) : params;
    const { id } = resolvedParams;

    // Fetch from the proxy
    const { data: finding, error, isLoading } = useSWR<FindingDetails>(
        `/api/proxy/api/v1/findings/${id}`,
        fetcher,
        { refreshInterval: 10000 }
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] h-full bg-transparent">
                <div className="w-8 h-8 border-2 border-[#06b6d4] border-b-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-sm font-mono uppercase tracking-widest font-bold animate-pulse">Establishing Connection...</p>
            </div>
        );
    }

    if (error || !finding) {
        return (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center h-full bg-transparent">
                <div className="w-20 h-20 rounded-2xl bg-[#ef4444]/10 flex items-center justify-center border border-[#ef4444]/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] mb-6">
                    <AlertTriangle className="w-10 h-10 text-[#ef4444]" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">Incident Not Found</h2>
                <p className="text-slate-400 max-w-sm mb-8">The incident you requested could not be found or has been purged from active telemetry.</p>
                <Link href="/dashboard" className="px-6 py-2.5 bg-slate-800 border border-slate-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-700 transition-colors">
                    Return to SOC
                </Link>
            </div>
        );
    }

    // Determine colors based on severity
    const severityLower = finding.severity.toLowerCase();
    const isCritical = severityLower === 'critical';
    const isHigh = severityLower === 'high';
    const isMedium = severityLower === 'medium';
    
    const severityColor = isCritical 
        ? "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30" 
        : isHigh
        ? "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30"
        : isMedium
        ? "text-[#8b5cf6] bg-[#8b5cf6]/10 border-[#8b5cf6]/30"
        : "text-slate-400 bg-slate-500/10 border-slate-500/30";

    const severityTextColor = isCritical ? "text-[#ef4444]" : isHigh ? "text-[#f59e0b]" : isMedium ? "text-[#8b5cf6]" : "text-slate-400";

    const title = finding.title || finding.description || "Suspicious Activity Detected";
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-transparent">
            {/* Content Header */}
            <header className="sticky top-0 z-10 p-6 flex items-center justify-between border-b border-slate-700/50 bg-[#020617]/80 backdrop-blur-xl">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                        <span>Incidents</span>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                        <span className="text-slate-400">INC-{id.split('-')[0].substring(0,6)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                        <div className="flex gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border ${finding.status === 'open' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30' : 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30'}`}>
                                {finding.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border ${severityColor}`}>
                                {finding.severity}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Risk Assessed</div>
                        <div className={`text-lg font-bold uppercase tracking-wide ${severityTextColor}`}>{finding.severity}</div>
                        <div className="text-[9px] uppercase tracking-widest text-[#06b6d4]">{finding.confidence || "High"} Confidence</div>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-700/50 hidden sm:block"></div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700/50 rounded-lg text-xs font-bold text-slate-300 shadow-inner">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>{finding.entities?.filter(e => e.type === 'user').length || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700/50 rounded-lg text-xs font-bold text-slate-300 shadow-inner">
                            <MonitorSmartphone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{finding.entities?.filter(e => e.type === 'host' || e.type === 'ip').length || 0}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Grid Content Area */}
            <div className="p-6 grid grid-cols-12 gap-6 max-w-screen-2xl mx-auto w-full">
                {/* Left Column: Summary & Scope */}
                <div className="col-span-12 xl:col-span-3 space-y-6">
                    {/* What's Happening Card */}
                    <div className="glass-panel p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Radar className="w-5 h-5 text-[#8b5cf6]" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Context Overview</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400 mb-5">
                            {finding.description}
                        </p>
                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-3 shadow-inner">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">First Identified</span>
                                <span className="text-slate-300 font-mono">{new Date(finding.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Last Updated</span>
                                <span className="text-slate-300 font-mono">{new Date(finding.updated_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Correlation ID</span>
                                <span className="text-[#06b6d4] font-mono">{finding.finding_id.substring(0,8)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Affected Entities Card */}
                    <div className="glass-panel p-5">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-slate-400" />
                            AFFECTED ENTITIES
                        </h3>
                        <div className="space-y-3">
                            {finding.entities?.length > 0 ? finding.entities.map((entity, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded shrink-0 bg-slate-800 flex items-center justify-center border border-slate-700">
                                            {entity.type === 'user' ? <Users className="w-4 h-4 text-[#ef4444]" /> : <MonitorSmartphone className="w-4 h-4 text-[#06b6d4]" />}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">{entity.type}</p>
                                            <p className="text-xs font-bold text-white truncate font-mono" title={entity.name || entity.entity_id}>
                                                {entity.name || entity.entity_id}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </div>
                            )) : (
                                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed text-center">
                                    <p className="text-xs text-slate-500 font-medium">No specific entities correlated.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Column: Evidence & Timeline */}
                <div className="col-span-12 xl:col-span-6 space-y-6">
                    {/* Evidence Overview Table */}
                    <div className="glass-panel overflow-hidden flex flex-col h-[300px]">
                        <div className="p-5 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/30">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evidence Matrix</h3>
                            <div className="relative">
                                <input className="bg-slate-900 border border-slate-700/50 rounded shadow-inner text-[11px] font-medium py-1.5 pl-8 pr-4 w-48 focus:border-[#06b6d4]/50 text-white placeholder-slate-500 focus:outline-none transition-colors" placeholder="Search logs..." type="text" />
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-900/50 text-slate-400 text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th className="px-5 py-3 font-bold">Vector</th>
                                        <th className="px-5 py-3 font-bold">Telemetry Payload</th>
                                        <th className="px-5 py-3 font-bold">Timestamp</th>
                                        <th className="px-5 py-3 font-bold">Validation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    <tr className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-5 py-4"><Activity className="w-4 h-4 text-[#f59e0b]" /></td>
                                        <td className="px-5 py-4 text-slate-300 font-medium">Anomaly detected via behavioral ML model</td>
                                        <td className="px-5 py-4 text-slate-500 font-mono">{new Date(finding.created_at).toLocaleTimeString()}</td>
                                        <td className="px-5 py-4"><span className="bg-[#10b981]/10 text-[#10b981] text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border border-[#10b981]/30">Valid</span></td>
                                    </tr>
                                    <tr className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-5 py-4"><ShieldOff className="w-4 h-4 text-[#ef4444]" /></td>
                                        <td className="px-5 py-4 text-slate-300 font-medium">Signature match: Cobalt Strike Beacon</td>
                                        <td className="px-5 py-4 text-slate-500 font-mono">{new Date(finding.created_at).toLocaleTimeString()}</td>
                                        <td className="px-5 py-4"><span className="bg-[#10b981]/10 text-[#10b981] text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border border-[#10b981]/30">Valid</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Execution Timeline
                            </h3>
                            <div className="flex items-center gap-2">
                                <input defaultChecked className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-[#06b6d4] focus:ring-0 focus:ring-offset-0 cursor-pointer" type="checkbox" />
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer">Key Events Only</label>
                            </div>
                        </div>
                        <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                            
                            <div className="flex items-start gap-4">
                                <div className="mt-1 -ml-[23px] w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.6)] border-2 border-[#020617] relative z-10 animate-pulse"></div>
                                <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444]">Detection Event</span>
                                    </div>
                                    <p className="text-xs text-white font-medium">Finding triggered and normalized by ingest pipeline.</p>
                                    <span className="text-[10px] text-slate-500 font-mono mt-2 block">{new Date(finding.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                                <div className="mt-1 -ml-[23px] w-3 h-3 rounded-full bg-[#06b6d4] border-2 border-[#020617] relative z-10"></div>
                                <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 opacity-80">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#06b6d4]">Automated Enrichment</span>
                                    </div>
                                    <p className="text-xs text-slate-300 font-medium">Status initialized to <strong className="text-white uppercase">{finding.status}</strong></p>
                                    <span className="text-[10px] text-slate-500 font-mono mt-2 block">{new Date(finding.updated_at).toLocaleString()}</span>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>

                {/* Right Column: Remediation Hub & Activity */}
                <div className="col-span-12 xl:col-span-3 space-y-6">
                    {/* Remediation Hub Sidebar */}
                    <div className="glass-panel p-5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#06b6d4]/50 to-transparent" />
                        
                        <div className="flex items-center gap-2 mb-6 focus-border">
                            <CheckCircle2 className="w-5 h-5 text-[#06b6d4]" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mitigation Center</h3>
                        </div>
                        <div className="space-y-4">
                            <button className="w-full bg-[#06b6d4] text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-[#0891b2] transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] uppercase tracking-wider">
                                <ShieldAlert className="w-4 h-4" />
                                EXECUTE PLAYBOOK
                            </button>
                            
                            <div className="pt-2 space-y-2">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-700/50 pb-2">Manual Actions</p>
                                <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-300 border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-between group transition-all uppercase tracking-wider">
                                    <span>Isolate Endpoint</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-300 border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-between group transition-all uppercase tracking-wider">
                                    <span>Revoke Tokens</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                                </button>
                                <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-300 border border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-between group transition-all uppercase tracking-wider">
                                    <span>Assign to Team</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                                </button>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-700/50">
                                <button className="w-full border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all">
                                    Close Incident
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Activity Log */}
                    <div className="glass-panel p-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            Analyst Notes
                        </h3>
                        <div className="relative mb-6">
                            <textarea className="w-full bg-slate-900 border border-slate-700/50 rounded-lg p-3 text-xs text-white focus:border-[#06b6d4]/50 resize-none outline-none shadow-inner placeholder-slate-600 custom-scrollbar" placeholder="Add investigation notes..." rows={3}></textarea>
                            <button className="absolute bottom-2 right-2 p-1.5 bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded shrink-0 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">SYS</div>
                                <div>
                                    <div className="flex items-baseline justify-between mb-0.5">
                                        <p className="text-[10px] text-white font-bold uppercase tracking-wider">Automated</p>
                                        <p className="text-[9px] font-mono text-slate-500">3:47 AM</p>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">Alert bundled and incident instantiated.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded shrink-0 bg-[#06b6d4]/20 flex items-center justify-center text-[10px] font-bold text-[#06b6d4] border border-[#06b6d4]/30">JS</div>
                                <div>
                                    <div className="flex items-baseline justify-between mb-0.5">
                                        <p className="text-[10px] text-white font-bold uppercase tracking-wider">John Smith</p>
                                        <p className="text-[9px] font-mono text-slate-500">4:02 AM</p>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">Initial review complete. Escalated severity due to VIP target.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
