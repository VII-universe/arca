// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

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
