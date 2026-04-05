"use client";

import { cn } from "./utils";
import { motion } from "framer-motion";
import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", children, ...props }, ref) => {
        const variants = {
            primary: "bg-sf-accent text-sf-bg hover:bg-sf-accent/90 border border-sf-accent hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] focus-visible:shadow-[0_0_15px_rgba(0,242,255,0.4)] outline-none relative overflow-hidden group",
            secondary: "border border-sf-border text-sf-text hover:bg-sf-surface hover:border-sf-text",
            ghost: "bg-transparent text-sf-muted hover:bg-sf-surface hover:text-white",
            danger: "bg-sf-critical text-sf-bg hover:bg-sf-critical/90 border border-sf-critical hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] focus-visible:shadow-[0_0_15px_rgba(239,68,68,0.4)] outline-none relative overflow-hidden group",
        };

        return (
            <motion.button
                ref={ref as React.Ref<HTMLButtonElement>}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={cn(
                    "inline-flex justify-center items-center h-9 px-4 rounded font-mono text-[10px] uppercase tracking-widest font-bold transition-all duration-[150ms]",
                    variants[variant],
                    className
                )}
                {...(props as any)}
            >
                {/* Shimmer sweep for primary/danger */}
                {(variant === "primary" || variant === "danger") && (
                    <span className="absolute inset-0 -translate-x-full group-hover:animate-sf-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
            </motion.button>
        );
    }
);
Button.displayName = "Button";
