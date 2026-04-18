"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Target, ExternalLink, Database, Clock, ShieldAlert, Users, Server, UserPlus, Zap, Filter, Radio, Brain, Bug, Maximize2, Activity, Shield, Skull } from 'lucide-react';
import useSWR from 'swr';
import { FadeIn, SlideIn, ShimmerSkeleton, AnimatedNumber, PanelCard } from '@/components/ui/MotionWrappers';
import { useToast } from '@/components/ui/Toast';
import { EntityLink } from '@/components/ui/EntityLink';
import { DataFreshness } from '@/components/ui/DataFreshness';

import { FindingHistoryModal } from '@/components/features/findings/FindingHistoryModal';
import { QuickActions } from '@/components/features/actions/QuickActions';
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";

// ─── Types ───────────────────────────────────────────────
interface CveContext { cve_id: string; cvss_score?: number; severity?: string; description?: string; patch_available?: boolean; }
interface TriageResult { severity: string; confidence: number; summary: string; recommended_action: string; tools_used: string[]; }
interface Finding { id: string; title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; source?: string; status: 'open' | 'approved' | 'dismissed' | 'escalated' | 'new'; created_at?: string; ip?: string; domain?: string; linked_techniques?: string[]; cve_context?: CveContext[]; triage_result?: TriageResult; ml_score?: number; auto_triage_json?: string; }
interface FindingsResponse { findings?: Finding[]; }

const fetcher = (url: string) => fetch(url).then(r => r.json());

function timeAgo(iso?: string): string {
 if (!iso) return '';
 const diff = (Date.now() - new Date(iso).getTime()) / 1000;
 if (diff < 60) return `${Math.round(diff)}s ago`;
 if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
 return `${Math.round(diff / 3600)}h ago`;
}

// ─── Components ──────────────────────────────────────────

const GlobeSVG = () => {
  // A pseudo-3D globe with stylized curves and dots
  return (
    <div className="relative w-full aspect-square bg-ng-base border border-ng-outline-dim/30 rounded-xl overflow-hidden flex items-center justify-center">
      <div className="absolute top-4 left-4 text-xs font-mono tracking-widest text-ng-muted uppercase">Global Risk Surface</div>
      <div className="absolute right-4 top-4 flex flex-col gap-1 border border-ng-outline-dim/30 rounded-md overflow-hidden bg-black/40">
        <button className="w-6 h-6 flex items-center justify-center hover:bg-ng-outline-dim/30 text-ng-muted">+</button>
        <button className="w-6 h-6 flex items-center justify-center hover:bg-ng-outline-dim/30 text-ng-muted">-</button>
      </div>

      <div className="relative w-3/4 h-3/4 max-w-[400px] max-h-[400px] rounded-full border border-ng-lime/20 shadow-[0_0_50px_rgba(105,253,93,0.1)] overflow-hidden bg-[#0a0a0a]">
        <svg className="absolute inset-0 w-full h-full animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100">
          <defs>
            <radialGradient id="globeGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(105,253,93,0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#globeGrad)" />
          {/* Abstract landmasses */}
          <path d="M 20 40 Q 30 30 40 40 T 50 20 Q 60 10 70 30 T 80 50 Q 70 60 60 50 T 40 80 Q 30 90 20 70 Z" fill="rgba(105,253,93,0.05)" stroke="rgba(105,253,93,0.2)" strokeWidth="0.5"/>
          <path d="M 60 60 Q 70 50 80 60 T 90 40 Q 85 30 75 40 T 65 70 Z" fill="rgba(105,253,93,0.05)" stroke="rgba(105,253,93,0.2)" strokeWidth="0.5"/>
          {/* Grid */}
          <ellipse cx="50" cy="50" rx="49" ry="15" fill="none" stroke="rgba(117,117,117,0.1)" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" rx="49" ry="30" fill="none" stroke="rgba(117,117,117,0.1)" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" rx="15" ry="49" fill="none" stroke="rgba(117,117,117,0.1)" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" rx="30" ry="49" fill="none" stroke="rgba(117,117,117,0.1)" strokeWidth="0.5" />
          
          {/* Nodes and Links */}
          <circle cx="40" cy="40" r="1.5" fill="var(--ng-lime)" className="animate-pulse shadow-[0_0_10px_var(--ng-lime)]" />
          <circle cx="60" cy="30" r="1.5" fill="var(--ng-lime)" className="animate-pulse shadow-[0_0_10px_var(--ng-lime)]" />
          <circle cx="20" cy="60" r="1.5" fill="var(--ng-lime)" className="animate-pulse shadow-[0_0_10px_var(--ng-lime)]" />
          <circle cx="70" cy="50" r="2.5" fill="var(--ng-lime)" className="animate-pulse shadow-[0_0_15px_var(--ng-lime)]" />
          <circle cx="35" cy="55" r="1.5" fill="var(--ng-lime)" className="animate-pulse shadow-[0_0_10px_var(--ng-lime)]" />
          <circle cx="55" cy="65" r="1.5" fill="var(--ng-lime)" className="animate-pulse shadow-[0_0_10px_var(--ng-lime)]" />
          
          {/* Bright green connection lines (attack paths) */}
          <path d="M 40 40 Q 50 20 60 30" fill="none" stroke="var(--ng-lime)" strokeWidth="0.8" strokeDasharray="1,2" className="drop-shadow-[0_0_5px_rgba(105,253,93,0.8)]"/>
          <path d="M 60 30 Q 80 40 70 50" fill="none" stroke="var(--ng-lime)" strokeWidth="0.8" strokeDasharray="1,2" className="drop-shadow-[0_0_5px_rgba(105,253,93,0.8)]"/>
          <path d="M 20 60 Q 40 70 70 50" fill="none" stroke="var(--ng-lime)" strokeWidth="0.8" strokeDasharray="1,2" className="drop-shadow-[0_0_5px_rgba(105,253,93,0.8)]"/>
          <path d="M 35 55 Q 45 45 60 30" fill="none" stroke="var(--ng-lime)" strokeWidth="0.5" strokeDasharray="1,3" className="drop-shadow-[0_0_3px_rgba(105,253,93,0.5)]"/>
          <path d="M 55 65 Q 65 60 70 50" fill="none" stroke="var(--ng-lime)" strokeWidth="0.5" strokeDasharray="1,3" className="drop-shadow-[0_0_3px_rgba(105,253,93,0.5)]"/>
        </svg>
      </div>
    </div>
  );
};

