import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";
import { eq } from "drizzle-orm";
import * as cookie from "cookie";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { Session } from "@contracts/constants";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  intraToken?: string;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const cookieHeader = opts.req.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookie.parse(cookieHeader);
      const token = cookies[Session.cookieName];
      if (token) {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(env.jwtSecret)
        );
        if (payload.userId) {
          const db = getDb();
          const [user] = await db.select().from(users).where(eq(users.id, Number(payload.userId)));
          if (user) {
            ctx.user = user;
          }
        }
      }
      const intraToken = cookies["intra_token"];
      if (intraToken) {
        ctx.intraToken = intraToken;
      }
    }
  } catch (err) {
    // Authentication is optional here
    console.error("Context auth error:", err);
  }
  return ctx;
}
