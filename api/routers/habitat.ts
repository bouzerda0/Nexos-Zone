import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { habitatPosts, habitatRequests, users } from "@db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export const habitatRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        status: z.enum(["open", "filled", "closed"]).optional(),
        mine: z.boolean().optional(),
        myRequests: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(habitatPosts.status, input.status));
      }
      if (input?.mine) {
        conditions.push(eq(habitatPosts.userId, ctx.user.id));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Use plain select queries to avoid LATERAL JOIN / correlated subquery
      // issues with MariaDB 10.x
      const posts = where
        ? await db.select().from(habitatPosts).where(where).orderBy(desc(habitatPosts.createdAt))
        : await db.select().from(habitatPosts).orderBy(desc(habitatPosts.createdAt));

      if (posts.length === 0) return [];

      // Fetch all related users for these posts
      const postIds = posts.map((p) => p.id);
      const postUserIds = [...new Set(posts.map((p) => p.userId))];

      const postUsers = postUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, postUserIds))
        : [];

      // Fetch all requests for these posts
      const allRequests = postIds.length > 0
        ? await db.select().from(habitatRequests).where(inArray(habitatRequests.postId, postIds))
        : [];

      // Fetch users for all requests
      const requestUserIds = [...new Set(allRequests.map((r) => r.userId))];
      const requestUsers = requestUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, requestUserIds))
        : [];

      // Build lookup maps
      const userMap = new Map(postUsers.concat(requestUsers).map((u) => [u.id, u]));

      return posts.map((post) => {
        const postRequests = allRequests
          .filter((r) => r.postId === post.id)
          .map((r) => ({ ...r, user: userMap.get(r.userId) || null }));

        const myRequest = postRequests.find(
          (r) => r.userId === ctx.user.id
        );
        const acceptedCount = postRequests.filter(
          (r) => r.status === "accepted"
        ).length;
        return {
          ...post,
          user: userMap.get(post.userId) || null,
          requests: postRequests,
          _count: {
            requests: postRequests.length,
            pendingRequests: postRequests.filter((r) => r.status === "pending")
              .length,
            accepted: acceptedCount,
          },
          myRequestStatus: myRequest?.status || null,
        };
      });
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [post] = await db.select().from(habitatPosts).where(eq(habitatPosts.id, input.id));
      if (!post) throw new Error("Post not found");

      const [postUser] = await db.select().from(users).where(eq(users.id, post.userId));

      const requests = await db.select().from(habitatRequests).where(eq(habitatRequests.postId, post.id));
      const requestUserIds = [...new Set(requests.map((r) => r.userId))];
      const reqUsers = requestUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, requestUserIds))
        : [];
      const userMap = new Map(reqUsers.map((u) => [u.id, u]));

      return {
        ...post,
        user: postUser || null,
        requests: requests.map((r) => ({ ...r, user: userMap.get(r.userId) || null })),
      };
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        address: z.string().min(1),
        rentPerPerson: z.number().min(1),
        spotsAvailable: z.number().min(1).max(10),
        tags: z.string(),
        rules: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(habitatPosts).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        address: input.address,
        rentPerPerson: input.rentPerPerson,
        spotsAvailable: input.spotsAvailable,
        tags: input.tags,
        rules: input.rules,
      });
      const insertedId = Number(result[0]?.insertId ?? 0);
      return { id: insertedId };
    }),

  sendRequest: authedQuery
    .input(
      z.object({
        postId: z.number(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [post] = await db
        .select()
        .from(habitatPosts)
        .where(eq(habitatPosts.id, input.postId));

      if (!post) throw new Error("Post not found");
      if (post.status !== "open") throw new Error("This post is not accepting requests");
      if (post.userId === ctx.user.id)
        throw new Error("You cannot request your own post");

      const existing = await db
        .select()
        .from(habitatRequests)
        .where(
          and(
            eq(habitatRequests.postId, input.postId),
            eq(habitatRequests.userId, ctx.user.id)
          )
        );
      if (existing.length > 0)
        throw new Error("You have already sent a request");

      await db.insert(habitatRequests).values({
        postId: input.postId,
        userId: ctx.user.id,
        message: input.message || null,
      });

      return { success: true, message: "Request sent!" };
    }),

  respondToRequest: authedQuery
    .input(
      z.object({
        requestId: z.number(),
        action: z.enum(["accept", "reject"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      return db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(habitatRequests)
          .where(eq(habitatRequests.id, input.requestId));

        if (!request) throw new Error("Request not found");

        const [post] = await tx
          .select()
          .from(habitatPosts)
          .where(eq(habitatPosts.id, request.postId));

        if (!post) throw new Error("Post not found");
        if (post.userId !== ctx.user.id)
          throw new Error("Only the post owner can respond");

        if (input.action === "accept") {
          await tx
            .update(habitatRequests)
            .set({ status: "accepted" })
            .where(eq(habitatRequests.id, input.requestId));

          const acceptedCount = await tx
            .select()
            .from(habitatRequests)
            .where(
              and(
                eq(habitatRequests.postId, request.postId),
                eq(habitatRequests.status, "accepted")
              )
            );

          if (acceptedCount.length >= post.spotsAvailable) {
            await tx
              .update(habitatPosts)
              .set({ status: "filled" })
              .where(eq(habitatPosts.id, request.postId));
          }

          return { success: true, message: "Request accepted!" };
        } else {
          await tx
            .update(habitatRequests)
            .set({ status: "rejected" })
            .where(eq(habitatRequests.id, input.requestId));

          return { success: true, message: "Request rejected" };
        }
      });
    }),

  close: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [post] = await db
        .select()
        .from(habitatPosts)
        .where(eq(habitatPosts.id, input.id));

      if (!post) throw new Error("Post not found");
      if (post.userId !== ctx.user.id)
        throw new Error("Only the owner can close this post");

      await db
        .update(habitatPosts)
        .set({ status: "closed" })
        .where(eq(habitatPosts.id, input.id));

      return { success: true, message: "Post closed" };
    }),
});
