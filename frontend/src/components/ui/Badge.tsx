"use client";

interface BadgeProps {
    label: string;
    severity?: "critical" | "high" | "medium" | "low" | "info";
    className?: string;
    pulse?: boolean;
}

export function Badge({ label, severity = "info", className = "", pulse = false }: BadgeProps) {
    const variants = {
        critical: "bg-sf-critical/15 border-sf-critical text-sf-critical",
        high: "bg-sf-warning/15 border-sf-warning text-sf-warning",
        medium: "bg-sf-accent-2/15 border-sf-accent-2 text-sf-accent-2",
        low: "bg-sf-muted/15 border-sf-muted text-sf-muted",
        info: "bg-sf-accent/15 border-sf-accent text-sf-accent",
    };

    const glowMap: Record<string, string> = {
        critical: "animate-sf-pulse-red",
        high: "shadow-[0_0_8px_rgba(249,115,22,0.3)]",
    };

    const shouldPulse = pulse || severity === "critical" || severity === "high";
    const glowClass = shouldPulse ? (glowMap[severity] || "") : "";

    return (
        <span
            className={`inline-flex items-center text-[10px] font-mono tracking-wider leading-none px-1.5 py-0.5 rounded-sm border backdrop-blur-sm ${variants[severity]} ${glowClass} ${className}`}
        >
            {label}
        </span>
    );
}
