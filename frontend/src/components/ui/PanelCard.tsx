"use client";

import React from "react";
import { cn } from "@/components/ui/utils";

interface PanelCardProps {
 children: React.ReactNode;
 variant?: "default" | "elevated" | "ambient";
 threatReactive?: boolean;
 className?: string;
}

export function PanelCard({
 children,
 variant = "default",
 threatReactive = false,
 className = "",
}: PanelCardProps) {
 const base = {
 default: "ng-surface",
 elevated: "ng-surface-high",
 ambient: "ng-ghost-border",
 }[variant];

 const glow = threatReactive ? "shadow-[var(--ng-cyan-bright-glow)]" : "";

 return (
 <div className={cn(base, glow, "relative", className)}>
 {children}
 </div>
 );
}
