"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface DataPoint {
    date: string;
    score: number;
}

interface ScoreTrendChartProps {
    data: DataPoint[];
    color?: string;
    height?: number;
}

export function ScoreTrendChart({ data, color = "var(--sf-accent)", height = 200 }: ScoreTrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--sf-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "var(--sf-muted)", fontFamily: "var(--font-jetbrains-mono)" }}
                    axisLine={{ stroke: "var(--sf-surface-raised)" }}
                    tickLine={false}
                />
                <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "var(--sf-muted)", fontFamily: "var(--font-jetbrains-mono)" }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        background: "var(--sf-surface)",
                        border: "1px solid var(--sf-border-active)",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--sf-text)",
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="score"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#scoreFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: color, stroke: "var(--sf-surface)", strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
