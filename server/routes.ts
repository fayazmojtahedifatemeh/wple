import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeProductFromUrl } from "./scraper";
import { categorizeProduct } from "./gemini";
import {
  insertWishlistItemSchema,
  insertCustomCategorySchema,
  type InsertScrapedProduct, // FIX: Import new type
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Scrape product from URL
  app.post("/api/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      const scrapedProduct = await scrapeProductFromUrl(url);
      res.json(scrapedProduct);
    } catch (error) {
      console.error("Scraping error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to scrape product";
      res.status(500).json({ error: message });
    }
  });

  // Get all wishlist items
  app.get("/api/wishlist", async (req, res) => {
    // ... (no changes)
    try {
      const items = await storage.getWishlistItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ error: "Failed to fetch wishlist items" });
    }
  });

  // Get wishlist items by category
  app.get("/api/wishlist/category/:category", async (req, res) => {
    // ... (no changes)
    try {
      const { category } = req.params;
      const { subcategory } = req.query;
      const items = await storage.getWishlistItemsByCategory(
        category,
        subcategory as string | undefined,
      );
      res.json(items);
    } catch (error) {
      console.error("Error fetching category items:", error);
      res.status(500).json({ error: "Failed to fetch category items" });
    }
  });

  // Add wishlist item (with scraping and AI categorization)
  app.post("/api/wishlist", async (req, res) => {
    try {
      const { manualCategory, manualSubcategory, ...scrapedProduct } =
        req.body as InsertScrapedProduct;

      const url = scrapedProduct.url;
      if (!url) {
        return res
          .status(400)
          .json({ error: "URL is required in product data" });
      }

      let category = manualCategory || "Extra";
      let subcategory = manualSubcategory;

      if (!manualCategory) {
        try {
          const aiCategory = await categorizeProduct(
            scrapedProduct.title,
            scrapedProduct.brand,
            url,
          );
          category = aiCategory.category;
          subcategory = aiCategory.subcategory || undefined;
        } catch (error) {
          console.error("Failed to categorize product:", error);
        }
      }

      const colorStrings = scrapedProduct.colors?.map((c) => c.name);
      const sizeStrings = scrapedProduct.sizes?.map((s) => s.name);

      // FIX: Ensure price is formatted as a string for the 'numeric' type validation
      // Your database schema likely expects a string here, even though you calculate with numbers.
      const priceAsString = scrapedProduct.price.toFixed(2);

      const itemData = {
        ...scrapedProduct,
        price: priceAsString, // Use the formatted string price
        category,
        subcategory,
        colors: colorStrings,
        sizes: sizeStrings,
      };

      // FIX: Add detailed logging BEFORE validation
      console.log("--- Data Prepared for Validation ---");
      console.log(JSON.stringify(itemData, null, 2));
      console.log("-----------------------------------");

      // This is where the "Invalid item data" error originates
      const validatedItem = insertWishlistItemSchema.parse(itemData);

      console.log("--- Validation Successful ---");

      const item = await storage.createWishlistItem(validatedItem);

      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // FIX: Log the specific Zod validation errors
        console.error("--- Zod Validation Error Details ---");
        console.error(JSON.stringify(error.errors, null, 2));
        console.error("-----------------------------------");
        return res
          .status(400)
          .json({ error: "Invalid item data", details: error.errors });
      }
      console.error("Error adding wishlist item:", error);
      res.status(500).json({ error: "Failed to add wishlist item" });
    }
  });

  // ... (The rest of your routes remain unchanged) ...
  // Update wishlist item
  app.patch("/api/wishlist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const item = await storage.updateWishlistItem(id, updates);

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error updating wishlist item:", error);
      res.status(500).json({ error: "Failed to update wishlist item" });
    }
  });

  // Update price for a single item
  app.post("/api/wishlist/:id/update-price", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getWishlistItem(id);

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const scrapedProduct = await scrapeProductFromUrl(item.url);

      const priceEntry = {
        price: scrapedProduct.price,
        currency: scrapedProduct.currency,
        recordedAt: new Date().toISOString(),
      };

      const updatedItem = await storage.addPriceHistoryEntry(id, priceEntry);

      if (!updatedItem) {
        return res.status(404).json({ error: "Failed to update price" });
      }

      const colorStrings = scrapedProduct.colors?.map((c) => c.name);
      const sizeStrings = scrapedProduct.sizes?.map((s) => s.name);

      await storage.updateWishlistItem(id, {
        inStock: scrapedProduct.inStock,
        colors: colorStrings,
        sizes: sizeStrings,
      });

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating price:", error);
      res.status(500).json({ error: "Failed to update price" });
    }
  });

  // Update prices for all items
  app.post("/api/wishlist/update-all-prices", async (req, res) => {
    try {
      const items = await storage.getWishlistItems();
      const updates = [];

      for (const item of items) {
        try {
          const scrapedProduct = await scrapeProductFromUrl(item.url);

          const colorStrings = scrapedProduct.colors?.map((c) => c.name);
          const sizeStrings = scrapedProduct.sizes?.map((s) => s.name);

          const priceEntry = {
            price: scrapedProduct.price,
            currency: scrapedProduct.currency,
            recordedAt: new Date().toISOString(),
          };

          await storage.addPriceHistoryEntry(item.id, priceEntry);
          await storage.updateWishlistItem(item.id, {
            inStock: scrapedProduct.inStock,
            colors: colorStrings,
            sizes: sizeStrings,
          });

          updates.push({ id: item.id, success: true });
        } catch (error) {
          console.error(`Failed to update item ${item.id}:`, error);
          updates.push({ id: item.id, success: false });
        }
      }

      res.json({ updates });
    } catch (error) {
      console.error("Error updating all prices:", error);
      res.status(500).json({ error: "Failed to update prices" });
    }
  });

  // Delete wishlist item
  app.delete("/api/wishlist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteWishlistItem(id);

      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      res.status(500).json({ error: "Failed to delete wishlist item" });
    }
  });

  // Get custom categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCustomCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create custom category
  app.post("/api/categories", async (req, res) => {
    try {
      const validatedCategory = insertCustomCategorySchema.parse(req.body);
      const category = await storage.createCustomCategory(validatedCategory);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid category data", details: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Delete custom category
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCustomCategory(id);

      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
