import React from "react";

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
    className?: string;
}

export function Sparkline({ data, color = "#0d9488", width = 100, height = 30, className = "" }: SparklineProps) {
    if (!data || data.length === 0) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; 

    const dx = width / (data.length - 1 || 1);
    const paddingY = 4;
    const effectiveHeight = height - paddingY * 2;

    const points = data.map((val, i) => {
        const x = i * dx;
        const normalized = (val - min) / range;
        const y = height - paddingY - normalized * effectiveHeight;
        return `${x},${y}`;
    }).join(" L ");

    return (
        <svg 
            width={width} 
            height={height} 
            viewBox={`0 0 ${width} ${height}`} 
            preserveAspectRatio="none"
            className={`overflow-visible ${className}`}
        >
            <path
                d={`M ${points}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="square"
                strokeLinejoin="miter"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
