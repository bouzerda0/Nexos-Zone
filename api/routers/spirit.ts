import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { prayerTimesCache, arenaMatches, arenaMatchPlayers } from "@db/schema";
import { eq, and, sql, gte, lt } from "drizzle-orm";

// Prayer times calculation using simplified algorithm for Oujda
function calculatePrayerTimes(date: Date) {
  // Rough seasonal variation for Oujda
  const month = date.getMonth();
  const day = date.getDate();
  const seasonalOffset = Math.sin(((month + day / 30) / 12) * Math.PI * 2 - Math.PI / 2);

  const times = {
    fajr: formatTime(5.5 + seasonalOffset * 0.5),
    dhuhr: formatTime(13.0 + seasonalOffset * 0.2),
    asr: formatTime(16.5 + seasonalOffset * 0.3),
    maghrib: formatTime(19.0 + seasonalOffset * 1.0),
    isha: formatTime(20.5 + seasonalOffset * 0.8),
  };

  return times;
}

function formatTime(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function getDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export const spiritRouter = createRouter({
  prayerTimes: authedQuery.query(async () => {
    const db = getDb();
    const today = new Date();
    const dateStr = getDateStr(today);

    const cached = await db.query.prayerTimesCache.findFirst({
      where: eq(prayerTimesCache.date, dateStr),
    });

    if (cached) {
      return {
        ...cached,
        city: "Oujda, Morocco",
        date: dateStr,
      };
    }

    const times = calculatePrayerTimes(today);

    await db.insert(prayerTimesCache).values({
      date: dateStr,
      ...times,
    });

    return {
      ...times,
      id: 0,
      createdAt: new Date(),
      date: dateStr,
      city: "Oujda, Morocco",
    };
  }),

  matchToday: authedQuery.query(async () => {
    const db = getDb();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const match = await db.query.arenaMatches.findFirst({
      where: and(
        gte(arenaMatches.matchDate, startOfDay),
        lt(arenaMatches.matchDate, endOfDay),
        eq(arenaMatches.status, "scheduled")
      ),
      with: {
        user: true,
        players: { with: { user: true } },
      },
    });

    if (!match) return null;

    return {
      ...match,
      _count: { players: match.players.length },
    };
  }),

  matchUpcoming: authedQuery.query(async () => {
    const db = getDb();
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const threeDaysLater = new Date(tomorrow);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const matches = await db.query.arenaMatches.findMany({
      where: and(
        gte(arenaMatches.matchDate, tomorrow),
        lt(arenaMatches.matchDate, threeDaysLater),
        eq(arenaMatches.status, "scheduled")
      ),
      with: {
        user: true,
        players: { with: { user: true } },
      },
    });

    return matches.map((match) => ({
      ...match,
      _count: { players: match.players.length },
    }));
  }),

  createMatch: authedQuery
    .input(
      z.object({
        matchType: z.enum(["football", "basketball"]),
        location: z.string().min(1),
        matchDate: z.string().datetime(),
        maxPlayers: z.number().min(2).max(22),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const matchDateObj = new Date(input.matchDate);
      const dateStart = new Date(
        matchDateObj.getFullYear(),
        matchDateObj.getMonth(),
        matchDateObj.getDate()
      );
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);

      const existingMatch = await db
        .select()
        .from(arenaMatches)
        .where(
          and(
            gte(arenaMatches.matchDate, dateStart),
            lt(arenaMatches.matchDate, dateEnd),
            eq(arenaMatches.status, "scheduled")
          )
        );

      if (existingMatch.length > 0) {
        throw new Error(
          "A match is already scheduled for this day. Only one match per day is allowed."
        );
      }

      const result = await db.insert(arenaMatches).values({
        userId: ctx.user.id,
        matchType: input.matchType,
        location: input.location,
        matchDate: matchDateObj,
        maxPlayers: input.maxPlayers,
        notes: input.notes || null,
      });

      return { id: Number(result[0]?.insertId ?? 0) };
    }),

  joinMatch: authedQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [match] = await db
        .select()
        .from(arenaMatches)
        .where(eq(arenaMatches.id, input.matchId));

      if (!match) throw new Error("Match not found");
      if (match.status === "cancelled")
        throw new Error("This match has been cancelled");

      const existing = await db
        .select()
        .from(arenaMatchPlayers)
        .where(
          and(
            eq(arenaMatchPlayers.matchId, input.matchId),
            eq(arenaMatchPlayers.userId, ctx.user.id)
          )
        );
      if (existing.length > 0)
        throw new Error("You are already in this match");

      const playerCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(arenaMatchPlayers)
        .where(eq(arenaMatchPlayers.matchId, input.matchId));
      const count = Number(playerCount[0].count);

      if (count >= match.maxPlayers) {
        throw new Error("This match is full");
      }

      await db.insert(arenaMatchPlayers).values({
        matchId: input.matchId,
        userId: ctx.user.id,
      });

      return { success: true, message: "Joined the match!" };
    }),

  leaveMatch: authedQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db
        .delete(arenaMatchPlayers)
        .where(
          and(
            eq(arenaMatchPlayers.matchId, input.matchId),
            eq(arenaMatchPlayers.userId, ctx.user.id)
          )
        );

      return { success: true, message: "Left the match" };
    }),

  cancelMatch: authedQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [match] = await db
        .select()
        .from(arenaMatches)
        .where(eq(arenaMatches.id, input.matchId));

      if (!match) throw new Error("Match not found");
      if (match.userId !== ctx.user.id)
        throw new Error("Only the organizer can cancel this match");

      await db
        .update(arenaMatches)
        .set({ status: "cancelled" })
        .where(eq(arenaMatches.id, input.matchId));

      return { success: true, message: "Match cancelled" };
    }),
});
