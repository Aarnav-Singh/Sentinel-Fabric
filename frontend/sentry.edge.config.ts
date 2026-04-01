import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

    enabled: process.env.NODE_ENV === "production",

    tracesSampleRate: 0.2,

    environment: process.env.NODE_ENV || "development",
    release: `sentinel-fabric@${process.env.npm_package_version || "2.0.0"}`,
});
