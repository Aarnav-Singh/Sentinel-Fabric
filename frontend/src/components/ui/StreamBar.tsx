"use client";

import { useEffect, useRef, useState } from "react";

interface StreamBarProps {
    abbr: string;
    description: string;
    score: number; // 0–1
    color?: string; // We can keep color prop but default to a CSS variable if we want
}

export function StreamBar({ abbr, description, score, color = "var(--sf-accent)" }: StreamBarProps) {
    const [animated, setAnimated] = useState(0);
    const ref = useRef(0);

    useEffect(() => {
        const tick = () => {
            // Updated easing per the spec's standard although logic is custom
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
                        className="inline-flex items-center justify-center w-8 h-4 rounded-none text-[9px] font-mono tracking-wider"
                        style={{
                            background: `color-mix(in srgb, ${color} 20%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${color} 60%, transparent)`,
                            color,
                        }}
                    >
                        {abbr}
                    </span>
                    <span className="text-[11px] text-sf-muted">{description}</span>
                </div>
                <span className="text-xs font-mono" style={{ color }}>
                    {Math.round(animated * 100)}%
                </span>
            </div>
            <div className="h-1 bg-sf-surface-raised rounded-none overflow-hidden">
                <div
                    className="h-full rounded-none transition-[width] duration-100 ease-linear"
                    style={{
                        width: `${animated * 100}%`,
                        background: `linear-gradient(90deg, color-mix(in srgb, ${color} 80%, transparent), ${color})`,
                        boxShadow: `0 0 8px color-mix(in srgb, ${color} 80%, transparent)`,
                    }}
                />
            </div>
        </div>
    );
}
