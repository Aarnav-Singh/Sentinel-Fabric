"use client";

import { AlertOctagon, AlertTriangle, AlertCircle, Info, Hash } from "lucide-react";

interface BadgeProps {
    label: string;
    severity?: "critical" | "high" | "medium" | "low" | "info";
    size?: "sm" | "md" | "lg";
    className?: string;
    pulse?: boolean;
}

export function Badge({ label, severity = "info", size = "sm", className = "", pulse = false }: BadgeProps) {
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

    const iconMap: Record<string, React.ReactNode> = {
        critical: <AlertOctagon className="w-2.5 h-2.5 mr-1 shrink-0" />,
        high: <AlertTriangle className="w-2.5 h-2.5 mr-1 shrink-0" />,
        medium: <AlertCircle className="w-2.5 h-2.5 mr-1 shrink-0" />,
        low: <Info className="w-2.5 h-2.5 mr-1 shrink-0" />,
        info: <Hash className="w-2.5 h-2.5 mr-1 shrink-0" />,
    };

    const shouldPulse = pulse || severity === "critical" || severity === "high";
    const glowClass = shouldPulse ? (glowMap[severity] || "") : "";
    
    const sizeClass = {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-[12px] px-2 py-1 h-6",
        lg: "text-[14px] px-3 py-1.5 h-8"
    }[size];

    return (
        <span
            className={`inline-flex items-center font-mono tracking-wider leading-none rounded-[2px] border backdrop-blur-sm ${sizeClass} ${variants[severity]} ${glowClass} ${className}`}
        >
            {iconMap[severity]}
            {label}
        </span>
    );
}
