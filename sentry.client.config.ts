import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  beforeSend(event) {
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === "ChunkLoadError") {
        return null;
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const userId = window.localStorage.getItem("userId");
      if (userId) {
        event.user = { ...event.user, id: userId };
      }
    }
    return event;
  },
  ignoreErrors: [
    /Network Error/i,
    /Failed to fetch/i,
    /Non-Error promise rejection captured/i,
    /Script error/i,
  ],
  denyUrls: [/extensions\//i, /^chrome:\/\//i],
});
