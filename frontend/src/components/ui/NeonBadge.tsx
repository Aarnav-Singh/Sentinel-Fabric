"use client";

interface NeonBadgeProps {
 label: string;
 variant?: "cyan" | "magenta" | "lime" | "error" | "muted";
 size?: "sm" | "xs";
 className?: string;
}

export function NeonBadge({ label, variant = "cyan", size = "sm", className = "" }: NeonBadgeProps) {
 const accent = {
 cyan: "border-l-ng-cyan-bright text-ng-cyan",
 magenta: "border-l-ng-magenta text-ng-magenta",
 lime: "border-l-ng-lime text-ng-lime",
 error: "border-l-ng-error text-ng-error",
 muted: "border-l-ng-outline text-ng-muted",
 }[variant];
 const sz = size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]";

 return (
 <span className={`inline-flex items-center border-l-2 bg-ng-highest font-mono uppercase tracking-widest ${sz} ${accent} ${className}`}>
 {label}
 </span>
 );
}
