import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { transitPosts, transitBookings, users } from "@db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const transitRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        direction: z.enum(["aller", "retour"]).optional(),
        status: z.enum(["open", "full", "completed", "cancelled"]).optional(),
        mine: z.boolean().optional(),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = getDb();
        const conditions = [];

        if (input?.direction) {
          conditions.push(eq(transitPosts.direction, input.direction));
        }
        if (input?.status) {
          conditions.push(eq(transitPosts.status, input.status));
        }
        if (input?.mine) {
          conditions.push(eq(transitPosts.userId, ctx.user.id));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const posts = where
          ? await db.select().from(transitPosts).where(where).orderBy(desc(transitPosts.createdAt))
          : await db.select().from(transitPosts).orderBy(desc(transitPosts.createdAt));

        if (posts.length === 0) return [];

        const postIds = posts.map(p => p.id);
        const postUserIds = [...new Set(posts.map(p => p.userId))];

        const postUsers = postUserIds.length > 0 
          ? await db.select().from(users).where(inArray(users.id, postUserIds))
          : [];

        const allBookings = postIds.length > 0
          ? await db.select().from(transitBookings).where(inArray(transitBookings.postId, postIds))
          : [];

        const bookingUserIds = [...new Set(allBookings.map(b => b.userId))];
        const bookingUsers = bookingUserIds.length > 0
          ? await db.select().from(users).where(inArray(users.id, bookingUserIds))
          : [];

        const userMap = new Map(postUsers.concat(bookingUsers).map(u => [u.id, u]));

        return posts.map((post) => {
          const postUser = userMap.get(post.userId);
          const postBookings = allBookings
            .filter((b) => b.postId === post.id)
            .map((booking) => {
              const bUser = userMap.get(booking.userId);
              return {
                ...booking,
                user: bUser ? { ...bUser, avatarUrl: bUser.avatarUrl || null } : null,
              };
            });

          return {
            ...post,
            user: postUser ? { ...postUser, avatarUrl: postUser.avatarUrl || null } : null,
            bookings: postBookings,
            _count: { bookings: postBookings.length },
          };
        });
      } catch (error) {
        console.error("Error in transit.list:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch transit posts",
          cause: error,
        });
      }
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [post] = await db.select().from(transitPosts).where(eq(transitPosts.id, input.id));
      if (!post) throw new Error("Post not found");

      const [postUser] = await db.select().from(users).where(eq(users.id, post.userId));

      const bookings = await db.select().from(transitBookings).where(eq(transitBookings.postId, post.id));
      const bookingUserIds = [...new Set(bookings.map((b) => b.userId))];
      const bUsers = bookingUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, bookingUserIds))
        : [];
      const userMap = new Map(bUsers.map((u) => [u.id, u]));

      return {
        ...post,
        user: postUser ? { ...postUser, avatarUrl: postUser.avatarUrl || null } : null,
        bookings: bookings.map((b) => {
          const u = userMap.get(b.userId);
          return {
            ...b,
            user: u ? { ...u, avatarUrl: u.avatarUrl || null } : null,
          };
        }),
        _count: { bookings: bookings.length },
      };
    }),

  create: authedQuery
    .input(
      z.object({
        direction: z.enum(["aller", "retour"]),
        fromLocation: z.string().min(1),
        toLocation: z.string().min(1),
        departureTime: z.string().min(1),
        meetingPoint: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(transitPosts).values({
        userId: ctx.user.id,
        direction: input.direction,
        fromLocation: input.fromLocation,
        toLocation: input.toLocation,
        departureTime: new Date(input.departureTime),
        meetingPoint: input.meetingPoint,
        notes: input.notes || null,
      });
      const insertedId = Number(result[0]?.insertId ?? 0);
      return { id: insertedId };
    }),

  book: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      return db.transaction(async (tx) => {
        const [post] = await tx
          .select()
          .from(transitPosts)
          .where(eq(transitPosts.id, input.postId));

        if (!post) throw new Error("Ride not found");
        if (post.status === "full") throw new Error("This ride is already full");
        if (post.status === "cancelled")
          throw new Error("This ride has been cancelled");
        if (post.userId === ctx.user.id)
          throw new Error("You cannot book your own ride");
        if (new Date(post.departureTime) < new Date())
          throw new Error("This ride has already departed");

        const existingBooking = await tx
          .select()
          .from(transitBookings)
          .where(
            and(
              eq(transitBookings.postId, input.postId),
              eq(transitBookings.userId, ctx.user.id)
            )
          );
        if (existingBooking.length > 0)
          throw new Error("You have already booked this ride");

        const currentBookings = await tx
          .select({ count: sql<number>`count(*)` })
          .from(transitBookings)
          .where(eq(transitBookings.postId, input.postId));
        const bookingCount = Number(currentBookings[0].count);

        if (bookingCount >= 4) {
          throw new Error("This ride is already full");
        }

        await tx.insert(transitBookings).values({
          postId: input.postId,
          userId: ctx.user.id,
        });

        if (bookingCount + 1 >= 4) {
          await tx
            .update(transitPosts)
            .set({ status: "full" })
            .where(eq(transitPosts.id, input.postId));
        }

        return { success: true, message: "Successfully booked the ride!" };
      });
    }),

  cancelBooking: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db.transaction(async (tx) => {
        const [booking] = await tx
          .select()
          .from(transitBookings)
          .where(
            and(
              eq(transitBookings.postId, input.postId),
              eq(transitBookings.userId, ctx.user.id)
            )
          );

        if (!booking) throw new Error("Booking not found");

        await tx
          .delete(transitBookings)
          .where(eq(transitBookings.id, booking.id));

        const [post] = await tx
          .select()
          .from(transitPosts)
          .where(eq(transitPosts.id, input.postId));

        if (post && post.status === "full") {
          await tx
            .update(transitPosts)
            .set({ status: "open" })
            .where(eq(transitPosts.id, input.postId));
        }
      });

      return { success: true, message: "Booking cancelled" };
    }),

  cancel: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [post] = await db
        .select()
        .from(transitPosts)
        .where(eq(transitPosts.id, input.id));

      if (!post) throw new Error("Post not found");
      if (post.userId !== ctx.user.id)
        throw new Error("Only the driver can cancel this ride");

      await db
        .update(transitPosts)
        .set({ status: "cancelled" })
        .where(eq(transitPosts.id, input.id));

      return { success: true, message: "Ride cancelled" };
    }),
});
