import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';

export const authUsers = pgTable('auth_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  verified: text('verified').notNull().default('false'),
  refreshTokenHash: text('refresh_token_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  tier: text('tier').notNull().default('Pro'),
  joinDate: timestamp('join_date', { withTimezone: true }).defaultNow().notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const guestUsage = pgTable('guest_usage', {
  id: uuid('id').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp('last_seen', { withTimezone: true }).notNull().defaultNow()
});

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull().defaultNow()
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  title: text('title').notNull(),
  ticker: text('ticker').notNull(),
  status: text('status').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  targetId: uuid('target_id').notNull(),
  targetType: text('target_type').notNull().default('report'),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  targetId: uuid('target_id').notNull(),
  targetType: text('target_type').notNull().default('report'),
  verb: text('verb').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull()
});

export const conversationSessions = pgTable('conversation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull(),
  userId: uuid('user_id').notNull(),
  model: text('model'),
  tokenEstimate: integer('token_estimate'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  reportId: uuid('report_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  tokensEstimate: integer('tokens_estimate'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const conversationSummaries = pgTable('conversation_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull(),
  sessionId: uuid('session_id'),
  summary: text('summary').notNull(),
  coverageUpTo: timestamp('coverage_up_to', { withTimezone: true }),
  tokensEstimate: integer('tokens_estimate'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const analysisJobs = pgTable('analysis_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  ticker: text('ticker').notNull(),
  analysisType: text('analysis_type').notNull().default('gemini'),
  status: text('status').notNull().default('pending'),
  priority: integer('priority').notNull().default(0),
  reportId: uuid('report_id'),
  error: text('error'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true })
}, (table) => ({
  idxAnalysisJobsUserStatus: index('idx_analysis_jobs_user_status').on(table.userId, table.status),
  idxAnalysisJobsTickerCreated: index('idx_analysis_jobs_ticker_created').on(table.ticker, table.createdAt),
  idxAnalysisJobsStatusCreated: index('idx_analysis_jobs_status_created').on(table.status, table.createdAt)
}));
