import { 
  type User, 
  type InsertUser,
  type WishlistItem,
  type InsertWishlistItem,
  type UpdateWishlistItem,
  type CustomCategory,
  type InsertCustomCategory,
  type PriceHistoryEntry
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private wishlistItems: Map<string, WishlistItem>;
  private customCategories: Map<string, CustomCategory>;

  constructor() {
    this.users = new Map();
    this.wishlistItems = new Map();
    this.customCategories = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Wishlist items
  async getWishlistItems(): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values());
  }

  async getWishlistItem(id: string): Promise<WishlistItem | undefined> {
    return this.wishlistItems.get(id);
  }

  async getWishlistItemsByCategory(category: string, subcategory?: string): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values()).filter(item => {
      if (subcategory) {
        return item.category === category && item.subcategory === subcategory;
      }
      return item.category === category;
    });
  }

  async createWishlistItem(insertItem: InsertWishlistItem): Promise<WishlistItem> {
    const id = randomUUID();
    const now = new Date();
    
    const currency = insertItem.currency || "$";
    const price = typeof insertItem.price === 'string' ? parseFloat(insertItem.price) : insertItem.price;
    
    const initialPriceEntry: PriceHistoryEntry = {
      price,
      currency,
      recordedAt: now.toISOString(),
    };
    
    const item: WishlistItem = { 
      ...insertItem,
      brand: insertItem.brand ?? null,
      subcategory: insertItem.subcategory ?? null,
      customCategoryId: insertItem.customCategoryId ?? null,
      colors: insertItem.colors ?? null,
      sizes: insertItem.sizes ?? null,
      currency,
      id,
      createdAt: now,
      updatedAt: now,
      priceHistory: [initialPriceEntry],
    };
    this.wishlistItems.set(id, item);
    return item;
  }

  async updateWishlistItem(id: string, updates: UpdateWishlistItem): Promise<WishlistItem | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem: WishlistItem = {
      ...item,
      ...updates,
      id: item.id,
      createdAt: item.createdAt,
      priceHistory: item.priceHistory,
      updatedAt: new Date(),
    };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }

  async addPriceHistoryEntry(id: string, entry: PriceHistoryEntry): Promise<WishlistItem | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem: WishlistItem = {
      ...item,
      price: entry.price.toString(),
      priceHistory: [...item.priceHistory, entry],
      updatedAt: new Date(),
    };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteWishlistItem(id: string): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }

  // Custom categories
  async getCustomCategories(): Promise<CustomCategory[]> {
    return Array.from(this.customCategories.values());
  }

  async createCustomCategory(insertCategory: InsertCustomCategory): Promise<CustomCategory> {
    const id = randomUUID();
    const category: CustomCategory = {
      ...insertCategory,
      icon: insertCategory.icon ?? null,
      id,
      createdAt: new Date(),
    };
    this.customCategories.set(id, category);
    return category;
  }

  async deleteCustomCategory(id: string): Promise<boolean> {
    return this.customCategories.delete(id);
  }
}

export const storage = new MemStorage();