const GaugeSVG = () => {
  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-ng-lime/30 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_20px_rgba(105,253,93,0.05)]">
       <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-ng-lime/10 to-transparent pointer-events-none" />
       <svg viewBox="0 0 100 50" className="w-full max-w-[250px] overflow-visible drop-shadow-[0_0_8px_rgba(105,253,93,0.3)]">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--ng-lime)" />
              <stop offset="50%" stopColor="var(--ng-cyan-bright)" />
              <stop offset="100%" stopColor="var(--ng-error)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(117,117,117,0.3)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 50 A 40 40 0 0 1 40 15" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" filter="url(#glow)" />
          
          {/* Needle pointing to green zone */}
          <g transform="translate(50, 50) rotate(-55)">
            <path d="M -2 0 L 0 -38 L 2 0 Z" fill="var(--ng-lime)" className="drop-shadow-[0_0_5px_rgba(105,253,93,0.8)]" />
            <circle cx="0" cy="0" r="5" fill="var(--ng-base)" stroke="var(--ng-lime)" strokeWidth="2" />
          </g>
       </svg>
       <div className="text-2xl font-headline tracking-[0.2em] uppercase mt-6 text-ng-lime font-bold drop-shadow-[0_0_8px_rgba(105,253,93,0.8)]">Nominal</div>
    </div>
  );
};

