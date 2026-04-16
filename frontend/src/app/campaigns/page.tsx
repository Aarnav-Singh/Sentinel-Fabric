"use client";

import React from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, Globe, PlayCircle, ShieldBan, Activity } from 'lucide-react';
import useSWR from "swr";
import { motion } from "framer-motion";
import { StaggerChildren, AnimatedNumber, FadeIn, ShimmerSkeleton, PanelCard } from "@/components/ui/MotionWrappers";
import { DataGrid } from '@/components/ui/DataGrid';
import { VectorMap } from '@/components/ui/VectorMap';
import { useToast } from '@/components/ui/Toast';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { Badge } from '@/components/ui/Badge';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Campaign { id: string; name?: string; severity?: string; stage?: string; active?: boolean; affected_assets?: number; meta_score?: number; created_at?: string; mitre_tags?: string[]; }

export default function CampaignsPage() {
  const { toast } = useToast();
  const { data: campaigns, error, isLoading } = useSWR<Campaign[]>('/api/proxy/api/v1/campaigns', fetcher, { refreshInterval: 5000 });
  const campaignList: Campaign[] = Array.isArray(campaigns) ? campaigns : [];

  const activeThreats = campaignList.length;
  const blockedCount = campaignList.filter(c => c.active === false || c.stage === 'closed' || c.stage === 'mitigated' || c.stage === 'resolved').length;
  const criticalCount = campaignList.filter(c => c.severity === 'critical' || (c.meta_score != null && c.meta_score > 0.8)).length;

  const campaignName = (c: any) =>
    c.name ||
    [c.mitre_tactics?.[0], c.stage].filter(Boolean).join("-") ||
    `CAMPAIGN-${String(c.id).slice(0, 6).toUpperCase()}`;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-transparent flex flex-col min-h-0 space-y-4 relative">
      <AmbientBackground variant="threatmap" />
      <div className="flex flex-col xl:flex-row gap-4 w-full h-full max-w-[1600px] mx-auto min-h-0 relative z-10">
        
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
                        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
                            <ShieldCheck className="w-8 h-8 text-sf-safe opacity-50" />
                            <div className="text-sf-muted text-[10px] font-mono uppercase tracking-widest text-center">
                                {error ? 'Backend unavailable — no campaigns.' : 'No active campaigns detected.'}
                            </div>
                            {!error && (
                                <button onClick={() => toast("Manual threat sweep initiated.", "success")} className="px-4 py-2 border border-sf-border hover:bg-sf-surface text-[10px] font-mono text-sf-text tracking-widest transition-colors flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> RUN MANUAL SCAN
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 p-2">
                          {campaignList.sort((a,b) => (b.meta_score || 0) - (a.meta_score || 0)).map((c: any) => (
                            <div
                              key={c.id}
                              className="sf-panel p-3 cursor-pointer hover:border-sf-border-active transition-colors group"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <Badge label={c.active === false ? 'CLOSED' : (c.severity?.toUpperCase() || "UNKNOWN")} severity={c.active === false ? 'info' : (c.severity || "info")} />
                                  <span className="text-[13px] text-sf-text font-medium truncate">{campaignName(c)}</span>
                                </div>
                                <span className="text-sf-muted text-[10px] font-mono">→</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-mono text-sf-muted">
                                {c.mitre_tactics?.slice(0, 3).map((t: string) => <span key={t}>{t}</span>)}
                                {c.stage && <><span className="text-sf-border">·</span><span>{c.stage}</span></>}
                                {c.meta_score != null && <><span className="text-sf-border">·</span><span className="text-sf-warning">Score: {c.meta_score.toFixed(2)}</span></>}
                              </div>
                              {c.affected_assets && (
                                <div className="text-[10px] text-sf-muted mt-1">{c.affected_assets} affected assets · Started {c.created_at ? new Date(c.created_at).toLocaleString() : "unknown"}</div>
                              )}
                            </div>
                          ))}
                        </div>
                    )}
                </div>
            </PanelCard>
            
            <div className="grid grid-cols-2 gap-4 shrink-0">
                <button onClick={() => toast("Network isolation protocol initiated.", "error")} className="flex items-center justify-center gap-2 h-12 bg-sf-surface hover:bg-sf-critical hover:text-black border border-sf-critical text-sf-critical text-[10px] uppercase font-bold tracking-widest transition-colors font-mono">
                    <ShieldBan className="w-3 h-3" /> Isolate Network
                </button>
                <button onClick={() => toast("Defensive playbook execution started.", "success")} className="flex items-center justify-center gap-2 h-12 bg-sf-text hover:bg-sf-text/90 text-sf-bg text-[10px] uppercase font-bold tracking-widest transition-colors font-mono">
                    <PlayCircle className="w-3 h-3" /> Run Playbook
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
