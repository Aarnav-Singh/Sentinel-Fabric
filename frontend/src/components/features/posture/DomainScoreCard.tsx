"use client";

import { PostureRing } from "@/components/ui/PostureRing";

interface DomainScoreCardProps {
 domain: string;
 score: number; // 0–100
 description: string;
 topRemediations?: string[];
 trend?: "up" | "down" | "stable";
}

export function DomainScoreCard({ domain, score, description, topRemediations = [], trend = "stable" }: DomainScoreCardProps) {
 const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
 const trendColor = trend === "up" ? "var(--ng-lime)" : trend === "down" ? "var(--ng-error)" : "var(--ng-base)";

 return (
 <div className="ng-surface p-4 flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
 <div className="flex items-center gap-3 mb-3">
 <PostureRing score={score} size={52} strokeWidth={5} showLabel={false} />
 <div className="flex-1 min-w-0">
 <div className="text-xs font-semibold text-ng-on">{domain}</div>
 <div className="flex items-center gap-1.5 mt-0.5">
 <span className="text-lg font-condensed font-bold text-ng-on">{Math.round(score)}</span>
 <span className="text-[10px] font-space" style={{ color: trendColor }}>
 {trendIcon}
 </span>
 </div>
 </div>
 </div>
 <p className="text-[10px] text-ng-muted leading-relaxed mb-3">{description}</p>
 {topRemediations.length > 0 && (
 <div className="mt-auto border-t border-ng-outline-dim/40 pt-2">
 <div className="text-[8px] font-space text-ng-muted tracking-wider mb-1">TOP ACTIONS</div>
 {topRemediations.slice(0, 2).map((r, i) => (
 <div key={i} className="text-[10px] text-ng-muted leading-snug mb-0.5">
 <span className="text-ng-cyan mr-1">›</span>{r}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
