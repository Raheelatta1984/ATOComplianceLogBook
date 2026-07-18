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

export const cars = pgTable("cars", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year"),
  color: varchar("color", { length: 50 }),
  rego: varchar("rego", { length: 20 }),
  vin: varchar("vin", { length: 30 }),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const carExpenses = pgTable("car_expenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  carId: uuid("car_id").references(() => cars.id, { onDelete: "cascade" }),
  expenseDate: varchar("expense_date", { length: 10 }).notNull(),
  category: varchar("category", { length: 30 }).notNull().default("maintenance"), // maintenance, repair, parts, fuel, registration, insurance, other
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vendor: varchar("vendor", { length: 255 }),
  odometerAt: decimal("odometer_at", { precision: 10, scale: 2 }),
  invoiceImage: text("invoice_image"), // base64
  ocrText: text("ocr_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const serviceRecords = pgTable("service_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  carId: uuid("car_id").references(() => cars.id, { onDelete: "cascade" }),
  serviceDate: varchar("service_date", { length: 10 }).notNull(),
  odometer: decimal("odometer", { precision: 10, scale: 2 }).notNull(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  vendor: varchar("vendor", { length: 255 }),
  notes: text("notes"),
  nextDueDate: varchar("next_due_date", { length: 10 }),
  nextDueOdometer: decimal("next_due_odometer", { precision: 10, scale: 2 }),
  invoiceImage: text("invoice_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const mechanics = pgTable("mechanics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: text("address").notNull(),
  suburb: varchar("suburb", { length: 100 }),
  state: varchar("state", { length: 3 }),
  postcode: varchar("postcode", { length: 4 }),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  topReviews: jsonb("top_reviews"), // [{ author, rating, text }]
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const chitfundPools = pgTable("chitfund_pools", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  dailyAmount: decimal("daily_amount", { precision: 8, scale: 2 }).notNull().default("5"),
  maxMembers: integer("max_members").notNull().default(30),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, active, closed
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: varchar("start_date", { length: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const chitfundMembers = pgTable("chitfund_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: uuid("pool_id").notNull().references(() => chitfundPools.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userName: varchar("user_name", { length: 255 }).notNull(),
  hasWon: boolean("has_won").notNull().default(false),
  wonDate: varchar("won_date", { length: 10 }),
  wonAmount: decimal("won_amount", { precision: 10, scale: 2 }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const chitfundEntries = pgTable("chitfund_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: uuid("pool_id").notNull().references(() => chitfundPools.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entryDate: varchar("entry_date", { length: 10 }).notNull(),
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const chitfundDraws = pgTable("chitfund_draws", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: uuid("pool_id").notNull().references(() => chitfundPools.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userName: varchar("user_name", { length: 255 }).notNull(),
  drawDate: varchar("draw_date", { length: 10 }).notNull(),
  amountWon: decimal("amount_won", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`).notNull(),
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
