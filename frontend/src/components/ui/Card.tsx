import { cn } from "./utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    elevation?: "default" | "raised" | "sunken";
}

export function Card({ className, children, elevation = "default", ...props }: CardProps) {
    const elevations = {
        default: "sf-card",
        raised: "bg-sf-surface-raised border border-sf-active rounded-xl shadow-2xl",
        sunken: "bg-sf-bg rounded-xl shadow-inner",
    };

    return (
        <div className={cn(elevations[elevation], className)} {...props}>
            {children}
        </div>
    );
}
