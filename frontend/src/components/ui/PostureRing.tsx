"use client";

interface PostureRingProps {
    score: number; // 0–100
    size?: number; // px
    strokeWidth?: number;
    showLabel?: boolean;
    className?: string;
}

function scoreColor(score: number): string {
    if (score >= 75) return "#00e676";
    if (score >= 50) return "#ffaa00";
    return "#ff3f5b";
}

export function PostureRing({ score, size = 120, strokeWidth = 8, showLabel = true, className = "" }: PostureRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = scoreColor(score);

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#1a2e4a"
                    strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
                />
            </svg>
            {showLabel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-condensed font-bold" style={{ color }}>
                        {Math.round(score)}
                    </span>
                    <span className="text-[9px] text-sf-text-muted font-space tracking-wider uppercase">
                        posture
                    </span>
                </div>
            )}
        </div>
    );
}
