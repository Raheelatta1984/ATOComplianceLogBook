import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  businessName: varchar("business_name", { length: 255 }),
  abn: varchar("abn", { length: 11 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tripDate: varchar("trip_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }),
  startOdometer: decimal("start_odometer", { precision: 10, scale: 2 }).notNull(),
  endOdometer: decimal("end_odometer", { precision: 10, scale: 2 }),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  gpsDistanceKm: decimal("gps_distance_km", { precision: 10, scale: 2 }),
  pickupAddress: text("pickup_address").notNull(),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),
  pickupSuburb: varchar("pickup_suburb", { length: 100 }),
  pickupState: varchar("pickup_state", { length: 3 }),
  pickupPostcode: varchar("pickup_postcode", { length: 4 }),
  dropoffAddress: text("dropoff_address").notNull(),
  dropoffLat: decimal("dropoff_lat", { precision: 10, scale: 7 }),
  dropoffLng: decimal("dropoff_lng", { precision: 10, scale: 7 }),
  dropoffSuburb: varchar("dropoff_suburb", { length: 100 }),
  dropoffState: varchar("dropoff_state", { length: 3 }),
  dropoffPostcode: varchar("dropoff_postcode", { length: 4 }),
  isBusinessTrip: boolean("is_business_trip").notNull().default(true),
  tripPurpose: text("trip_purpose"),
  fareAmount: decimal("fare_amount", { precision: 10, scale: 2 }),
  source: varchar("source", { length: 20 }).notNull().default("manual"),
  gpsTrack: jsonb("gps_track"),
  maxSpeed: decimal("max_speed", { precision: 6, scale: 1 }),
  avgSpeed: decimal("avg_speed", { precision: 6, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const dailyOdometer = pgTable("daily_odometer", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  startOdometer: decimal("start_odometer", { precision: 10, scale: 2 }).notNull(),
  endOdometer: decimal("end_odometer", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const communityMessages = pgTable("community_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userName: varchar("user_name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const importHistory = pgTable("import_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 20 }).notNull(),
  fileName: text("file_name"),
  tripsImported: integer("trips_imported").default(0),
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type DailyOdometer = typeof dailyOdometer.$inferSelect;
export type CommunityMessage = typeof communityMessages.$inferSelect;
