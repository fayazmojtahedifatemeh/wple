import { storage } from "./storage";
import { scrapeProductFromUrl } from "./scraper";
import { sendPriceDropAlert, sendRestockAlert } from "./emailService";
import type { PriceHistoryEntry } from "@shared/schema";

export interface PriceCheckResult {
  itemId: string;
  success: boolean;
  priceChanged: boolean;
  priceDropped?: boolean;
  oldPrice?: number;
  newPrice?: number;
  priceChangePercent?: number;
  error?: string;
}

export async function checkPriceForItem(itemId: string): Promise<PriceCheckResult> {
  try {
    const item = await storage.getWishlistItem(itemId);
    
    if (!item) {
      return {
        itemId,
        success: false,
        priceChanged: false,
        error: "Item not found",
      };
    }

    const scrapedProduct = await scrapeProductFromUrl(item.url);
    
    const currentPrice = typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price);
    const newPrice = scrapedProduct.price;
    
    const priceChanged = Math.abs(currentPrice - newPrice) > 0.01;
    const priceDropped = newPrice < currentPrice;
    const priceChangePercent = priceChanged 
      ? ((newPrice - currentPrice) / currentPrice) * 100 
      : 0;

    if (priceChanged) {
      const priceEntry: PriceHistoryEntry = {
        price: newPrice,
        currency: scrapedProduct.currency,
        recordedAt: new Date().toISOString(),
      };

      await storage.addPriceHistoryEntry(itemId, priceEntry);
    }
    
    await storage.updateWishlistItem(itemId, {
      inStock: scrapedProduct.inStock,
    });

    return {
      itemId,
      success: true,
      priceChanged,
      priceDropped,
      oldPrice: currentPrice,
      newPrice,
      priceChangePercent,
    };
  } catch (error) {
    console.error(`Error checking price for item ${itemId}:`, error);
    return {
      itemId,
      success: false,
      priceChanged: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkAllPrices(): Promise<PriceCheckResult[]> {
  console.log("[Price Checker] Starting automated price check...");
  
  const items = await storage.getWishlistItems();
  const results: PriceCheckResult[] = [];

  for (const item of items) {
    const wasOutOfStock = !item.inStock;
    const result = await checkPriceForItem(item.id);
    results.push(result);
    
    if (result.success && result.priceDropped && result.oldPrice && result.newPrice && result.priceChangePercent) {
      console.log(
        `[Price Checker] 🎉 Price dropped for "${item.title}" from $${result.oldPrice} to $${result.newPrice} (${result.priceChangePercent?.toFixed(2)}%)`
      );
      
      const updatedItem = await storage.getWishlistItem(item.id);
      if (updatedItem) {
        await sendPriceDropAlert(updatedItem, result.oldPrice, result.newPrice, result.priceChangePercent);
      }
    }
    
    if (result.success && wasOutOfStock) {
      const updatedItem = await storage.getWishlistItem(item.id);
      if (updatedItem && updatedItem.inStock) {
        console.log(`[Price Checker] 🔔 Item back in stock: "${item.title}"`);
        await sendRestockAlert(updatedItem);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[Price Checker] Completed price check for ${results.length} items`);
  return results;
}