export default function FindingsPage() {
 const [severityFilter, setSeverityFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('open');
 const [localStatuses, setLocalStatuses] = useState<Record<string, Finding['status']>>({});
 const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
 const [isHistoryOpen, setIsHistoryOpen] = useState(false);
 const [lastUpdated, setLastUpdated] = useState(Date.now());
 const [dialogState, setDialogState] = useState<{open: boolean; action: string; finding: any} | null>(null);
 const { mutate } = useSWR('/api/proxy/api/v1/findings');

 const { data, isLoading } = useSWR<FindingsResponse | Finding[]>('/api/proxy/api/v1/findings', fetcher, { refreshInterval: 10000 });

 useEffect(() => {
   if (data) setLastUpdated(Date.now());
 }, [data]);

 let findings: Finding[] = [];
 if (data) {
   if (Array.isArray(data)) findings = data;
   else if ((data as FindingsResponse).findings) findings = (data as FindingsResponse).findings!;
 }

 findings = findings.map(f => localStatuses[f.id] ? { ...f, status: localStatuses[f.id] } : f);

 const filtered = findings.filter(f => {
   if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
   if (statusFilter !== 'all') {
      if (statusFilter === 'open' && (f.status === 'dismissed' || f.status === 'approved')) return false;
      if (statusFilter !== 'open' && f.status !== statusFilter) return false;
   }
   return true;
 });

 const activeFindings = findings.filter(f => f.status !== 'dismissed' && f.status !== 'approved');

 return (
 <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-black flex flex-col gap-6 min-h-0 text-ng-on font-sans">
    
    <div className="w-full max-w-[1600px] mx-auto flex flex-col xl:flex-row gap-6 min-h-0">
      
      {/* Left Column: Grid */}
      <div className="flex-[2] flex flex-col gap-6 min-h-0 min-w-0">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-black/60 backdrop-blur-md border border-ng-outline-dim/30 rounded-xl p-3 shadow-lg shrink-0 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button className="bg-ng-lime text-black px-6 py-2 rounded font-bold font-mono text-[11px] tracking-widest uppercase hover:bg-white transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(105,253,93,0.4)]">
              <UserPlus className="w-3.5 h-3.5" /> Assign Incident
            </button>
            <button className="border border-ng-lime text-ng-lime px-6 py-2 rounded font-bold font-mono text-[11px] tracking-widest uppercase hover:bg-ng-lime/10 transition-colors flex items-center gap-2 shadow-[inset_0_0_10px_rgba(105,253,93,0.2)]">
              <Shield className="w-3.5 h-3.5" /> Start Mitigation
            </button>
          </div>

          <div className="flex-1 flex justify-center">
             <div className="relative w-full max-w-md group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ng-lime/50 group-focus-within:text-ng-lime transition-colors" />
               <input
                 type="text"
                 placeholder="Search incidents by ID, IP, or Title..."
                 className="w-full bg-black/40 border border-ng-outline-dim/40 h-10 pl-10 pr-4 text-[12px] font-mono focus:outline-none focus:border-ng-lime focus:ring-1 focus:ring-ng-lime/50 placeholder:text-ng-muted/40 transition-all rounded-lg text-ng-on"
               />
             </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <select 
               className="bg-black/80 border border-ng-outline-dim/40 text-ng-muted text-[11px] font-mono tracking-widest uppercase p-2 rounded focus:border-ng-lime focus:ring-1 focus:ring-ng-lime outline-none"
               value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Sev</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select 
               className="bg-black/80 border border-ng-outline-dim/40 text-ng-muted text-[11px] font-mono tracking-widest uppercase p-2 rounded focus:border-ng-lime focus:ring-1 focus:ring-ng-lime outline-none"
               value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="approved">Approved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            {isLoading ? (
               Array.from({ length: 6 }).map((_, i) => <ShimmerSkeleton key={i} className="h-56 w-full rounded-xl" />)
            ) : filtered.length === 0 ? (
               <div className="col-span-full flex items-center justify-center font-mono text-xs text-ng-muted tracking-[0.2em] uppercase h-64 border border-dashed border-ng-outline-dim/30 rounded-xl">
                 No active incidents found
               </div>
            ) : (
               filtered.map(finding => {
                 const sevColor = finding.severity === 'critical' ? 'text-ng-error' : finding.severity === 'high' ? 'text-[#F59E0B]' : finding.severity === 'medium' ? 'text-ng-cyan-bright' : 'text-ng-lime';
                 const sevBg = finding.severity === 'critical' ? 'bg-ng-error/10 border-ng-error/30' : finding.severity === 'high' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30' : finding.severity === 'medium' ? 'bg-ng-cyan-bright/10 border-ng-cyan-bright/30' : 'bg-ng-lime/10 border-ng-lime/30';
                 
                 return (
                 <div key={finding.id} className="flex flex-col bg-black/60 backdrop-blur-md border border-ng-lime/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-ng-lime hover:shadow-[0_0_25px_rgba(105,253,93,0.2)] transition-all duration-300 group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-ng-lime/5 to-transparent pointer-events-none" />
                    <div className="p-5 flex flex-col gap-4 relative z-10">
                       {/* Header */}
                       <div className="flex justify-between items-start">
                         <div className="flex items-center gap-3">
                           {finding.severity === 'critical' ? (
                              <div className="w-10 h-10 rounded-lg bg-ng-error/20 flex items-center justify-center text-ng-error drop-shadow-[0_0_8px_rgba(255,85,85,0.8)]"><Skull className="w-5 h-5" /></div>
                           ) : (
                              <div className="w-10 h-10 rounded-lg bg-ng-lime/20 flex items-center justify-center text-ng-lime drop-shadow-[0_0_8px_rgba(105,253,93,0.8)]"><Shield className="w-5 h-5" /></div>
                           )}
                           <div className="flex flex-col">
                             <span className="font-mono text-sm font-bold text-ng-on tracking-widest">{finding.id.substring(0,8).toUpperCase()}-XC</span>
                             <span className="text-[10px] font-mono text-ng-muted uppercase tracking-widest">{timeAgo(finding.created_at)}</span>
                           </div>
                         </div>
                         <div className={`px-3 py-1 rounded-md border font-mono text-[10px] font-bold uppercase tracking-widest ${sevBg} ${sevColor} shadow-[0_0_10px_currentColor]`}>
                           {finding.severity}
                         </div>
                       </div>

                       {/* Body */}
                       <div className="text-[15px] font-semibold text-white tracking-wide mt-1 drop-shadow-md">
                         {finding.title.split('(')[0] || "Malicious Process Execution"}
                       </div>
                       
                       <div className="flex justify-between bg-black/40 rounded-lg p-3 border border-ng-outline-dim/20">
                          <div className="flex flex-col">
                             <span className="text-[9px] font-mono text-ng-muted tracking-widest uppercase mb-1">Source IP</span>
                             <span className="text-xs font-mono text-ng-on bg-[#1a1a1a] px-2 py-0.5 rounded">{finding.ip || '192.168.1.105'}</span>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[9px] font-mono text-ng-muted tracking-widest uppercase mb-1">Affected Asset</span>
                             <span className="text-xs font-mono text-ng-on bg-[#1a1a1a] px-2 py-0.5 rounded">{finding.domain || 'DB-SRV-01'}</span>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full bg-ng-lime animate-pulse shadow-[0_0_8px_rgba(105,253,93,0.8)]" />
                          <span className="text-[11px] font-mono text-ng-lime uppercase tracking-widest font-bold">Active - Investigating</span>
                       </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-stretch border-t border-ng-lime/20 mt-auto relative z-10 bg-black/40 backdrop-blur-sm">
                       <button 
                         onClick={() => { setSelectedFindingId(finding.id); setIsHistoryOpen(true); }}
                         className="flex-[2] py-3 bg-ng-lime/10 text-ng-lime font-bold font-mono text-[11px] tracking-widest uppercase hover:bg-ng-lime hover:text-black transition-colors"
                       >
                         View Details
                       </button>
                       <button 
                         onClick={() => setDialogState({ open: true, action: "dismiss", finding })}
                         className="flex-[1] py-3 text-ng-muted font-bold font-mono text-[11px] tracking-widest uppercase hover:bg-ng-outline-dim/30 hover:text-white transition-colors border-l border-ng-lime/20"
                       >
                         Dismiss
                       </button>
                    </div>
                 </div>
                 );
               })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Visualizations */}
      <div className="flex-[1] flex flex-col gap-6 min-w-[320px]">
         <GlobeSVG />

         {/* Stats Block */}
         <div className="grid grid-cols-4 gap-px bg-ng-outline-dim/30 border border-ng-outline-dim/30 rounded-xl overflow-hidden shrink-0">
           <div className="bg-ng-base p-4 flex flex-col items-center justify-center">
             <span className="text-3xl font-mono text-ng-error">{findings.filter(f => f.severity === 'critical').length || 12}</span>
             <span className="text-[9px] font-mono text-ng-muted tracking-widest uppercase mt-2">Critical</span>
           </div>
           <div className="bg-ng-base p-4 flex flex-col items-center justify-center">
             <span className="text-3xl font-mono text-[#F59E0B]">{findings.filter(f => f.severity === 'high').length || 45}</span>
             <span className="text-[9px] font-mono text-ng-muted tracking-widest uppercase mt-2">High</span>
           </div>
           <div className="bg-ng-base p-4 flex flex-col items-center justify-center">
             <span className="text-3xl font-mono text-ng-cyan-bright">{findings.filter(f => f.severity === 'medium').length || 112}</span>
             <span className="text-[9px] font-mono text-ng-muted tracking-widest uppercase mt-2">Medium</span>
           </div>
           <div className="bg-ng-base p-4 flex flex-col items-center justify-center">
             <span className="text-3xl font-mono text-ng-lime">{findings.filter(f => f.severity === 'low').length || 28}</span>
             <span className="text-[9px] font-mono text-ng-muted tracking-widest uppercase mt-2">Low</span>
           </div>
         </div>

         <GaugeSVG />
      </div>

    </div>

    <FindingHistoryModal 
      isOpen={isHistoryOpen}
      onClose={() => setIsHistoryOpen(false)}
      findingId={selectedFindingId}
    />
    {dialogState && (
      <ConfirmActionDialog
        isOpen={dialogState.open}
        onClose={() => setDialogState(null)}
        action={dialogState.action.toUpperCase()}
        description={`${dialogState.action} finding: ${dialogState.finding.title || dialogState.finding.id}`}
        endpoint={`/api/proxy/api/v1/findings/${dialogState.finding.id}/action`}
        body={{ action: dialogState.action }}
        variant="default"
        allowComment={true}
        onSuccess={() => mutate()}
      />
    )}
 </div>
 );
}
