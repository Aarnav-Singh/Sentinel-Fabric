"use client";

import React from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, Globe, PlayCircle, ShieldBan, Activity } from 'lucide-react';
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Campaign {
  id: string;
  name?: string;
  severity?: string;
  stage?: string;
  active?: boolean;
  affected_assets?: number;
  meta_score?: number;
  created_at?: string;
  mitre_tags?: string[];
}

function SkeletonStat() {
  return <span className="motion-safe:animate-pulse bg-sf-surface-raised rounded inline-block w-16 h-8" />;
}

export default function CampaignsPage() {
  const { data: campaigns, error, isLoading } = useSWR<Campaign[]>('/api/proxy/api/v1/campaigns', fetcher, { refreshInterval: 5000 });
  const campaignList: Campaign[] = Array.isArray(campaigns) ? campaigns : [];

  // KPI derivations from live data
  const activeThreats = campaignList.length;
  const blockedCount = campaignList.filter(c =>
    c.active === false || c.stage === 'closed' || c.stage === 'mitigated' || c.stage === 'resolved'
  ).length;
  const criticalCount = campaignList.filter(c =>
    c.severity === 'critical' || (c.meta_score != null && c.meta_score > 0.8)
  ).length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-transparent">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sf-text tracking-tight">Active Campaigns</h1>
            <p className="text-sm text-sf-muted mt-1">Real-time threat tracking and orchestration matrix.</p>
          </div>
        </div>

        {/* Metric Row — Open Canvas */}
        <div className="flex justify-between items-center border-b border-white/5 pb-8">
          <div>
            <p className="text-[10px] text-sf-muted uppercase font-medium tracking-widest mb-2">Active Threats</p>
            <p className="text-4xl font-display font-light text-white">
              {isLoading ? <SkeletonStat /> : activeThreats}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-sf-accent font-mono mt-2">
              <TrendingUp className="w-3 h-3" />
              <span>{error ? 'DEMO DATA' : 'LIVE COUNT'}</span>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-sf-muted uppercase font-medium tracking-widest mb-2">Blocked / Resolved</p>
            <p className="text-4xl font-display font-light text-sf-safe">
              {isLoading ? <SkeletonStat /> : blockedCount}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-sf-safe font-mono mt-2">
              <ShieldCheck className="w-3 h-3" />
              <span>
                {campaignList.length > 0
                  ? `${Math.round((blockedCount / campaignList.length) * 100)}% MITIGATION RATE`
                  : 'NO ACTIVE CAMPAIGNS'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-sf-muted uppercase font-medium tracking-widest mb-2">Critical Priority</p>
            <p className="text-4xl font-display font-light text-sf-critical drop-shadow-[0_0_10px_var(--sf-critical)]">
              {isLoading ? <SkeletonStat /> : String(criticalCount).padStart(2, '0')}
            </p>
            <div className="flex items-center justify-end gap-2 text-[10px] text-sf-critical font-mono mt-2">
              <AlertTriangle className="w-3 h-3" />
              <span>{criticalCount > 0 ? 'IMMEDIATE ACTION REQ' : 'ALL CLEAR'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Global Threat Matrix */}
          <div className="lg:col-span-2 pt-6 relative group min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-8 z-10 relative">
              <h2 className="text-[10px] font-medium text-sf-muted uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-4 h-4 text-sf-accent" />
                Global Threat Exposure
              </h2>
              <div className="text-[10px] font-mono text-sf-accent flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sf-accent motion-safe:animate-pulse" />
                LIVE SYNC: ACTIVE
              </div>
            </div>

            {/* 2D Topographic Visualization Container */}
            <div className="flex-1 relative w-full h-64 md:h-80 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.05)_0%,transparent_70%)]" />
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--sf-border)" strokeWidth="0.5" strokeDasharray="2 2" />
                      </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  {/* Topographic contours */}
                  <path className="motion-safe:animate-pulse duration-1000" d="M -50,150 Q 200,50 400,200 T 900,100" fill="none" stroke="var(--sf-accent)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <path className="motion-safe:animate-pulse duration-700" d="M -50,250 Q 250,150 450,300 T 900,200" fill="none" stroke="var(--sf-accent-2)" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
                  
                  {/* Pulsating threat nodes */}
                  {criticalCount > 0 && (
                      <g transform="translate(250, 120)">
                          <circle cx="0" cy="0" r="20" fill="var(--sf-critical)" opacity="0.1" className="motion-safe:animate-ping duration-1000" />
                          <circle cx="0" cy="0" r="3" fill="var(--sf-critical)" />
                      </g>
                  )}
                  {activeThreats > 0 && (
                      <g transform="translate(500, 220)">
                          <circle cx="0" cy="0" r="15" fill="var(--sf-warning)" opacity="0.1" className="motion-safe:animate-ping duration-1000" />
                          <circle cx="0" cy="0" r="2" fill="var(--sf-warning)" />
                      </g>
                  )}
              </svg>

              <div className="absolute bottom-0 right-0 font-mono text-[10px] text-sf-accent flex flex-col gap-1 text-right">
                  <span>DAT_STREAM</span>
                  <span>CAMPAIGNS: {activeThreats}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Campaigns & Actions */}
          <div className="flex flex-col gap-6 pt-6 border-l border-white/5 pl-8">
            <div className="flex flex-col gap-4 flex-1">
              <h3 className="text-[10px] font-medium uppercase text-sf-muted tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3 text-sf-accent-2" />
                Priority Campaigns
              </h3>

              <div className="space-y-2 overflow-y-auto pr-2 max-h-[300px] custom-scrollbar">
                {isLoading && (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="motion-safe:animate-pulse bg-sf-surface/20 border-b border-white/5 h-16" />
                    ))}
                  </div>
                )}
                {!isLoading && campaignList.length === 0 && (
                  <div className="text-sf-muted text-[10px] py-4 font-mono uppercase">
                    {error ? 'Backend unavailable — no campaigns.' : 'No active campaigns.'}
                  </div>
                )}
                {campaignList.map((camp: Campaign) => {
                  const isCritical = camp.severity === 'critical' || (camp.meta_score != null && camp.meta_score > 0.8);
                  const isHigh = camp.severity === 'high' || (camp.meta_score != null && camp.meta_score > 0.6);
                  const colorHex = isCritical ? 'var(--sf-critical)' : (isHigh ? 'var(--sf-warning)' : 'var(--sf-accent)');

                  return (
                    <div key={camp.id} className="py-2 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">{camp.id}</h4>
                          <p className="text-[10px] text-sf-muted mt-1 font-mono uppercase">Stage: {camp.stage ?? 'unknown'}</p>
                          {(camp.mitre_tags && camp.mitre_tags.length > 0) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {camp.mitre_tags.map(tag => (
                                <span key={tag} className="text-[9px] font-mono text-sf-muted group-hover:text-sf-accent transition-colors">
                                  [{tag}]
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-right" style={{ color: colorHex }}>
                          {camp.active === false ? 'CLOSED' : (isCritical ? 'CRITICAL' : 'SCANNING')}
                        </span>
                      </div>
                      <div className="w-full h-[1px] bg-white/5 mt-2 overflow-hidden relative">
                        <div
                          className="h-full absolute left-0 top-0 transition-all duration-700"
                          style={{ width: `${Math.max(10, (camp.meta_score ?? 0.5) * 100)}%`, backgroundColor: colorHex }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <button className="flex items-center justify-center gap-2 h-14 border border-sf-critical/20 text-sf-critical text-[10px] uppercase font-bold tracking-widest hover:bg-sf-critical/10 transition-colors">
                <ShieldBan className="w-4 h-4" /> Isolate
              </button>
              <button className="flex items-center justify-center gap-2 h-14 border border-sf-accent-2/20 text-sf-accent-2 text-[10px] uppercase font-bold tracking-widest hover:bg-sf-accent-2/10 transition-colors">
                <PlayCircle className="w-4 h-4" /> Playbooks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
