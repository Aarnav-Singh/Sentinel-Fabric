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
        <div className="sf-card p-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sf-text-secondary">
                        Posture Trend (30 days)
                    </h3>
                    <p className="text-[10px] text-sf-text-muted mt-0.5">Are we getting better?</p>
                </div>
                {mounted && data.length > 1 && (
                    <div className="text-right">
                        <div className="text-lg font-condensed font-bold text-sf-text-primary">
                            {Math.round(data[data.length - 1]?.score ?? 0)}
                        </div>
                        <div className="text-[9px] text-sf-text-muted font-space">current</div>
                    </div>
                )}
            </div>
            {mounted ? (
                <ScoreTrendChart data={data} height={200} />
            ) : (
                <div style={{ height: 200 }} className="flex items-center justify-center text-sf-text-muted text-xs font-space">
                    Loading chart...
                </div>
            )}
        </div>
    );
}
