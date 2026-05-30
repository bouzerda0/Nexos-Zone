import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users (Auth) ────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  intraId: int("intraId").notNull().unique(),
  login: varchar("login", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  avatarUrl: text("avatarUrl"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Profiles ────────────────────────────────────────────────────────

export const profiles = mysqlTable("profiles", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  bio: text("bio"),
  phone: varchar("phone", { length: 20 }),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;

// ─── Module 1: Nexus Transit ────────────────────────────────────────

export const transitPosts = mysqlTable("transit_posts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  direction: mysqlEnum("direction", ["aller", "retour"]).notNull(),
  fromLocation: varchar("fromLocation", { length: 255 }).notNull(),
  toLocation: varchar("toLocation", { length: 255 }).notNull(),
  departureTime: timestamp("departureTime").notNull(),
  meetingPoint: varchar("meetingPoint", { length: 255 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["open", "full", "completed", "cancelled"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TransitPost = typeof transitPosts.$inferSelect;

export const transitBookings = mysqlTable(
  "transit_bookings",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("transit_booking_unique").on(table.postId, table.userId),
  ]
);

export type TransitBooking = typeof transitBookings.$inferSelect;

// ─── Module 2: Nexus Habitat ────────────────────────────────────────

export const habitatPosts = mysqlTable("habitat_posts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  rentPerPerson: int("rentPerPerson").notNull(),
  spotsAvailable: int("spotsAvailable").notNull(),
  tags: text("tags").notNull(), // JSON stringified array
  rules: text("rules").notNull(),
  status: mysqlEnum("status", ["open", "filled", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type HabitatPost = typeof habitatPosts.$inferSelect;

export const habitatRequests = mysqlTable(
  "habitat_requests",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    message: text("message"),
    status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("habitat_request_unique").on(table.postId, table.userId),
  ]
);

export type HabitatRequest = typeof habitatRequests.$inferSelect;

// ─── Module 3: Nexus Pulse (Food + Events) ──────────────────────────

export const pulseFoodPosts = mysqlTable("pulse_food_posts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  restaurantName: varchar("restaurantName", { length: 255 }).notNull(),
  menuItems: text("menuItems").notNull(),
  deliveryFee: int("deliveryFee").notNull(),
  maxPeople: int("maxPeople").notNull().default(5),
  orderDeadline: timestamp("orderDeadline").notNull(),
  status: mysqlEnum("status", ["open", "locked", "ordered"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PulseFoodPost = typeof pulseFoodPosts.$inferSelect;

export const pulseFoodBookings = mysqlTable(
  "pulse_food_bookings",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pulse_food_booking_unique").on(table.postId, table.userId),
  ]
);

export type PulseFoodBooking = typeof pulseFoodBookings.$inferSelect;

export const pulseEvents = mysqlTable("pulse_events", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  eventType: mysqlEnum("eventType", ["movie", "board_games", "study", "other"]).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  eventDate: timestamp("eventDate").notNull(),
  maxAttendees: int("maxAttendees"),
  status: mysqlEnum("status", ["upcoming", "ongoing", "completed", "cancelled"]).default("upcoming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PulseEvent = typeof pulseEvents.$inferSelect;

export const pulseEventAttendees = mysqlTable(
  "pulse_event_attendees",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    eventId: bigint("eventId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("pulse_event_attendee_unique").on(table.eventId, table.userId),
  ]
);

export type PulseEventAttendee = typeof pulseEventAttendees.$inferSelect;

// ─── Module 4: Nexus Forum ──────────────────────────────────────────

export const forumPosts = mysqlTable("forum_posts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["meme", "poll", "discussion"]).notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ForumPost = typeof forumPosts.$inferSelect;

export const forumComments = mysqlTable("forum_comments", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumComment = typeof forumComments.$inferSelect;

export const forumPolls = mysqlTable("forum_polls", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull().unique(),
  question: varchar("question", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumPoll = typeof forumPolls.$inferSelect;

export const forumPollOptions = mysqlTable("forum_poll_options", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  pollId: bigint("pollId", { mode: "number", unsigned: true }).notNull(),
  optionText: varchar("optionText", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumPollOption = typeof forumPollOptions.$inferSelect;

export const forumPollVotes = mysqlTable(
  "forum_poll_votes",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    pollId: bigint("pollId", { mode: "number", unsigned: true }).notNull(),
    optionId: bigint("optionId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("forum_poll_vote_unique").on(table.pollId, table.userId),
  ]
);

export type ForumPollVote = typeof forumPollVotes.$inferSelect;

// ─── Module 5: Nexus Spirit & Arena ─────────────────────────────────

export const prayerTimesCache = mysqlTable("prayer_times_cache", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(),
  fajr: varchar("fajr", { length: 10 }).notNull(),
  dhuhr: varchar("dhuhr", { length: 10 }).notNull(),
  asr: varchar("asr", { length: 10 }).notNull(),
  maghrib: varchar("maghrib", { length: 10 }).notNull(),
  isha: varchar("isha", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrayerTimesCache = typeof prayerTimesCache.$inferSelect;

export const arenaMatches = mysqlTable("arena_matches", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  matchType: mysqlEnum("matchType", ["football", "basketball"]).notNull(),
  teamA: varchar("teamA", { length: 255 }),
  teamB: varchar("teamB", { length: 255 }),
  location: varchar("location", { length: 255 }).notNull(),
  matchDate: timestamp("matchDate").notNull(),
  maxPlayers: int("maxPlayers").notNull().default(10),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ArenaMatch = typeof arenaMatches.$inferSelect;

export const arenaMatchPlayers = mysqlTable(
  "arena_match_players",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    matchId: bigint("matchId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("arena_match_player_unique").on(table.matchId, table.userId),
  ]
);

export type ArenaMatchPlayer = typeof arenaMatchPlayers.$inferSelect;
