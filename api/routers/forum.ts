import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  forumPosts,
  forumComments,
  forumPolls,
  forumPollOptions,
  forumPollVotes,
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const forumRouter = createRouter({
  list: authedQuery
    .input(
      z
        .object({
          type: z.enum(["meme", "poll", "discussion"]).optional(),
          sort: z.enum(["newest", "popular"]).default("newest"),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.type) {
        conditions.push(eq(forumPosts.type, input.type));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const posts = await db.query.forumPosts.findMany({
        where,
        with: {
          user: true,
          comments: { with: { user: true } },
          poll: {
            with: {
              options: {
                with: {
                  votes: true,
                },
              },
            },
          },
        },
        orderBy:
          input?.sort === "popular"
            ? [desc(sql`count_comments`)]
            : [desc(forumPosts.createdAt)],
      });

      return posts.map((post) => {
        const commentCount = post.comments?.length ?? 0;
        const hasVoted = post.poll
          ? post.poll.options.some((opt) =>
              opt.votes.some((v) => v.userId === ctx.user.id)
            )
          : false;

        return {
          ...post,
          _count: { comments: commentCount },
          poll: post.poll
            ? {
                ...post.poll,
                hasVoted,
                totalVotes: post.poll.options.reduce(
                  (sum, opt) => sum + opt.votes.length,
                  0
                ),
                options: post.poll.options.map((opt) => ({
                  ...opt,
                  voteCount: opt.votes.length,
                })),
              }
            : null,
        };
      });
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const post = await db.query.forumPosts.findFirst({
        where: eq(forumPosts.id, input.id),
        with: {
          user: true,
          comments: { with: { user: true } },
          poll: {
            with: {
              options: { with: { votes: true } },
            },
          },
        },
      });

      if (!post) throw new Error("Post not found");

      const commentCount = post.comments?.length ?? 0;
      const hasVoted = post.poll
        ? post.poll.options.some((opt) =>
            opt.votes.some((v) => v.userId === ctx.user.id)
          )
        : false;

      return {
        ...post,
        _count: { comments: commentCount },
        poll: post.poll
          ? {
              ...post.poll,
              hasVoted,
              totalVotes: post.poll.options.reduce(
                (sum, opt) => sum + opt.votes.length,
                0
              ),
              options: post.poll.options.map((opt) => ({
                ...opt,
                voteCount: opt.votes.length,
              })),
            }
          : null,
      };
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(["meme", "poll", "discussion"]),
        imageUrl: z.string().optional(),
        poll: z
          .object({
            question: z.string().min(1),
            options: z.array(z.string().min(1)).min(2),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      return db.transaction(async (tx) => {
        const result = await tx.insert(forumPosts).values({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          type: input.type,
          imageUrl: input.imageUrl || null,
        });

        const postId = Number(result[0]?.insertId ?? 0);

        if (input.type === "poll" && input.poll && postId > 0) {
          const pollResult = await tx.insert(forumPolls).values({
            postId,
            question: input.poll.question,
          });

          const pollId = Number(pollResult[0]?.insertId ?? 0);

          if (pollId > 0) {
            for (const optionText of input.poll.options) {
              await tx.insert(forumPollOptions).values({
                pollId,
                optionText,
              });
            }
          }
        }

        return { id: postId };
      });
    }),

  comment: authedQuery
    .input(
      z.object({
        postId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(forumComments).values({
        postId: input.postId,
        userId: ctx.user.id,
        content: input.content,
      });

      const commentId = Number(result[0]?.insertId ?? 0);
      const comment = await db.query.forumComments.findFirst({
        where: eq(forumComments.id, commentId),
        with: { user: true },
      });

      return comment;
    }),

  votePoll: authedQuery
    .input(
      z.object({
        pollId: z.number(),
        optionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const existing = await db
        .select()
        .from(forumPollVotes)
        .where(
          and(
            eq(forumPollVotes.pollId, input.pollId),
            eq(forumPollVotes.userId, ctx.user.id)
          )
        );

      if (existing.length > 0) throw new Error("You have already voted");

      await db.insert(forumPollVotes).values({
        pollId: input.pollId,
        optionId: input.optionId,
        userId: ctx.user.id,
      });

      const options = await db.query.forumPollOptions.findMany({
        where: eq(forumPollOptions.pollId, input.pollId),
        with: { votes: true },
      });

      const totalVotes = options.reduce((sum, opt) => sum + opt.votes.length, 0);

      return {
        success: true,
        options: options.map((opt) => ({
          id: opt.id,
          voteCount: opt.votes.length,
          percentage:
            totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0,
        })),
        totalVotes,
      };
    }),
});
