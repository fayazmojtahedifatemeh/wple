import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Price history entry type
export const priceHistoryEntrySchema = z.object({
  price: z.number(),
  currency: z.string(),
  recordedAt: z.string(),
});

export type PriceHistoryEntry = z.infer<typeof priceHistoryEntrySchema>;

// Wishlist items
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  brand: text("brand"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("$"),
  url: text("url").notNull(),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  customCategoryId: varchar("custom_category_id"),
  inStock: boolean("in_stock").notNull().default(true),
  colors: text("colors").array().default(sql`ARRAY[]::text[]`),
  sizes: text("sizes").array().default(sql`ARRAY[]::text[]`),
  priceHistory: jsonb("price_history").$type<PriceHistoryEntry[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWishlistItemSchema = insertWishlistItemSchema.partial().omit({
  priceHistory: true,
});

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type UpdateWishlistItem = z.infer<typeof updateWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

// Custom categories
export const customCategories = pgTable("custom_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomCategorySchema = createInsertSchema(customCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomCategory = z.infer<typeof insertCustomCategorySchema>;
export type CustomCategory = typeof customCategories.$inferSelect;
