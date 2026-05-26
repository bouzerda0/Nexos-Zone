import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { transitPosts, transitBookings } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const transitRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        direction: z.enum(["aller", "retour"]).optional(),
        status: z.enum(["open", "full", "completed", "cancelled"]).optional(),
        mine: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
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

      const posts = await db.query.transitPosts.findMany({
        where,
        with: {
          user: true,
          bookings: {
            with: { user: true },
          },
        },
        orderBy: [desc(transitPosts.createdAt)],
      });

      return posts.map((post) => ({
        ...post,
        _count: { bookings: post.bookings.length },
      }));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const post = await db.query.transitPosts.findFirst({
        where: eq(transitPosts.id, input.id),
        with: {
          user: true,
          bookings: { with: { user: true } },
        },
      });
      if (!post) throw new Error("Post not found");
      return {
        ...post,
        _count: { bookings: post.bookings.length },
      };
    }),

  create: authedQuery
    .input(
      z.object({
        direction: z.enum(["aller", "retour"]),
        fromLocation: z.string().min(1),
        toLocation: z.string().min(1),
        departureTime: z.string().datetime(),
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
