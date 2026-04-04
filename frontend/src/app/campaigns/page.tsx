"use client";

import React from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, Globe, PlayCircle, ShieldBan, Activity } from 'lucide-react';
import useSWR from "swr";
import { motion } from "framer-motion";
import { StaggerChildren, AnimatedNumber, FadeIn, ShimmerSkeleton, PanelCard } from "@/components/ui/MotionWrappers";
import { DataGrid } from '@/components/ui/DataGrid';
import { VectorMap } from '@/components/ui/VectorMap';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Campaign { id: string; name?: string; severity?: string; stage?: string; active?: boolean; affected_assets?: number; meta_score?: number; created_at?: string; mitre_tags?: string[]; }

export default function CampaignsPage() {
  const { data: campaigns, error, isLoading } = useSWR<Campaign[]>('/api/proxy/api/v1/campaigns', fetcher, { refreshInterval: 5000 });
  const campaignList: Campaign[] = Array.isArray(campaigns) ? campaigns : [];

  const activeThreats = campaignList.length;
  const blockedCount = campaignList.filter(c => c.active === false || c.stage === 'closed' || c.stage === 'mitigated' || c.stage === 'resolved').length;
  const criticalCount = campaignList.filter(c => c.severity === 'critical' || (c.meta_score != null && c.meta_score > 0.8)).length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-sf-bg flex flex-col min-h-0 space-y-4">
      <div className="flex flex-col xl:flex-row gap-4 w-full h-full max-w-[1600px] mx-auto min-h-0">
        
        {/* Left Column: Metrics & Map */}
        <div className="flex-[2] flex flex-col gap-4 min-h-0">
            {/* KPI Row */}
            <div className="flex gap-4 shrink-0">
                <PanelCard className="flex-1 p-4 flex flex-col">
                    <p className="text-[10px] text-sf-muted font-mono tracking-widest uppercase mb-1">Active Threats</p>
                    <p className="text-3xl font-mono text-sf-warning">
                        {isLoading ? <ShimmerSkeleton className="w-16 h-8" /> : <AnimatedNumber value={activeThreats} />}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-sf-muted font-mono mt-2">
                        <TrendingUp className="w-3 h-3" /> {error ? 'DEMO DATA' : 'LIVE COUNT'}
                    </div>
                </PanelCard>
                 <PanelCard className="flex-1 p-4 flex flex-col">
                    <p className="text-[10px] text-sf-muted font-mono tracking-widest uppercase mb-1">Blocked / Resolved</p>
                    <p className="text-3xl font-mono text-sf-safe">
                        {isLoading ? <ShimmerSkeleton className="w-16 h-8" /> : <AnimatedNumber value={blockedCount} />}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-sf-muted font-mono mt-2">
                        <ShieldCheck className="w-3 h-3" /> {campaignList.length > 0 ? `${Math.round((blockedCount / campaignList.length) * 100)}% MITIGATED` : 'NO CAMPAIGNS'}
                    </div>
                </PanelCard>
                 <PanelCard className="flex-1 p-4 flex flex-col">
                    <p className="text-[10px] text-sf-muted font-mono tracking-widest uppercase mb-1">Critical Priority</p>
                    <p className="text-3xl font-mono text-sf-critical text-shadow">
                        {isLoading ? <ShimmerSkeleton className="w-16 h-8" /> : <AnimatedNumber value={criticalCount} format={n => String(n).padStart(2, '0')} />}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] text-sf-muted font-mono mt-2">
                        <AlertTriangle className="w-3 h-3 text-sf-critical" /> {criticalCount > 0 ? 'IMMEDIATE ACTION REQ' : 'ALL CLEAR'}
                    </div>
                </PanelCard>
            </div>

            {/* Global Threat Map */}
            <PanelCard className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-sf-surface border border-sf-border px-2 py-0.5">
                    <span className="text-[10px] text-sf-accent font-mono tracking-widest flex items-center gap-2">
                         <Globe className="w-3 h-3 text-sf-accent" />
                         GLOBAL THREAT EXPOSURE
                    </span>
                </div>
                <div className="absolute bottom-3 left-3 z-10 bg-sf-surface border border-sf-border px-2 py-0.5">
                    <span className="text-[10px] text-sf-muted font-mono tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-none bg-sf-accent animate-pulse-fast border border-black/50" /> LIVE SYNC
                    </span>
                 </div>
                 
                <div className="flex-1 w-full h-full relative">
                    <VectorMap />
                </div>
            </PanelCard>
        </div>

        {/* Right Column: Campaigns Grid & Actions */}
        <div className="flex-1 flex flex-col gap-4 min-w-[350px]">
            <PanelCard className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-sf-border bg-sf-surface shrink-0">
                    <h3 className="text-[10px] font-mono tracking-widest text-sf-muted uppercase flex items-center gap-2">
                        <Activity className="w-3 h-3 text-sf-text" /> Priority Campaigns
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {isLoading ? (
                         <div className="space-y-4 p-2">
                            {Array.from({ length: 3 }).map((_, i) => <ShimmerSkeleton key={i} className="w-full h-12" />)}
                         </div>
                    ) : campaignList.length === 0 ? (
                        <div className="text-sf-muted text-[10px] p-4 font-mono uppercase tracking-widest text-center">
                            {error ? 'Backend unavailable — no campaigns.' : 'No active campaigns.'}
                        </div>
                    ) : (
                        <DataGrid 
                            data={campaignList.slice().sort((a,b) => (b.meta_score || 0) - (a.meta_score || 0))}
                            rowKey="id"
                            columns={[
                                {
                                    header: "!",
                                    key: "meta_score",
                                    render: (_, row) => {
                                        const c = (row.severity === 'critical' || (row.meta_score || 0) > 0.8) ? 'bg-sf-critical text-sf-bg' : ((row.severity === 'high' || (row.meta_score || 0) > 0.6) ? 'bg-sf-warning text-sf-bg' : 'bg-sf-surface text-sf-muted border border-sf-border');
                                        return <div className={`w-5 h-5 flex items-center justify-center font-bold text-[9px] ${c}`}>{row.active === false ? 'X' : '!'}</div>;
                                    }
                                },
                                {
                                    header: "ID",
                                    key: "id",
                                    render: (val, row) => (
                                         <div className="flex flex-col">
                                            <span className="font-mono text-[11px] text-sf-text font-bold">{val}</span>
                                            <span className="font-mono text-[9px] text-sf-muted">STAGE: {row.stage || 'UNK'}</span>
                                         </div>
                                    )
                                },
                                {
                                    header: "MITRE",
                                    key: "mitre_tags",
                                    render: (val: string[]) => (
                                        <div className="flex flex-wrap gap-1">
                                            {(val || []).slice(0,2).map(t => <span key={t} className="text-[9px] font-mono border border-sf-border text-sf-muted px-1 truncate max-w-[60px]" title={t}>{t}</span>)}
                                        </div>
                                    )
                                },
                                {
                                    header: "SEV",
                                    key: "severity",
                                    align: "right",
                                    render: (val, row) => (
                                        <span className={`text-[10px] font-mono tracking-widest ${row.active === false ? 'text-sf-disabled' : val === 'critical' ? 'text-sf-critical' : val === 'high' ? 'text-sf-warning' : 'text-sf-text'}`}>
                                            {row.active === false ? 'CLOSED' : val?.toUpperCase()}
                                        </span>
                                    )
                                }
                            ]}
                        />
                    )}
                </div>
            </PanelCard>
            
            <div className="grid grid-cols-2 gap-4 shrink-0">
                <button className="flex items-center justify-center gap-2 h-12 bg-sf-surface hover:bg-sf-critical hover:text-black border border-sf-critical text-sf-critical text-[10px] uppercase font-bold tracking-widest transition-colors font-mono">
                    <ShieldBan className="w-3 h-3" /> Isolate Network
                </button>
                <button className="flex items-center justify-center gap-2 h-12 bg-sf-text hover:bg-sf-text/90 text-sf-bg text-[10px] uppercase font-bold tracking-widest transition-colors font-mono">
                    <PlayCircle className="w-3 h-3" /> Run Playbook
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
