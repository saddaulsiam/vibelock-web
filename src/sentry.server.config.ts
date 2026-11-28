import { sanitizeSentryBreadcrumb, sanitizeSentryEvent } from "@/lib/monitoring/sentry-privacy";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",

  tracesSampleRate: 0,

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
