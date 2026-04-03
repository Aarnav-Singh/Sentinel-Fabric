"use client";

interface BadgeProps {
    label: string;
    severity?: "critical" | "high" | "medium" | "low" | "info";
    className?: string;
}

export function Badge({ label, severity = "info", className = "" }: BadgeProps) {
    const variants = {
        critical: "bg-sf-critical/15 border-sf-critical text-sf-critical",
        high: "bg-sf-warning/15 border-sf-warning text-sf-warning",
        medium: "bg-sf-accent-2/15 border-sf-accent-2 text-sf-accent-2",
        low: "bg-sf-muted/15 border-sf-muted text-sf-muted",
        info: "bg-sf-accent/15 border-sf-accent text-sf-accent",
    };

    return (
        <span
            className={`inline-flex items-center text-[10px] font-mono tracking-wider leading-none px-1.5 py-0.5 rounded-sm border ${variants[severity]} ${className}`}
        >
            {label}
        </span>
    );
}
