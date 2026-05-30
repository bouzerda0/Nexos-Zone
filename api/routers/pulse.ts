import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  pulseFoodPosts,
  pulseFoodBookings,
  pulseEvents,
  pulseEventAttendees,
  users,
} from "@db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

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

      const posts = where
        ? await db.select().from(pulseFoodPosts).where(where).orderBy(desc(pulseFoodPosts.createdAt))
        : await db.select().from(pulseFoodPosts).orderBy(desc(pulseFoodPosts.createdAt));

      if (posts.length === 0) return [];

      const postIds = posts.map((p) => p.id);
      const postUserIds = [...new Set(posts.map((p) => p.userId))];

      const postUsers = postUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, postUserIds))
        : [];

      const allBookings = postIds.length > 0
        ? await db.select().from(pulseFoodBookings).where(inArray(pulseFoodBookings.postId, postIds))
        : [];

      const bookingUserIds = [...new Set(allBookings.map((b) => b.userId))];
      const bookingUsers = bookingUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, bookingUserIds))
        : [];

      const userMap = new Map(postUsers.concat(bookingUsers).map((u) => [u.id, u]));

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

      const events = where
        ? await db.select().from(pulseEvents).where(where).orderBy(desc(pulseEvents.eventDate))
        : await db.select().from(pulseEvents).orderBy(desc(pulseEvents.eventDate));

      if (events.length === 0) return [];

      const eventIds = events.map((e) => e.id);
      const eventUserIds = [...new Set(events.map((e) => e.userId))];

      const eventUsers = eventUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, eventUserIds))
        : [];

      const allAttendees = eventIds.length > 0
        ? await db.select().from(pulseEventAttendees).where(inArray(pulseEventAttendees.eventId, eventIds))
        : [];

      const attendeeUserIds = [...new Set(allAttendees.map((a) => a.userId))];
      const attendeeUsers = attendeeUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, attendeeUserIds))
        : [];

      const userMap = new Map(eventUsers.concat(attendeeUsers).map((u) => [u.id, u]));

      return events.map((event) => {
        const eventUser = userMap.get(event.userId);
        const eventAttendees = allAttendees
          .filter((a) => a.eventId === event.id)
          .map((attendee) => {
            const aUser = userMap.get(attendee.userId);
            return {
              ...attendee,
              user: aUser ? { ...aUser, avatarUrl: aUser.avatarUrl || null } : null,
            };
          });

        return {
          ...event,
          user: eventUser ? { ...eventUser, avatarUrl: eventUser.avatarUrl || null } : null,
          attendees: eventAttendees,
          _count: { attendees: eventAttendees.length },
          isAttending: eventAttendees.some((a) => a.userId === ctx.user.id),
        };
      });
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
