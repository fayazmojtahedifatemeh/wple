// Blueprint: javascript_database
import { 
  users,
  wishlistItems,
  customCategories,
  type User, 
  type InsertUser,
  type WishlistItem,
  type InsertWishlistItem,
  type UpdateWishlistItem,
  type CustomCategory,
  type InsertCustomCategory,
  type PriceHistoryEntry
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wishlist items
  getWishlistItems(): Promise<WishlistItem[]>;
  getWishlistItem(id: string): Promise<WishlistItem | undefined>;
  getWishlistItemsByCategory(category: string, subcategory?: string): Promise<WishlistItem[]>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  updateWishlistItem(id: string, updates: UpdateWishlistItem): Promise<WishlistItem | undefined>;
  addPriceHistoryEntry(id: string, entry: PriceHistoryEntry): Promise<WishlistItem | undefined>;
  deleteWishlistItem(id: string): Promise<boolean>;
  
  // Custom categories
  getCustomCategories(): Promise<CustomCategory[]>;
  createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory>;
  deleteCustomCategory(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Wishlist items
  async getWishlistItems(): Promise<WishlistItem[]> {
    return await db.select().from(wishlistItems);
  }

  async getWishlistItem(id: string): Promise<WishlistItem | undefined> {
    const [item] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, id));
    return item || undefined;
  }

  async getWishlistItemsByCategory(category: string, subcategory?: string): Promise<WishlistItem[]> {
    if (subcategory) {
      return await db
        .select()
        .from(wishlistItems)
        .where(and(eq(wishlistItems.category, category), eq(wishlistItems.subcategory, subcategory)));
    }
    return await db.select().from(wishlistItems).where(eq(wishlistItems.category, category));
  }

  async createWishlistItem(insertItem: InsertWishlistItem): Promise<WishlistItem> {
    const currency = insertItem.currency || "$";
    const price = typeof insertItem.price === 'string' ? parseFloat(insertItem.price) : insertItem.price;
    
    const initialPriceEntry: PriceHistoryEntry = {
      price,
      currency,
      recordedAt: new Date().toISOString(),
    };
    
    const [item] = await db
      .insert(wishlistItems)
      .values({
        ...insertItem,
        currency,
        priceHistory: [initialPriceEntry],
      })
      .returning();
    
    return item;
  }

  async updateWishlistItem(id: string, updates: UpdateWishlistItem): Promise<WishlistItem | undefined> {
    const [item] = await db
      .update(wishlistItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, id))
      .returning();
    
    return item || undefined;
  }

  async addPriceHistoryEntry(id: string, entry: PriceHistoryEntry): Promise<WishlistItem | undefined> {
    const item = await this.getWishlistItem(id);
    if (!item) return undefined;
    
    const newHistory = [...item.priceHistory, entry];
    
    const [updatedItem] = await db
      .update(wishlistItems)
      .set({
        price: entry.price.toString(),
        priceHistory: newHistory as any,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, id))
      .returning();
    
    return updatedItem || undefined;
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    const result = await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Custom categories
  async getCustomCategories(): Promise<CustomCategory[]> {
    return await db.select().from(customCategories);
  }

  async createCustomCategory(insertCategory: InsertCustomCategory): Promise<CustomCategory> {
    const [category] = await db
      .insert(customCategories)
      .values(insertCategory)
      .returning();
    
    return category;
  }

  async deleteCustomCategory(id: string): Promise<boolean> {
    const result = await db.delete(customCategories).where(eq(customCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
