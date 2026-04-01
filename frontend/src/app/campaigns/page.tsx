"use client";

import React from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, Globe, PlayCircle, ShieldBan, Activity, Search } from 'lucide-react';
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
  return <span className="animate-pulse bg-slate-700 rounded inline-block w-16 h-8" />;
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Campaigns</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time threat tracking and orchestration matrix.</p>
          </div>
        </div>

        {/* Metric Cards — wired to live data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-brand-card/50 backdrop-blur-md border border-brand-border rounded-xl p-4 flex flex-col gap-2 border-l-4 border-l-brand-accent relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Active Threats</p>
            <p className="text-3xl font-bold text-white">
              {isLoading ? <SkeletonStat /> : activeThreats}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-brand-accent font-bold mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{error ? 'DEMO DATA' : 'LIVE COUNT'}</span>
            </div>
          </div>

          <div className="bg-brand-card/50 backdrop-blur-md border border-brand-border rounded-xl p-4 flex flex-col gap-2 border-l-4 border-l-[#f200ff] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#f200ff]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Blocked / Resolved</p>
            <p className="text-3xl font-bold text-white">
              {isLoading ? <SkeletonStat /> : blockedCount}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-[#f200ff] font-bold mt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>
                {campaignList.length > 0
                  ? `${Math.round((blockedCount / campaignList.length) * 100)}% MITIGATION RATE`
                  : 'NO ACTIVE CAMPAIGNS'}
              </span>
            </div>
          </div>

          <div className="bg-brand-card/50 backdrop-blur-md border border-brand-border rounded-xl p-4 flex flex-col gap-2 border-l-4 border-l-brand-critical relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-critical/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Critical</p>
            <p className="text-3xl font-bold text-white">
              {isLoading ? <SkeletonStat /> : String(criticalCount).padStart(2, '0')}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-brand-critical font-bold mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{criticalCount > 0 ? 'IMMEDIATE ACTION REQ' : 'ALL CLEAR'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Global Threat Matrix (3D Globe Visualization) */}
          <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-2xl p-6 relative overflow-hidden group min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4 z-10 relative">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-accent" />
                Global Threat Matrix
              </h2>
              <div className="bg-black/60 px-3 py-1 rounded-md border border-white/10 text-[10px] font-mono text-brand-accent flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                LIVE SYNC: ACTIVE
              </div>
            </div>

            {/* 3D Visualization Container */}
            <div className="flex-1 relative w-full rounded-xl border border-brand-border/50 bg-[#05080f] overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-accent/20 via-transparent to-transparent" />
              <div className="scan-line absolute inset-0 opacity-30" />
              <div className="node-map-bg absolute inset-0 opacity-50 mix-blend-overlay" />

              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border border-brand-accent/20 flex items-center justify-center group-hover:border-brand-accent/40 transition-colors duration-700">
                <div className="absolute inset-0 rounded-full border-t border-b border-brand-accent/40 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 rounded-full border-l border-r border-[#f200ff]/30 animate-[spin_15s_linear_infinite_reverse]" />

                <div className="w-[90%] h-[90%] rounded-full overflow-hidden relative mix-blend-lighten opacity-80 filter contrast-150 saturate-200">
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_rgba(0,242,255,0.4)] z-10" />
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBEPxHXU9LeAAK8R35Uksm7STdw2i3_dxci9ox_ULDmU6xq15uvwbFt_-DW234thOinvbNwgDc_66lnGglV1LwKJ02Grr4HK8d9M2502KS258J68M5OPVnm1HeHf9ZNizGfg8rhSYmgCN0evObOL3tlxaz7aSHrLYrn_hyjk4eepRHTyKTxEsX2PcS4hNwIEiXfjhVJRiqnAbO4w-GSezqkYfVVCQ0ahHRL_kEfGLbSSnjfEpQL8JRGhCBBmReQ0_YWa2sAXQuC2E"
                    alt="Holographic Earth"
                    className="w-full h-full object-cover opacity-60 mix-blend-screen"
                  />
                </div>

                {criticalCount > 0 && <div className="absolute top-[20%] left-[20%] w-2 h-2 bg-brand-critical rounded-full shadow-[0_0_15px_#f43f5e] animate-pulse" />}
                <div className="absolute bottom-[30%] right-[15%] w-2 h-2 bg-brand-accent rounded-full shadow-[0_0_15px_#00f2ff] animate-ping" />
                <div className="absolute top-[50%] left-[10%] w-1.5 h-1.5 bg-[#f200ff] rounded-full shadow-[0_0_15px_#f200ff]" />
                {activeThreats > 0 && <div className="absolute bottom-[20%] left-[40%] w-2 h-2 bg-brand-warning rounded-full shadow-[0_0_10px_#fbbf24] animate-pulse" />}
              </div>

              <div className="absolute bottom-4 left-4 font-mono text-[10px] text-brand-accent/70 flex flex-col gap-1">
                <span>DAT_STREAM: OK</span>
                <span>CAMPAIGNS: {activeThreats}</span>
                <span>CRITICAL: {criticalCount}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Campaigns & Actions */}
          <div className="flex flex-col gap-6">
            <div className="bg-brand-card border border-brand-border rounded-2xl p-5 flex flex-col gap-4 flex-1">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#f200ff]" />
                Priority Campaigns
              </h3>

              <div className="space-y-3 overflow-y-auto pr-2 max-h-[300px] custom-scrollbar">
                {isLoading && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse bg-brand-dark/50 rounded-xl p-3 border border-brand-border/50 h-16" />
                    ))}
                  </div>
                )}
                {!isLoading && campaignList.length === 0 && (
                  <div className="text-slate-500 text-xs py-4 text-center">
                    {error ? 'Backend unavailable — no campaigns to display.' : 'No active campaigns.'}
                  </div>
                )}
                {campaignList.map((camp: Campaign) => {
                  const isCritical = camp.severity === 'critical' || (camp.meta_score != null && camp.meta_score > 0.8);
                  const isHigh = camp.severity === 'high' || (camp.meta_score != null && camp.meta_score > 0.6);
                  const colorHex = isCritical ? '#f43f5e' : (isHigh ? '#fbbf24' : '#00f2ff');

                  return (
                    <div key={camp.id} className="bg-brand-dark/50 rounded-xl p-3 border border-brand-border/50 hover:bg-brand-surface transition-colors cursor-pointer" style={{ borderRightWidth: 4, borderRightColor: colorHex }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white">{camp.id}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 mb-1.5">Stage: {camp.stage ?? 'unknown'}</p>
                          {(camp.mitre_tags && camp.mitre_tags.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {camp.mitre_tags.map(tag => (
                                <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-brand-accent" title="MITRE ATT&CK Technique">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border ml-2 shrink-0" style={{ color: colorHex, backgroundColor: `${colorHex}15`, borderColor: `${colorHex}30` }}>
                          {camp.active === false ? 'CLOSED' : (isCritical ? 'CRITICAL' : 'SCANNING')}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(10, (camp.meta_score ?? 0.5) * 100)}%`,
                            backgroundColor: colorHex,
                            boxShadow: `0 0 8px ${colorHex}80`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="text-xs text-brand-accent text-center mt-2 hover:underline w-full">View All Campaigns &rarr;</button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl border border-brand-critical/40 bg-brand-critical/5 text-brand-critical font-bold text-xs uppercase tracking-tighter hover:bg-brand-critical/20 hover:border-brand-critical transition-all shadow-[inset_0_0_20px_rgba(244,63,94,0)] hover:shadow-[inset_0_0_20px_rgba(244,63,94,0.2)]">
                <ShieldBan className="w-5 h-5" />
                Isolate Net
              </button>
              <button className="flex flex-col items-center justify-center gap-2 h-20 rounded-xl border border-[#f200ff]/40 bg-[#f200ff]/5 text-[#f200ff] font-bold text-xs uppercase tracking-tighter hover:bg-[#f200ff]/20 hover:border-[#f200ff] transition-all shadow-[inset_0_0_20px_rgba(242,0,255,0)] hover:shadow-[inset_0_0_20px_rgba(242,0,255,0.2)]">
                <PlayCircle className="w-5 h-5" />
                Playbooks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
