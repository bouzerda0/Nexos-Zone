import { relations } from "drizzle-orm";
import {
  users,
  transitPosts,
  transitBookings,
  habitatPosts,
  habitatRequests,
  pulseFoodPosts,
  pulseFoodBookings,
  pulseEvents,
  pulseEventAttendees,
  forumPosts,
  forumComments,
  forumPolls,
  forumPollOptions,
  forumPollVotes,
  arenaMatches,
  arenaMatchPlayers,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  transitPosts: many(transitPosts),
  transitBookings: many(transitBookings),
  habitatPosts: many(habitatPosts),
  habitatRequests: many(habitatRequests),
  pulseFoodPosts: many(pulseFoodPosts),
  pulseFoodBookings: many(pulseFoodBookings),
  pulseEvents: many(pulseEvents),
  pulseEventAttendees: many(pulseEventAttendees),
  forumPosts: many(forumPosts),
  forumComments: many(forumComments),
  forumPollVotes: many(forumPollVotes),
  arenaMatches: many(arenaMatches),
  arenaMatchPlayers: many(arenaMatchPlayers),
}));

// ─── Transit ─────────────────────────────────────────────────────────

export const transitPostsRelations = relations(transitPosts, ({ one, many }) => ({
  user: one(users, { fields: [transitPosts.userId], references: [users.id] }),
  bookings: many(transitBookings),
}));

export const transitBookingsRelations = relations(transitBookings, ({ one }) => ({
  post: one(transitPosts, { fields: [transitBookings.postId], references: [transitPosts.id] }),
  user: one(users, { fields: [transitBookings.userId], references: [users.id] }),
}));

// ─── Habitat ─────────────────────────────────────────────────────────

export const habitatPostsRelations = relations(habitatPosts, ({ one, many }) => ({
  user: one(users, { fields: [habitatPosts.userId], references: [users.id] }),
  requests: many(habitatRequests),
}));

export const habitatRequestsRelations = relations(habitatRequests, ({ one }) => ({
  post: one(habitatPosts, { fields: [habitatRequests.postId], references: [habitatPosts.id] }),
  user: one(users, { fields: [habitatRequests.userId], references: [users.id] }),
}));

// ─── Pulse Food ──────────────────────────────────────────────────────

export const pulseFoodPostsRelations = relations(pulseFoodPosts, ({ one, many }) => ({
  user: one(users, { fields: [pulseFoodPosts.userId], references: [users.id] }),
  bookings: many(pulseFoodBookings),
}));

export const pulseFoodBookingsRelations = relations(pulseFoodBookings, ({ one }) => ({
  post: one(pulseFoodPosts, { fields: [pulseFoodBookings.postId], references: [pulseFoodPosts.id] }),
  user: one(users, { fields: [pulseFoodBookings.userId], references: [users.id] }),
}));

// ─── Pulse Events ────────────────────────────────────────────────────

export const pulseEventsRelations = relations(pulseEvents, ({ one, many }) => ({
  user: one(users, { fields: [pulseEvents.userId], references: [users.id] }),
  attendees: many(pulseEventAttendees),
}));

export const pulseEventAttendeesRelations = relations(pulseEventAttendees, ({ one }) => ({
  event: one(pulseEvents, { fields: [pulseEventAttendees.eventId], references: [pulseEvents.id] }),
  user: one(users, { fields: [pulseEventAttendees.userId], references: [users.id] }),
}));

// ─── Forum ───────────────────────────────────────────────────────────

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  user: one(users, { fields: [forumPosts.userId], references: [users.id] }),
  comments: many(forumComments),
  poll: one(forumPolls, { fields: [forumPosts.id], references: [forumPolls.postId] }),
}));

export const forumCommentsRelations = relations(forumComments, ({ one }) => ({
  post: one(forumPosts, { fields: [forumComments.postId], references: [forumPosts.id] }),
  user: one(users, { fields: [forumComments.userId], references: [users.id] }),
}));

export const forumPollsRelations = relations(forumPolls, ({ one, many }) => ({
  post: one(forumPosts, { fields: [forumPolls.postId], references: [forumPosts.id] }),
  options: many(forumPollOptions),
  votes: many(forumPollVotes),
}));

export const forumPollOptionsRelations = relations(forumPollOptions, ({ one, many }) => ({
  poll: one(forumPolls, { fields: [forumPollOptions.pollId], references: [forumPolls.id] }),
  votes: many(forumPollVotes),
}));

export const forumPollVotesRelations = relations(forumPollVotes, ({ one }) => ({
  poll: one(forumPolls, { fields: [forumPollVotes.pollId], references: [forumPolls.id] }),
  option: one(forumPollOptions, { fields: [forumPollVotes.optionId], references: [forumPollOptions.id] }),
  user: one(users, { fields: [forumPollVotes.userId], references: [users.id] }),
}));

// ─── Spirit & Arena ──────────────────────────────────────────────────

export const arenaMatchesRelations = relations(arenaMatches, ({ one, many }) => ({
  user: one(users, { fields: [arenaMatches.userId], references: [users.id] }),
  players: many(arenaMatchPlayers),
}));

export const arenaMatchPlayersRelations = relations(arenaMatchPlayers, ({ one }) => ({
  match: one(arenaMatches, { fields: [arenaMatchPlayers.matchId], references: [arenaMatches.id] }),
  user: one(users, { fields: [arenaMatchPlayers.userId], references: [users.id] }),
}));
