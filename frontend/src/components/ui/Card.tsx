import { cn } from "./utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("bg-surface-card border border-surface-border rounded-xl shadow-lg", className)} {...props}>
            {children}
        </div>
    );
}
