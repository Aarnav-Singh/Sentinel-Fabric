import * as Sentry from "@sentry/nextjs";

export function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
            enabled: process.env.NODE_ENV === "production",
            tracesSampleRate: 0.2,
            environment: process.env.NODE_ENV || "development",
            release: `umbrix@${process.env.npm_package_version || "2.0.0"}`,
        });
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
            enabled: process.env.NODE_ENV === "production",
            tracesSampleRate: 0.2,
            environment: process.env.NODE_ENV || "development",
            release: `umbrix@${process.env.npm_package_version || "2.0.0"}`,
        });
    }
}
