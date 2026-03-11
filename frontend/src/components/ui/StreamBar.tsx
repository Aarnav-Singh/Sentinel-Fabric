"use client";

import { useEffect, useRef, useState } from "react";

interface StreamBarProps {
    abbr: string;
    description: string;
    score: number; // 0–1
    color: string;
}

export function StreamBar({ abbr, description, score, color }: StreamBarProps) {
    const [animated, setAnimated] = useState(0);
    const ref = useRef(0);

    useEffect(() => {
        const tick = () => {
            ref.current += (score - ref.current) * 0.08;
            setAnimated(ref.current);
        };
        const id = setInterval(tick, 16);
        return () => clearInterval(id);
    }, [score]);

    return (
        <div className="mb-2.5">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <span
                        className="inline-flex items-center justify-center w-8 h-4 rounded-sm text-[9px] font-space tracking-wider"
                        style={{
                            background: `${color}20`,
                            border: `1px solid ${color}60`,
                            color,
                        }}
                    >
                        {abbr}
                    </span>
                    <span className="text-[11px] text-sf-text-secondary">{description}</span>
                </div>
                <span className="text-xs font-space" style={{ color }}>
                    {Math.round(animated * 100)}%
                </span>
            </div>
            <div className="h-1 bg-sf-border rounded-sm overflow-hidden">
                <div
                    className="h-full rounded-sm transition-[width] duration-100 ease-linear"
                    style={{
                        width: `${animated * 100}%`,
                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                        boxShadow: `0 0 8px ${color}80`,
                    }}
                />
            </div>
        </div>
    );
}
