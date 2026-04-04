import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

    // Only enable in production to avoid noise during development
    enabled: process.env.NODE_ENV === "production",

    // Performance Monitoring
    tracesSampleRate: 0.2, // 20% of transactions

    // Session Replay — capture 1% normally, 100% on errors
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Environment tagging
    environment: process.env.NODE_ENV || "development",
    release: `umbrix@${process.env.npm_package_version || "2.0.0"}`,

    // Filter noisy errors
    ignoreErrors: [
        "ResizeObserver loop",
        "Non-Error promise rejection",
        "Network request failed",
        "Load failed",
    ],

    beforeSend(event) {
        // Strip PII from error reports
        if (event.user) {
            delete event.user.ip_address;
        }
        return event;
    },
});
