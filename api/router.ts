import { authRouter } from "./auth-router";
import { transitRouter } from "./routers/transit";
import { habitatRouter } from "./routers/habitat";
import { pulseRouter } from "./routers/pulse";
import { forumRouter } from "./routers/forum";
import { spiritRouter } from "./routers/spirit";
import { zone01Router } from "./routers/zone01";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  transit: transitRouter,
  habitat: habitatRouter,
  pulse: pulseRouter,
  forum: forumRouter,
  spirit: spiritRouter,
  zone01: zone01Router,
});

export type AppRouter = typeof appRouter;
