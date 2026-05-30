import * as cookie from "cookie";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";

export const authRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    let finalAvatarHash = ctx.user.avatarUrl;

    // If we don't have the hash in DB, try to fetch it dynamically once
    if (!finalAvatarHash) {
      try {
        const domain = env.intraDomain;
        const gqlRes = await fetch(`${domain}/api/graphql-engine/v1/graphql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query {
                user(where: {login: {_eq: "${ctx.user.login}"}}) {
                  attrs
                }
              }
            `
          })
        });

        if (gqlRes.ok) {
          const gqlData = await gqlRes.json() as any;
          const intraUser = gqlData?.data?.user?.[0];
          if (intraUser) {
            let parsedAttrs = intraUser.attrs;
            if (typeof parsedAttrs === "string") {
              try { parsedAttrs = JSON.parse(parsedAttrs); } catch { parsedAttrs = {}; }
            }
            const rawAvatar = parsedAttrs?.avatarUrl || parsedAttrs?.avatar || parsedAttrs?.picture || parsedAttrs?.image || null;

            if (rawAvatar) {
              const hash = rawAvatar.includes("avatars/") 
                ? rawAvatar.split("avatars/").pop() 
                : rawAvatar.replace(/^\/(git\/avatars\/)?/, "");
              const fullAvatarUrl = `https://learn.zone01oujda.ma/git/avatars/${hash}`;
              finalAvatarHash = fullAvatarUrl;

              // Persist the full URL to DB so we don't have to fetch again
              const db = getDb();
              await db.update(users).set({ avatarUrl: fullAvatarUrl }).where(eq(users.id, ctx.user.id));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch attrs dynamically in auth.me:", err);
      }
    }

    const safeAvatarUrl = finalAvatarHash
      ? finalAvatarHash.startsWith("http")
        ? finalAvatarHash
        : `https://learn.zone01oujda.ma/git/avatars/${finalAvatarHash}`
      : null;

    return { ...ctx.user, avatarUrl: safeAvatarUrl };
  }),

  login: publicQuery
    .input(z.object({ identifier: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 1. Validate ENV Var
      // @ts-ignore - import.meta.env might not exist in all node environments
      const domain = process.env.VITE_INTRA_DOMAIN || process.env.INTRA_DOMAIN || import.meta.env?.VITE_INTRA_DOMAIN;

      if (!domain) {
        console.error("Auth Error: INTRA_DOMAIN or VITE_INTRA_DOMAIN is missing in environment variables");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Domain is missing in .env",
        });
      }

      const targetUrl = `${domain}/api/auth/signin`;
      console.log("Attempting to fetch from URL:", targetUrl);

      // 2. Basic Auth to signin
      const encodedCredentials = Buffer.from(`${input.identifier}:${input.password}`, "utf-8").toString("base64");

      let signinRes: Response;
      try {
        signinRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${encodedCredentials}`,
            "User-Agent": "SuperApp-Zone01/1.0",
            "Content-Type": "application/json",
          },
          // Some servers expect an empty body for POST
          body: JSON.stringify({}),
        });
      } catch (error) {
        console.error("Fetch crashed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Network fetch failed. Check backend console.",
        });
      }

      if (!signinRes.ok) {
        const errorText = await signinRes.text();
        console.error("Zone01 API Error:", signinRes.status, errorText.slice(0, 500));

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      let jwt = "";
      try {
        const text = await signinRes.text();
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          jwt = json.jwt || json.token || text;
        } else {
          jwt = text.replace(/"/g, "");
        }
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse Intra token",
        });
      }

      // 2. Fetch GraphQL profile
      const gqlRes = await fetch(`${env.intraDomain}/api/graphql-engine/v1/graphql`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query {
              user {
                id
                login
                attrs
                email
              }
            }
          `
        })
      });

      if (!gqlRes.ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to fetch user profile",
        });
      }

      const gqlData = await gqlRes.json() as any;
      const intraUser = gqlData?.data?.user?.[0] || gqlData?.data?.user;

      if (!intraUser || !intraUser.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid GraphQL response form Intra",
        });
      }

      let parsedAttrs = intraUser.attrs;
      if (typeof parsedAttrs === "string") {
        try {
          parsedAttrs = JSON.parse(parsedAttrs);
        } catch {
          parsedAttrs = {};
        }
      }

      console.log("INTRA USER ATTRS:", typeof parsedAttrs, parsedAttrs);

      // Extract 01-edu avatar hash and build full URL
      const rawAvatar = parsedAttrs?.avatarUrl || parsedAttrs?.avatar || parsedAttrs?.picture || parsedAttrs?.image || null;
      const avatarHash = rawAvatar 
        ? (rawAvatar.includes("avatars/") ? rawAvatar.split("avatars/").pop() : rawAvatar.replace(/^\/(git\/avatars\/)?/, "")) 
        : null;
      const avatarUrl = avatarHash ? `https://learn.zone01oujda.ma/git/avatars/${avatarHash}` : null;

      const db = getDb();

      // Upsert
      let [localUser] = await db.select().from(users).where(eq(users.intraId, intraUser.id));

      if (localUser) {
        const updateData = {
          login: intraUser.login,
          email: intraUser.email || localUser.email,
          avatarUrl: avatarUrl,
          lastSignInAt: new Date(),
        };
        await db.update(users).set(updateData).where(eq(users.id, localUser.id));
        localUser = { ...localUser, ...updateData }; // Sync in-memory user with updated DB values to send to client
      } else {
        const [insertResult] = await db.insert(users).values({
          intraId: intraUser.id,
          login: intraUser.login,
          email: intraUser.email || "no-email@local",
          avatarUrl: avatarUrl,
        });
        const [newUser] = await db.select().from(users).where(eq(users.id, insertResult.insertId));
        localUser = newUser;
      }

      if (!localUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user in DB",
        });
      }

      // Generate App session token
      const sessionToken = await new SignJWT({ userId: localUser.id })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(new TextEncoder().encode(env.jwtSecret));

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, sessionToken, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 30 * 24 * 60 * 60, // 30 days
        })
      );

      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize("intra_token", jwt, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 30 * 24 * 60 * 60, // 30 days
        })
      );

      return { success: true, user: localUser };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize("intra_token", "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});