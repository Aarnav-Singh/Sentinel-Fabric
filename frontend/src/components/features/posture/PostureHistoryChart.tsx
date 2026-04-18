"use client";

import { useState, useEffect } from "react";
import { ScoreTrendChart } from "@/components/ui/ScoreTrendChart";

interface HistoryDataPoint {
 date: string;
 score: number;
}

interface PostureHistoryChartProps {
 data: HistoryDataPoint[];
}

export function PostureHistoryChart({ data }: PostureHistoryChartProps) {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 return (
 <div className="ng-surface border border-ng-outline-dim/30 p-4">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-ng-muted">
 Posture Trend (30 days)
 </h3>
 <p className="text-[10px] text-ng-muted mt-0.5">Are we getting better?</p>
 </div>
 {mounted && data.length > 1 && (
 <div className="text-right">
 <div className="text-lg font-condensed font-bold text-ng-on">
 {Math.round(data[data.length - 1]?.score ?? 0)}
 </div>
 <div className="text-[9px] text-ng-muted font-space">current</div>
 </div>
 )}
 </div>
 {mounted ? (
 <ScoreTrendChart data={data} height={200} />
 ) : (
 <div style={{ height: 200 }} className="flex items-center justify-center text-ng-muted text-xs font-space">
 Loading chart...
 </div>
 )}
 </div>
 );
}
