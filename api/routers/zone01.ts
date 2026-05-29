import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { env } from "../lib/env";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// ── GraphQL query: profile + XP transactions (excludes piscine) ──────
const PROFILE_AND_XP_QUERY = `
  query {
    user {
      id
      login
      attrs
      transactions(
        where: {
          type: { _eq: "xp" }
          path: { _nlike: "%piscine%" }
        }
        order_by: { createdAt: desc }
      ) {
        amount
        path
        createdAt
      }
    }
  }
`;

export const zone01Router = createRouter({
  /**
   * fetchProfile — Authenticates against Zone 01 API, fetches profile + XP.
   * Requires the user's Zone 01 credentials (one-time fetch, JWT is not stored).
   */
  fetchProfile: authedQuery
    .input(
      z.object({
        identifier: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const domain = env.intraDomain;

      if (!domain) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "INTRA_DOMAIN is not configured",
        });
      }

      // ── Step 1: Authenticate to get JWT ────────────────────────
      const encodedCredentials = Buffer.from(
        `${input.identifier}:${input.password}`,
        "utf-8"
      ).toString("base64");

      let signinRes: Response;
      try {
        signinRes = await fetch(`${domain}/api/auth/signin`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            "Content-Type": "application/json",
            "User-Agent": "NexosZone/1.0",
          },
          body: JSON.stringify({}),
        });
      } catch (error) {
        console.error("Zone01 auth fetch failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reach Zone 01 authentication server",
        });
      }

      if (!signinRes.ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid Zone 01 credentials",
        });
      }

      // Parse JWT from response (can be raw string or JSON object)
      let jwt = "";
      try {
        const text = await signinRes.text();
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          jwt = json.jwt || json.token || text;
        } else {
          jwt = text.replace(/"/g, "");
        }
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse Zone 01 token",
        });
      }

      // ── Step 2: GraphQL query for profile + XP ─────────────────
      let gqlRes: Response;
      try {
        gqlRes = await fetch(
          `${domain}/api/graphql-engine/v1/graphql`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwt}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: PROFILE_AND_XP_QUERY }),
          }
        );
      } catch (error) {
        console.error("Zone01 GraphQL fetch failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reach Zone 01 GraphQL endpoint",
        });
      }

      if (!gqlRes.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Zone 01 GraphQL request failed",
        });
      }

      const gqlData = (await gqlRes.json()) as any;

      if (gqlData.errors) {
        console.error("Zone01 GraphQL errors:", gqlData.errors);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Zone 01 GraphQL returned errors",
        });
      }

      const user = gqlData?.data?.user?.[0] ?? gqlData?.data?.user;

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user data returned from Zone 01",
        });
      }

      // ── Step 3: Extract profile fields ─────────────────────────
      let attrs = user.attrs || {};
      if (typeof attrs === "string") {
        try { attrs = JSON.parse(attrs); } catch { attrs = {}; }
      }
      const login: string = user.login ?? "";
      const firstName: string =
        attrs.firstName || attrs.first_name || attrs.givenName || "";
      const lastName: string =
        attrs.lastName || attrs.last_name || attrs.familyName || "";

      // Avatar: avatarUrl is the key Zone 01 uses; fall back to legacy keys
      const baseDomain = domain.replace(/\/$/, "");
      const rawAvatar: string | null =
        attrs.avatarUrl || attrs.avatar || attrs.image || attrs.picture || null;
      const avatarUrl = rawAvatar
        ? rawAvatar.startsWith("http")
          ? rawAvatar
          : `${baseDomain}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`
        : null;

      // Update the global user state with the full avatar URL
      if (avatarUrl && input.identifier === ctx.user?.login) {
        try {
          const db = getDb();
          await db.update(users).set({ avatarUrl }).where(eq(users.id, ctx.user.id));
        } catch (err) {
          console.error("[zone01] Failed to persist avatarUrl to DB:", err);
        }
      }

      // ── Step 4: Compute XP ─────────────────────────────────────
      const transactions: Array<{
        amount: number;
        path: string;
        createdAt: string;
      }> = user.transactions || [];

      const totalXp = transactions.reduce(
        (sum: number, t: { amount: number }) => sum + t.amount,
        0
      );

      // Extract project name from path (last segment)
      const recentTransactions = transactions.slice(0, 10).map((t) => ({
        amount: t.amount,
        project: t.path.split("/").filter(Boolean).pop() || t.path,
        createdAt: t.createdAt,
      }));

      return {
        login,
        firstName,
        lastName,
        avatarUrl,
        totalXp,
        recentTransactions,
      };
    }),
});