"use client";

interface PostureRingProps {
 score: number; // 0–100
 size?: number; // px
 strokeWidth?: number;
 showLabel?: boolean;
 className?: string;
}

function scoreColor(score: number): string {
 if (score >= 75) return "var(--ng-lime)";
 if (score >= 50) return "var(--ng-magenta)";
 return "var(--ng-error)";
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
 stroke="var(--ng-mid-raised)"
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
 strokeLinecap="butt"
 className="transition-all duration-1000 ease-out"
 style={{ filter: score < 50 ? `drop-shadow(0 0 10px rgba(255, 45, 85, 0.5))` : "none" }}
 />
 </svg>
 {showLabel && (
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-2xl font-mono font-bold" style={{ color }}>
 {Math.round(score)}
 </span>
 <span className="text-[9px] text-ng-muted font-mono tracking-wider uppercase">
 posture
 </span>
 </div>
 )}
 </div>
 );
}
