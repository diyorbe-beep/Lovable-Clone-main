import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.NODE_ENV || "development",
  release: process.env.APP_VERSION || "1.0.0",
  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /\/api\/[^/]+\/[^/]+/,
        "/api/***",
      );
    }
    return event;
  },
  ignoreErrors: [/database connection/i, /timeout/i, /rate limit/i],
});
