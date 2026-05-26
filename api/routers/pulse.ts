import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  pulseFoodPosts,
  pulseFoodBookings,
  pulseEvents,
  pulseEventAttendees,
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const pulseRouter = createRouter({
  foodList: authedQuery
    .input(
      z.object({
        status: z.enum(["open", "locked", "ordered"]).optional(),
        mine: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(pulseFoodPosts.status, input.status));
      }
      if (input?.mine) {
        conditions.push(eq(pulseFoodPosts.userId, ctx.user.id));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const posts = await db.query.pulseFoodPosts.findMany({
        where,
        with: {
          user: true,
          bookings: { with: { user: true } },
        },
        orderBy: [desc(pulseFoodPosts.createdAt)],
      });

      return posts.map((post) => ({
        ...post,
        _count: { bookings: post.bookings.length },
      }));
    }),

  foodCreate: authedQuery
    .input(
      z.object({
        restaurantName: z.string().min(1),
        menuItems: z.string().min(1),
        deliveryFee: z.number().min(0),
        orderDeadline: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(pulseFoodPosts).values({
        userId: ctx.user.id,
        restaurantName: input.restaurantName,
        menuItems: input.menuItems,
        deliveryFee: input.deliveryFee,
        maxPeople: 5,
        orderDeadline: new Date(input.orderDeadline),
      });
      const insertedId = Number(result[0]?.insertId ?? 0);
      return { id: insertedId };
    }),

  foodJoin: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      return db.transaction(async (tx) => {
        const [post] = await tx
          .select()
          .from(pulseFoodPosts)
          .where(eq(pulseFoodPosts.id, input.postId));

        if (!post) throw new Error("Order not found");
        if (post.status !== "open") throw new Error("Order is not open");
        if (new Date(post.orderDeadline) < new Date())
          throw new Error("Order deadline has passed");

        const existing = await tx
          .select()
          .from(pulseFoodBookings)
          .where(
            and(
              eq(pulseFoodBookings.postId, input.postId),
              eq(pulseFoodBookings.userId, ctx.user.id)
            )
          );
        if (existing.length > 0) throw new Error("You already joined this order");

        const count = await tx
          .select({ count: sql<number>`count(*)` })
          .from(pulseFoodBookings)
          .where(eq(pulseFoodBookings.postId, input.postId));
        const bookingCount = Number(count[0].count);

        if (bookingCount >= 5) throw new Error("Order is full");

        await tx.insert(pulseFoodBookings).values({
          postId: input.postId,
          userId: ctx.user.id,
        });

        if (bookingCount + 1 >= 5) {
          await tx
            .update(pulseFoodPosts)
            .set({ status: "locked" })
            .where(eq(pulseFoodPosts.id, input.postId));
        }

        return { success: true, message: "Joined the food order!" };
      });
    }),

  foodLeave: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db.transaction(async (tx) => {
        const [booking] = await tx
          .select()
          .from(pulseFoodBookings)
          .where(
            and(
              eq(pulseFoodBookings.postId, input.postId),
              eq(pulseFoodBookings.userId, ctx.user.id)
            )
          );

        if (!booking) throw new Error("Booking not found");

        await tx
          .delete(pulseFoodBookings)
          .where(eq(pulseFoodBookings.id, booking.id));

        const [post] = await tx
          .select()
          .from(pulseFoodPosts)
          .where(eq(pulseFoodPosts.id, input.postId));

        if (post && post.status === "locked") {
          await tx
            .update(pulseFoodPosts)
            .set({ status: "open" })
            .where(eq(pulseFoodPosts.id, input.postId));
        }
      });

      return { success: true, message: "Left the order" };
    }),

  eventList: authedQuery
    .input(
      z.object({
        status: z
          .enum(["upcoming", "ongoing", "completed", "cancelled"])
          .optional(),
        mine: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(pulseEvents.status, input.status));
      }
      if (input?.mine) {
        conditions.push(eq(pulseEvents.userId, ctx.user.id));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const events = await db.query.pulseEvents.findMany({
        where,
        with: {
          user: true,
          attendees: { with: { user: true } },
        },
        orderBy: [desc(pulseEvents.eventDate)],
      });

      return events.map((event) => ({
        ...event,
        _count: { attendees: event.attendees.length },
        isAttending: event.attendees.some((a) => a.userId === ctx.user.id),
      }));
    }),

  eventCreate: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        eventType: z.enum(["movie", "board_games", "study", "other"]),
        location: z.string().min(1),
        eventDate: z.string().datetime(),
        maxAttendees: z.number().min(1).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(pulseEvents).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        location: input.location,
        eventDate: new Date(input.eventDate),
        maxAttendees: input.maxAttendees ?? null,
      });
      const insertedId = Number(result[0]?.insertId ?? 0);
      return { id: insertedId };
    }),

  eventJoin: authedQuery
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [event] = await db
        .select()
        .from(pulseEvents)
        .where(eq(pulseEvents.id, input.eventId));

      if (!event) throw new Error("Event not found");
      if (event.status === "cancelled")
        throw new Error("This event has been cancelled");
      if (new Date(event.eventDate) < new Date())
        throw new Error("This event has already passed");

      const existing = await db
        .select()
        .from(pulseEventAttendees)
        .where(
          and(
            eq(pulseEventAttendees.eventId, input.eventId),
            eq(pulseEventAttendees.userId, ctx.user.id)
          )
        );
      if (existing.length > 0)
        throw new Error("You are already attending this event");

      const attendeeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(pulseEventAttendees)
        .where(eq(pulseEventAttendees.eventId, input.eventId));
      const count = Number(attendeeCount[0].count);

      if (event.maxAttendees && count >= event.maxAttendees) {
        throw new Error("This event is full");
      }

      await db.insert(pulseEventAttendees).values({
        eventId: input.eventId,
        userId: ctx.user.id,
      });

      return { success: true, message: "You're attending!" };
    }),

  eventLeave: authedQuery
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db
        .delete(pulseEventAttendees)
        .where(
          and(
            eq(pulseEventAttendees.eventId, input.eventId),
            eq(pulseEventAttendees.userId, ctx.user.id)
          )
        );

      return { success: true, message: "No longer attending" };
    }),
});
