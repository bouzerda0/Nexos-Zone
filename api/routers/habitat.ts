import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { habitatPosts, habitatRequests } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

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

      const posts = await db.query.habitatPosts.findMany({
        where,
        with: {
          user: true,
          requests: {
            with: { user: true },
          },
        },
        orderBy: [desc(habitatPosts.createdAt)],
      });

      return posts.map((post) => {
        const myRequest = post.requests.find(
          (r) => r.userId === ctx.user.id
        );
        const acceptedCount = post.requests.filter(
          (r) => r.status === "accepted"
        ).length;
        return {
          ...post,
          _count: {
            requests: post.requests.length,
            pendingRequests: post.requests.filter((r) => r.status === "pending")
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
      const post = await db.query.habitatPosts.findFirst({
        where: eq(habitatPosts.id, input.id),
        with: {
          user: true,
          requests: { with: { user: true } },
        },
      });
      if (!post) throw new Error("Post not found");
      return post;
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
