// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// The public landing pages (lib/marketing/paths) don't load Sentry at all —
// they have their own root layout and a strict JS budget. Everywhere else
// Sentry is imported as its own chunk and initialised as soon as it arrives.
// Moving between the landing and the app is a full page load (separate root
// layouts), so this decision is made again on every entry.

import { isMarketingPath } from "@/lib/marketing/paths";

type SentryModule = typeof import("@sentry/nextjs");
let sentry: SentryModule | null = null;

if (!isMarketingPath(window.location.pathname)) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: "https://5c38f4d4b22fce1f89cf36debdab6ba5@o4512243232538624.ingest.de.sentry.io/4512243279855696",

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 1,

      // dataCollection: {
      //   // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      //   // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
      //   // userInfo: false,
      //   // httpBodies: [],
      // },
    });
    sentry = Sentry;
  });
}

export const onRouterTransitionStart: SentryModule["captureRouterTransitionStart"] = (...args) =>
  sentry?.captureRouterTransitionStart(...args);
