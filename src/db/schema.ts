import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("entrepreneur"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  state: text("state"),
  category: text("category"),
  gender: text("gender"),
  sector: text("sector"),
  area: text("area"),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const schemes = pgTable("schemes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ministry: text("ministry").notNull(),
  description: text("description").notNull(),
  verificationStatus: text("verification_status").notNull().default("demo"),
  lastVerified: text("last_verified").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  schemeId: text("scheme_id").notNull(),
  schemeName: text("scheme_name").notNull(),
  status: text("status").notNull().default("Not Started"),
  timeline: jsonb("timeline").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchRuns = pgTable("match_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  profileSummary: jsonb("profile_summary").notNull(),
  topSchemes: jsonb("top_schemes").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
