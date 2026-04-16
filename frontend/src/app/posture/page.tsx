"use client";

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import useSWR from 'swr';
import { PanelCard, AnimatedNumber, StaggerChildren } from '@/components/ui/MotionWrappers';
import { DataGrid } from '@/components/ui/DataGrid';
import { Sparkline } from '@/components/ui/Sparkline';
import { RealSparkline } from '@/components/ui/RealSparkline';
import { Skeleton } from '@/components/ui/Skeleton';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Types ───────────────────────────────────────────────
interface PostureScore { composite: number; domains: Record<string, number>; last_evaluated: number; }
interface PostureDomain { id: string; name: string; weight: number; score: number; description: string; top_findings: string[]; trend: 'up' | 'down' | 'stable'; }
interface PostureDomainsResponse { domains: PostureDomain[]; }
interface MitreTechnique { id: string; name: string; coverage: 'covered' | 'partial' | 'blind'; tools?: string[]; fix?: string; campaign_linked?: boolean; }
interface MitreTactic { tactic: string; techniques: MitreTechnique[]; }
interface PostureCoverageResponse { tactics: MitreTactic[]; }
interface RemediationFinding { id: string; domain: string; title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; effort: 'low' | 'medium' | 'high'; priority: number; linked_campaigns: string[]; linked_techniques: string[]; status: string; }
interface RemediationResponse { findings: RemediationFinding[]; }
interface HistoryPoint { date: string; score: number; }
interface HistoryResponse { data_points: HistoryPoint[]; }

// ─── Sub-components ──────────────────────────────────────
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-sf-safe" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-sf-critical" />;
  return <Minus className="w-3 h-3 text-sf-muted" />;
}

