import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent, sanitizeSentryBreadcrumb } from "@/lib/monitoring/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",

  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: false,
      response: false,
    },
    httpBodies: [],
    urlQueryParams: false,
    genAI: {
      inputs: false,
      outputs: false,
    },
    mcp: {
      inputs: false,
      outputs: false,
    },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    graphQL: {
      document: false,
      variables: false,
    },
  },

  beforeSend(event) {
    return sanitizeSentryEvent(event);
  },

  beforeBreadcrumb(breadcrumb) {
    return sanitizeSentryBreadcrumb(breadcrumb);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
