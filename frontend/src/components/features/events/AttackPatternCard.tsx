"use client";

/**
 * AttackPatternCard
 * -----------------
 * Displays grouped MITRE ATT&CK attack chains detected by the Redis CEP engine.
 * Each card represents a complete multi-stage sequence identified via the
 * ``cep_sequence_id`` field on events.
 *
 * Data source: GET /api/v1/events/grouped
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Clock, Layers, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AttackGroup {
 cep_sequence_id: string;
 tactic: string;
 technique: string;
 event_count: number;
 first_seen: string;
 last_seen: string;
 peak_severity: string;
 event_ids: string[];
}

interface AttackPatternCardProps {
 /** Auto-refresh interval in ms. Defaults to 30s. */
 refreshInterval?: number;
 /** Max groups to show. Defaults to 6. */
 limit?: number;
 /** Called when the user clicks a card — passes the full CEP group. */
 onSelect?: (group: AttackGroup) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtRelTime(iso: string): string {
 try {
 const diffMs = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diffMs / 60_000);
 if (mins < 1) return 'just now';
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
 } catch {
 return '—';
 }
}

const SEV_BORDER: Record<string, string> = {
 critical: 'border-ng-error/50',
 high: 'border-[#f97316]/50',
 medium: 'border-[#ffee00]/30',
 low: 'border-ng-outline-dim/40',
 info: 'border-ng-outline-dim/40',
};

const SEV_GLOW: Record<string, string> = {
 critical: '0 0 12px rgba(220,38,38,0.2)',
 high: '0 0 8px rgba(249,115,22,0.15)',
 medium: '0 0 6px rgba(255,238,0,0.1)',
 low: 'none',
 info: 'none',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function AttackPatternCard({
 refreshInterval = 30_000,
 limit = 6,
 onSelect,
}: AttackPatternCardProps) {
 const [groups, setGroups] = useState<AttackGroup[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const fetchGroups = async () => {
 try {
 const res = await fetch(`/api/proxy/api/v1/events/grouped?limit=${limit}&hours=24`);
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const json = await res.json();
 setGroups(json.groups ?? []);
 setError(null);
 } catch (err: any) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchGroups();
 const timer = setInterval(fetchGroups, refreshInterval);
 return () => clearInterval(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [limit, refreshInterval]);

 if (loading) {
 return (
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
 {Array.from({ length: limit }).map((_, i) => (
 <div key={i} className="sf-shimmer h-28 rounded-none" />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="border border-ng-error/30 bg-ng-error/5 p-4 text-ng-error font-mono text-[10px]">
 GROUPED EVENTS UNAVAILABLE: {error}
 </div>
 );
 }

 if (groups.length === 0) {
 return (
 <div className="flex items-center justify-center h-24 text-ng-muted font-mono text-[10px] tracking-widest border border-dashed border-ng-outline-dim/40">
 NO CEP SEQUENCES DETECTED IN LAST 24H
 </div>
 );
 }

 return (
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
 <AnimatePresence mode="popLayout">
 {groups.map((group) => (
 <motion.div
 key={group.cep_sequence_id}
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 onClick={() => onSelect?.(group)}
 className={`
 relative overflow-hidden cursor-pointer
 bg-ng-mid border ${SEV_BORDER[group.peak_severity] ?? 'border-ng-outline-dim/40'}
 p-4 flex flex-col gap-3
 hover:bg-ng-mid-raised transition-colors
 `}
 style={{ boxShadow: SEV_GLOW[group.peak_severity] }}
 >
 {/* Header: tactic + severity */}
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-1.5 min-w-0">
 <ShieldAlert className="w-3.5 h-3.5 text-ng-cyan shrink-0" />
 <span className="font-mono text-[10px] text-ng-cyan uppercase tracking-wider truncate">
 {group.tactic}
 </span>
 </div>
 <Badge
 label={group.peak_severity.toUpperCase()}
 severity={group.peak_severity as any}
 />
 </div>

 {/* Technique */}
 {group.technique && (
 <div className="font-mono text-[9px] text-ng-muted truncate flex items-center gap-1">
 <Layers className="w-3 h-3 shrink-0" />
 {group.technique}
 </div>
 )}

 {/* Bottom stats */}
 <div className="flex items-center justify-between mt-auto pt-2 border-t border-ng-outline-dim/40/50">
 <div className="flex items-center gap-1 text-ng-muted font-mono text-[9px]">
 <TrendingUp className="w-3 h-3" />
 {group.event_count.toLocaleString()} events
 </div>
 <div className="flex items-center gap-1 text-ng-muted font-mono text-[9px]">
 <Clock className="w-3 h-3" />
 {fmtRelTime(group.last_seen)}
 </div>
 </div>

 {/* Sequence ID watermark */}
 <div className="absolute bottom-1 right-2 font-mono text-[7px] text-ng-muted/30 select-none">
 {group.cep_sequence_id.slice(0, 16)}
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 );
}
