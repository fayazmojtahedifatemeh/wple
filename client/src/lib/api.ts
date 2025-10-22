import type { WishlistItem, InsertWishlistItem } from "@shared/schema";

const API_BASE = "/api";

export async function fetchWishlistItems(): Promise<WishlistItem[]> {
  const response = await fetch(`${API_BASE}/wishlist`);
  if (!response.ok) {
    throw new Error("Failed to fetch wishlist items");
  }
  return response.json();
}

export async function scrapeProduct(url: string): Promise<any> {
  const response = await fetch(`${API_BASE}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error("Failed to scrape product");
  }
  return response.json();
}

export async function addWishlistItem(data: { url: string; manualCategory?: string; manualSubcategory?: string }): Promise<WishlistItem> {
  const response = await fetch(`${API_BASE}/wishlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to add wishlist item");
  }
  return response.json();
}

export async function updateWishlistItem(id: string, updates: Partial<WishlistItem>): Promise<WishlistItem> {
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
