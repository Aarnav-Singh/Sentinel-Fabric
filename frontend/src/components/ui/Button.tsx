import { cn } from "./utils";
import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", ...props }, ref) => {
        const variants = {
            primary: "bg-sf-accent text-sf-bg hover:sf-glow-accent focus-visible:sf-glow-accent outline-none",
            secondary: "border border-sf-border text-sf-text hover:bg-sf-surface-raised",
            ghost: "bg-transparent text-sf-muted hover:bg-sf-surface",
            danger: "bg-sf-critical text-sf-bg hover:sf-glow-critical focus-visible:sf-glow-critical outline-none",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex justify-center items-center h-9 px-4 rounded-lg font-sans font-medium transition-all duration-[150ms]",
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";
