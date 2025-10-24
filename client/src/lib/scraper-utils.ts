// client/src/lib/scraper-utils.ts
/**
 * Cleans text by removing extra whitespace, newlines, and tabs.
 */
export function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replace(/(\r\n|\n|\r)/gm, " ") // Remove newlines
    .replace(/\t/g, " ") // Remove tabs
    .replace(/\s\s+/g, " ") // Replace multiple spaces with one
    .trim();
}

/**
 * Converts a relative URL to an absolute URL using a base URL.
 */
export function makeAbsoluteUrl(
  url: string | undefined | null,
  baseUrl: string,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http:") || url.startsWith("https:")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    console.error(`[makeAbsoluteUrl] Invalid URL: ${url}, Base: ${baseUrl}`);
    return undefined;
  }
}

/**
 * Parses a price string, removing currency symbols and commas.
 */
export function parsePrice(priceText: string): number {
  if (!priceText) return 0;
  const cleaned = priceText
    .replace(/[$,€,£,¥,CAD,USD,AUD,EUR,GBP]/g, "")
    .replace(/,/g, ".") // Handle commas as decimal separators
    .trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Detects currency symbol from a price string.
 */
export function detectCurrency(priceText: string, url: string = ""): string {
  if (
    priceText.includes("€") ||
    url.includes(".eu") ||
    url.includes(".de") ||
    url.includes(".fr") ||
    url.includes(".es") ||
    url.includes(".it")
  )
    return "€";
  if (priceText.includes("£") || url.includes(".co.uk")) return "£";
  if (priceText.includes("¥") || url.includes(".jp")) return "¥";
  // Default to $
  return "$";
}

/**
 * Gets a currency symbol from a 3-letter currency code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: { [key: string]: string } = {
    USD: "$",
    CAD: "CA$",
    AUD: "A$",
    EUR: "€",
    GBP: "£",
    RMB: "¥",
  };
  return symbols[currencyCode.toUpperCase()] || "$";
}

/**
 * Parses a srcset attribute and returns the first/most likely URL.
 * This is a simple implementation and can be made more robust.
 */
export function parseSrcset(
  srcset: string | undefined | null,
): string | undefined {
  if (!srcset) return undefined;
  const sources = srcset.split(",").map((s) => s.trim().split(" ")[0]);
  return sources[0] || undefined;
}