function CoverageDot({ coverage }: { coverage: MitreTechnique['coverage'] }) {
  const colors: Record<string, string> = {
    covered: 'bg-sf-safe',
    partial: 'bg-sf-warning',
    blind: 'bg-sf-critical',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-none border border-black/20 ${colors[coverage]}`} title={coverage} />;
}

type SortKey = 'priority' | 'severity' | 'effort';
const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const EFFORT_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

export default function PosturePage() {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(true);

  const { data: scoreData, error: scoreError, isLoading: scoreLoading } = useSWR<PostureScore>('/api/proxy/api/v1/posture/score', fetcher, { refreshInterval: 10000, keepPreviousData: true });
  const { data: domainsData, error: domainsError, isLoading: domainsLoading } = useSWR<PostureDomainsResponse>('/api/proxy/api/v1/posture/domains', fetcher, { refreshInterval: 10000, keepPreviousData: true });
  const { data: coverageData, error: coverageError, isLoading: coverageLoading } = useSWR<PostureCoverageResponse>('/api/proxy/api/v1/posture/coverage', fetcher, { refreshInterval: 30000, keepPreviousData: true });
  const { data: remediationData, isLoading: remediationLoading } = useSWR<RemediationResponse>('/api/proxy/api/v1/posture/remediation', fetcher, { refreshInterval: 10000, keepPreviousData: true });
  const { data: historyData, error: historyError, isLoading: historyLoading } = useSWR<HistoryResponse>('/api/proxy/api/v1/posture/history', fetcher, { refreshInterval: 60000, keepPreviousData: true });

  const isInitialLoading = scoreLoading && !scoreData && domainsLoading && !domainsData;

  const score = scoreData ?? { composite: 71, domains: {}, last_evaluated: 0 };
  const domains = domainsError ? [
      { id: "1", name: "IAM", weight: 0.2, score: 92, description: "", top_findings: [], trend: "up" as const },
      { id: "2", name: "Network", weight: 0.3, score: 68, description: "", top_findings: [], trend: "stable" as const },
      { id: "3", name: "Compute", weight: 0.2, score: 85, description: "", top_findings: [], trend: "up" },
      { id: "4", name: "Data", weight: 0.2, score: 55, description: "", top_findings: [], trend: "down" as const },
      { id: "5", name: "AppSec", weight: 0.1, score: 72, description: "", top_findings: [], trend: "stable" as const }
  ] : (domainsData?.domains ?? []);
  const tactics = coverageData?.tactics ?? [];
  const findings = remediationData?.findings ?? [];
  
  // Create solid demo data if none exists
  const historyPoints = historyError ? Array.from({ length: 30 }, (_, i) => ({
      date: `14:${i<10?'0':''}${i}`,
      score: 62 + Math.round(Math.sin(i * 0.4) * 7 + i * 0.3) + Math.random() * 5
  })) : (historyData?.data_points ?? []);

  const calculatedComposite = domains.reduce((sum, d) => sum + (d.score ?? 0) * (d.weight ?? 0.2), 0);
  const compositeScore = typeof score?.composite === 'number' && !isNaN(score.composite) ? score.composite : (calculatedComposite > 0 ? calculatedComposite : 71);
  const scoreColor = compositeScore > 80 ? 'text-sf-safe' : compositeScore > 60 ? 'text-sf-warning' : 'text-sf-critical';

  const sortedFindings = [...findings].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'priority') cmp = a.priority - b.priority;
    else if (sortKey === 'severity') cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    else if (sortKey === 'effort') cmp = EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort];
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-6 relative bg-transparent flex flex-col min-h-0">
      <AmbientBackground variant="dotgrid" />
      <div className="relative z-10 w-full max-w-[1600px] mx-auto min-h-0 flex flex-col gap-6">

      {/* ── Hero: Composite Score + 30-day Sparkline ── */}
      <div className="flex flex-col md:flex-row gap-6">
        <PanelCard className="flex-1 p-6 flex flex-col justify-between overflow-hidden relative group">
          {isInitialLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-24" />
              <Skeleton className="h-8 w-full mt-4" />
            </div>
          ) : (
            <>
              <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
                <div className={`text-9xl font-display leading-none tracking-tighter ${scoreColor}`}>{Math.round(compositeScore)}</div>
              </div>
              <div>
                <h2 className="text-[10px] font-mono tracking-widest text-sf-muted uppercase">Global Posture Score</h2>
                <div className={`flex items-baseline gap-2 mt-2`}>
                    <span className={`text-[72px] font-extralight leading-none ${scoreColor}`} style={{ fontFamily: "var(--font-inter, sans-serif)" }}>
                        <AnimatedNumber value={Math.round(compositeScore)} />
                    </span>
                    <span className="text-[16px] text-sf-muted">/100</span>
                </div>
              </div>
              <RealSparkline source="posture" width={400} height={48} className="mt-4" />
            </>
          )}
        </PanelCard>

        {/* ── Domain Cards ── */}
        <div className="flex-[2] grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StaggerChildren staggerDelay={0.05} className="col-span-full grid grid-cols-2 lg:grid-cols-5 gap-4">
              {isInitialLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <PanelCard key={i} className="p-3 flex flex-col gap-4">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-8 w-10" />
                    <Skeleton className="h-1 w-full" />
                  </PanelCard>
                ))
              ) : (
                domains.map(domain => {
                    const domainScore = domain.score ?? 0;
                    const ringColor = domainScore > 80 ? 'var(--sf-safe)' : domainScore > 60 ? 'var(--sf-warning)' : 'var(--sf-critical)';
                    return (
                        <PanelCard key={domain.id} className="p-3 flex flex-col justify-between relative">
                            {domainsError && <span className="absolute top-2 left-2 text-[8px] bg-sf-warning/20 border border-sf-warning/40 text-sf-warning px-1 font-mono">[DEMO]</span>}
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-mono font-bold uppercase text-sf-muted ${domainsError ? 'ml-10' : ''}`}>{domain.name}</span>
                                <TrendIcon trend={domain.trend} />
                            </div>
                            <div className="text-3xl font-mono text-sf-text my-2" style={{ color: ringColor }}>
                                {Math.round(domainScore)}
                            </div>
                             <div className="w-full h-1 bg-sf-surface border border-sf-border relative">
                                <div className="absolute top-0 left-0 h-full transition-all" style={{ width: `${domainScore}%`, backgroundColor: ringColor }} />
                            </div>
                        </PanelCard>
                    );
                })
              )}
          </StaggerChildren>
        </div>
      </div>

      {/* ── MITRE ATT&CK Coverage Heatmap ── */}
      <PanelCard className="p-4">
          <div className="flex items-center justify-between mb-4 border-b border-sf-border pb-2">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-sf-muted">MITRE ATT&amp;CK COVERAGE</h3>
            <div className="flex items-center gap-4 text-[9px] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-sf-safe inline-block border border-black/30" /> COVERED</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-sf-warning inline-block border border-black/30" /> PARTIAL</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-sf-critical inline-block border border-black/30" /> BLIND</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {tactics.length === 0 ? (
              <p className="text-sf-muted font-mono text-xs text-center py-4 uppercase tracking-widest">Connect data sources to populate matrix</p>
            ) : (
              <div className="space-y-4 min-w-[800px]">
                {tactics.map((tactic) => (
                  <div key={tactic.tactic} className="flex flex-col">
                    <p className="text-[9px] font-bold uppercase font-mono text-sf-muted mb-1.5">{tactic.tactic}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tactic.techniques.map((tech) => (
                        <div
                          key={tech.id}
                          className="flex items-center gap-1.5 bg-sf-surface border border-sf-border rounded-none px-1.5 py-0.5"
                          title={tech.fix ?? tech.name}
                        >
                          <CoverageDot coverage={tech.coverage} />
                          <span className="text-[9px] font-mono text-sf-text">{tech.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </PanelCard>

      {/* ── Remediation Queue ── */}
      <PanelCard className="flex flex-col">
          <div className="px-4 py-3 border-b border-sf-border flex justify-between items-center bg-sf-surface">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-sf-muted">REMEDIATION QUEUE</h3>
          </div>
          <div className="p-2">
            {findings.length === 0 ? (
                 <p className="text-sf-muted font-mono text-[10px] p-4">NO REMEDIATION ITEMS</p>
            ) : (
                <DataGrid
                    data={sortedFindings}
                    rowKey="id"
                    columns={[
                        { header: "PRI", key: "priority", render: (val) => <span className="text-sf-muted font-mono">{val}</span> },
                        { header: "FINDING", key: "title", render: (val, row) => (
                            <div>
                                <span className="font-medium text-sf-text">{val}</span>
                                <span className="block text-[9px] text-sf-muted mt-0.5">{row.description}</span>
                            </div>
                        )},
                        { header: "SEV", key: "severity", render: (val) => (
                            <span className={`px-1.5 py-0.5 text-[9px] uppercase border ${val === 'critical' ? 'border-sf-critical text-sf-critical' : val === 'high' ? 'border-sf-warning text-sf-warning' : 'border-sf-border text-sf-muted'}`}>{val}</span>
                        )},
                        { header: "EFFORT", key: "effort", render: (val) => <span className="text-sf-muted uppercase text-[9px]">{val}</span> },
                        { header: "STATUS", key: "status", render: (val) => (
                             <span className={`text-[9px] font-bold uppercase ${val === 'open' ? 'text-sf-critical' : val === 'in_progress' ? 'text-sf-warning' : 'text-sf-safe'}`}>
                                {val.replace('_', ' ')}
                            </span>
                        )}
                    ]}
                />
            )}
          </div>
      </PanelCard>
      </div>

    </div>
  );
}
