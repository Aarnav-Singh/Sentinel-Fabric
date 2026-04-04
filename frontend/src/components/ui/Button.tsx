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
            primary: "bg-sf-accent text-sf-bg hover:shadow-sf-glow focus-visible:shadow-sf-glow outline-none relative overflow-hidden group",
            secondary: "border border-white/10 text-sf-text hover:bg-white/5 hover:border-white/20",
            ghost: "bg-transparent text-sf-muted hover:bg-white/5",
            danger: "bg-sf-critical text-sf-bg hover:shadow-sf-glow-critical focus-visible:shadow-sf-glow-critical outline-none relative overflow-hidden",
        };

        return (
            <motion.button
                ref={ref as React.Ref<HTMLButtonElement>}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={cn(
                    "inline-flex justify-center items-center h-9 px-4 rounded-lg font-sans font-medium transition-all duration-[150ms]",
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
