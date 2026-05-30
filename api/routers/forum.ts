import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  forumPosts,
  forumComments,
  forumPolls,
  forumPollOptions,
  forumPollVotes,
  users,
} from "@db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

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

      const posts = where
        ? await db.select().from(forumPosts).where(where).orderBy(input?.sort === "popular" ? desc(sql`count_comments`) : desc(forumPosts.createdAt))
        : await db.select().from(forumPosts).orderBy(input?.sort === "popular" ? desc(sql`count_comments`) : desc(forumPosts.createdAt));

      if (posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);
      const postUserIds = [...new Set(posts.map((p) => p.userId))];

      const postUsers = postUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, postUserIds))
        : [];

      const comments = postIds.length > 0
        ? await db.select().from(forumComments).where(inArray(forumComments.postId, postIds))
        : [];

      const commentUserIds = [...new Set(comments.map((c) => c.userId))];
      const commentUsers = commentUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, commentUserIds))
        : [];

      const polls = postIds.length > 0
        ? await db.select().from(forumPolls).where(inArray(forumPolls.postId, postIds))
        : [];

      const pollIds = polls.map((p) => p.id);
      
      const pollOptions = pollIds.length > 0
        ? await db.select().from(forumPollOptions).where(inArray(forumPollOptions.pollId, pollIds))
        : [];

      const pollVotes = pollIds.length > 0
        ? await db.select().from(forumPollVotes).where(inArray(forumPollVotes.pollId, pollIds))
        : [];

      const userMap = new Map(postUsers.concat(commentUsers).map((u) => [u.id, u]));

      return posts.map((post) => {
        const postUser = userMap.get(post.userId);
        const postComments = comments
          .filter((c) => c.postId === post.id)
          .map((c) => {
            const cUser = userMap.get(c.userId);
            return {
              ...c,
              user: cUser ? { ...cUser, avatarUrl: cUser.avatarUrl || null } : null,
            };
          });

        const postPoll = polls.find((p) => p.postId === post.id);
        
        let formattedPoll = null;
        if (postPoll) {
          const optionsForPoll = pollOptions.filter((o) => o.pollId === postPoll.id);
          const votesForPoll = pollVotes.filter((v) => v.pollId === postPoll.id);
          
          const hasVoted = votesForPoll.some((v) => v.userId === ctx.user.id);
          const totalVotes = votesForPoll.length;
          
          formattedPoll = {
            ...postPoll,
            hasVoted,
            totalVotes,
            options: optionsForPoll.map((opt) => {
              const optVotes = votesForPoll.filter((v) => v.optionId === opt.id);
              return {
                ...opt,
                votes: optVotes,
                voteCount: optVotes.length,
              };
            }),
          };
        }

        return {
          ...post,
          user: postUser ? { ...postUser, avatarUrl: postUser.avatarUrl || null } : null,
          comments: postComments,
          _count: { comments: postComments.length },
          poll: formattedPoll,
        };
      });
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, input.id));
      if (!post) throw new Error("Post not found");

      const [postUser] = await db.select().from(users).where(eq(users.id, post.userId));

      const comments = await db.select().from(forumComments).where(eq(forumComments.postId, post.id));
      const commentUserIds = [...new Set(comments.map((c) => c.userId))];
      const commentUsers = commentUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, commentUserIds))
        : [];

      const [postPoll] = await db.select().from(forumPolls).where(eq(forumPolls.postId, post.id));
      
      let pollOptions: any[] = [];
      let pollVotes: any[] = [];
      
      if (postPoll) {
        pollOptions = await db.select().from(forumPollOptions).where(eq(forumPollOptions.pollId, postPoll.id));
        pollVotes = await db.select().from(forumPollVotes).where(eq(forumPollVotes.pollId, postPoll.id));
      }

      const userMap = new Map(commentUsers.map((u) => [u.id, u]));

      const postComments = comments.map((c) => {
        const cUser = userMap.get(c.userId);
        return {
          ...c,
          user: cUser ? { ...cUser, avatarUrl: cUser.avatarUrl || null } : null,
        };
      });

      let formattedPoll = null;
      if (postPoll) {
        const hasVoted = pollVotes.some((v) => v.userId === ctx.user.id);
        const totalVotes = pollVotes.length;
        
        formattedPoll = {
          ...postPoll,
          hasVoted,
          totalVotes,
          options: pollOptions.map((opt) => {
            const optVotes = pollVotes.filter((v) => v.optionId === opt.id);
            return {
              ...opt,
              votes: optVotes,
              voteCount: optVotes.length,
            };
          }),
        };
      }

      return {
        ...post,
        user: postUser ? { ...postUser, avatarUrl: postUser.avatarUrl || null } : null,
        comments: postComments,
        _count: { comments: postComments.length },
        poll: formattedPoll,
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
      const [comment] = await db.select().from(forumComments).where(eq(forumComments.id, commentId));
      
      let commentUser = null;
      if (comment) {
        const [u] = await db.select().from(users).where(eq(users.id, comment.userId));
        commentUser = u;
      }

      return comment ? { ...comment, user: commentUser ? { ...commentUser, avatarUrl: commentUser.avatarUrl || null } : null } : null;
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

      const options = await db.select().from(forumPollOptions).where(eq(forumPollOptions.pollId, input.pollId));
      const optionIds = options.map(o => o.id);
      
      const votes = optionIds.length > 0 
        ? await db.select().from(forumPollVotes).where(inArray(forumPollVotes.optionId, optionIds))
        : [];

      const optionsWithVotes = options.map((opt) => ({
        ...opt,
        votes: votes.filter((v) => v.optionId === opt.id),
      }));

      const totalVotes = optionsWithVotes.reduce((sum, opt) => sum + opt.votes.length, 0);

      return {
        success: true,
        options: optionsWithVotes.map((opt) => ({
          id: opt.id,
          voteCount: opt.votes.length,
          percentage:
            totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0,
        })),
        totalVotes,
      };
    }),
});
