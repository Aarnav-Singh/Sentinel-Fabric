"use client";

import { cn } from "./utils";
import { motion } from "framer-motion";
import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
 elevation?: "default" | "raised" | "sunken" | "glass";
 hover?: boolean;
 animate?: boolean;
 delay?: number;
}

export function Card({ className, children, elevation = "default", hover = false, animate = false, delay = 0, ...props }: CardProps) {
 const elevations = {
 default: "ng-surface border border-ng-outline-dim/30",
 raised: "bg-ng-mid-raised border border-ng-cyan  ng-surface-high",
 sunken: "bg-ng-base shadow-inner border border-ng-outline-dim/40/50",
 glass: "ng-ghost-border",
 };

 if (animate || hover) {
 return (
 <motion.div
 initial={animate ? { opacity: 0, y: 16 } : undefined}
 animate={animate ? { opacity: 1, y: 0 } : undefined}
 transition={animate ? { duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] } : undefined}
 whileHover={hover ? {
 y: -4,
 boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(20,184,166,0.08)",
 transition: { duration: 0.2 }
 } : undefined}
 className={cn(elevations[elevation], "relative", className)}
 {...(props as any)}
 >
 <div className="relative z-10">{children}</div>
 </motion.div>
 );
 }

 return (
 <div className={cn(elevations[elevation], "relative", className)} {...props}>
 <div className="relative z-10">{children}</div>
 </div>
 );
}
