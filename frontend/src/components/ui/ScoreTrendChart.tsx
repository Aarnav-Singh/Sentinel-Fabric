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

export function ScoreTrendChart({ data, color = "#00d4c8", height = 200 }: ScoreTrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="#1a2e4a" strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#3d5a78", fontFamily: "'Space Mono', monospace" }}
                    axisLine={{ stroke: "#1a2e4a" }}
                    tickLine={false}
                />
                <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#3d5a78", fontFamily: "'Space Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        background: "#0a1628",
                        border: "1px solid #1a2e4a",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "'Space Mono', monospace",
                        color: "#e8f4f8",
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="score"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#scoreFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: color, stroke: "#050d1a", strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
