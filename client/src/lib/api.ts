// FIX: Import all our new shared types
import type {
  WishlistItem,
  InsertWishlistItem,
  ScrapedProduct,
  InsertScrapedProduct,
} from "@shared/schema";

const API_BASE = "/api";

export async function fetchWishlistItems(): Promise<WishlistItem[]> {
  const response = await fetch(`${API_BASE}/wishlist`);

  if (!response.ok) {
    throw new Error("Failed to fetch wishlist items");
  }

  return response.json();
}

export async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  const response = await fetch(`${API_BASE}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await response.json(); // Read the JSON body
  if (!response.ok) {
    // Pass the specific error message from the server
    throw new Error(data.error || "Failed to scrape product");
  }
  return data;
}

export async function addWishlistItem(
  // FIX: This now takes the 'InsertScrapedProduct' type
  data: InsertScrapedProduct,
): Promise<WishlistItem> {
  const response = await fetch(`${API_BASE}/wishlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data), // Send the entire object
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error || "Failed to add wishlist item");
  }
  return resData;
}

export async function updateWishlistItem(
  id: string,
  updates: { selectedSize?: string; selectedColor?: string }, // More specific type
): Promise<WishlistItem> {
  const response = await fetch(`${API_BASE}/wishlist/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error("Failed to update wishlist item");
  }
  return response.json();
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/wishlist/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete wishlist item");
  }
}

export async function updateAllPrices(): Promise<any> {
  const response = await fetch(`${API_BASE}/wishlist/update-all-prices`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to update prices");
  }
  return response.json();
}

export async function updateItemPrice(id: string): Promise<WishlistItem> {
  const response = await fetch(`${API_BASE}/wishlist/${id}/update-price`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to update item price");
  }
  return response.json();
}
