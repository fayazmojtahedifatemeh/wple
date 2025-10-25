import axios from "axios";
import * as cheerio from "cheerio";
import { ScrapedProduct } from "../shared/schema";

// Enhanced browser headers for better anti-bot protection
const getBrowserHeaders = () => ({
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
});

// Free CORS proxy options
const FREE_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
];

export const scrapeWithPuppeteer = async (
  url: string,
): Promise<ScrapedProduct> => {
  console.log(`[Puppeteer Fallback] Using enhanced cloud scraper for: ${url}`);

  let lastError: Error;

  // Try each free proxy in sequence
  for (const proxyFn of FREE_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      console.log(
        `[Puppeteer Fallback] Trying proxy: ${proxyUrl.substring(0, 50)}...`,
      );

      const response = await axios.get(proxyUrl, {
        timeout: 15000,
        headers: getBrowserHeaders(),
      });

      const $ = cheerio.load(response.data);

      // Use the general extractor logic
      const title = extractTitle($);
      const priceData = extractPrice($, url);
      const images = extractImages($, url);
      const brand = extractBrand($);
      const colors = extractColors($, url);
      const sizes = extractSizes($, url);

      const inStock =
        sizes.length > 0
          ? sizes.some((size) => size.available)
          : colors.length > 0
            ? colors.some((color) => color.available)
            : true;

      if (!title) {
        throw new Error("Could not extract product title");
      }

      console.log(
        `[Puppeteer Fallback] Successfully scraped ${url} with proxy`,
      );

      return {
        title,
        price: priceData.price,
        currency: priceData.currency,
        images:
          images.length > 0
            ? images
            : ["https://via.placeholder.com/400?text=No+Image+Found"],
        brand,
        inStock,
        colors: colors.length > 0 ? colors : undefined,
        sizes: sizes.length > 0 ? sizes : undefined,
        url,
      };
    } catch (error) {
      lastError = error as Error;
      console.log(`[Puppeteer Fallback] Proxy failed: ${error}`);
      // Continue to next proxy
    }
  }

  // If all proxies failed, try direct request with enhanced headers
  try {
    console.log(
      `[Puppeteer Fallback] All proxies failed, trying direct request for: ${url}`,
    );

    const response = await axios.get(url, {
      timeout: 15000,
      headers: getBrowserHeaders(),
      validateStatus: (status) => status < 500,
    });

    const $ = cheerio.load(response.data);

    const title = extractTitle($);
    const priceData = extractPrice($, url);
    const images = extractImages($, url);
    const brand = extractBrand($);
    const colors = extractColors($, url);
    const sizes = extractSizes($, url);

    const inStock =
      sizes.length > 0
        ? sizes.some((size) => size.available)
        : colors.length > 0
          ? colors.some((color) => color.available)
          : true;

    if (!title) {
      throw new Error("Could not extract product title");
    }

    console.log(
      `[Puppeteer Fallback] Successfully scraped ${url} with direct request`,
    );

    return {
      title,
      price: priceData.price,
      currency: priceData.currency,
      images:
        images.length > 0
          ? images
          : ["https://via.placeholder.com/400?text=No+Image+Found"],
      brand,
      inStock,
      colors: colors.length > 0 ? colors : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      url,
    };
  } catch (error) {
    console.error(
      `[Puppeteer Fallback] All methods failed for ${url}:`,
      lastError!,
    );
    throw new Error(
      `Failed to scrape product with cloud fallback: ${lastError!.message}`,
    );
  }
};

// Helper functions for extraction (similar to your general extractor)
function extractTitle($: cheerio.CheerioAPI): string | null {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle) return cleanText(ogTitle);

  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const schema = JSON.parse(jsonLd);
      if (schema.name) return cleanText(schema.name);
      if (schema.title) return cleanText(schema.title);
    } catch (e) {}
  }

  const h1 = $("h1").first().text();
  if (h1) return cleanText(h1);

  const docTitle = $("title").text();
  if (docTitle && !docTitle.toLowerCase().includes("home")) {
    return cleanText(docTitle);
  }

  return null;
}

function extractPrice(
  $: cheerio.CheerioAPI,
  url: string,
): { price: number; currency: string } {
  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const schema = JSON.parse(jsonLd);
      const offers = schema.offers || schema;
      if (offers.price) {
        return {
          price: parseFloat(offers.price),
          currency: getCurrencySymbol(
            offers.priceCurrency || detectCurrency("", url),
          ),
        };
      }
    } catch (e) {}
  }

  const priceSelectors = [
    "[data-product-price]",
    ".price__current",
    ".product-price",
    ".price-item--regular",
    ".money",
    ".current-price",
    '[itemprop="price"]',
    ".price",
    ".product__price",
  ];

  for (const selector of priceSelectors) {
    const priceText = cleanText($(selector).first().text());
    if (priceText) {
      const price = parsePrice(priceText);
      if (price > 0) {
        return {
          price,
          currency: detectCurrency(priceText, url),
        };
      }
    }
  }

  return { price: 0, currency: "$" };
}

function extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    const absoluteSrc = makeAbsoluteUrl(ogImage, baseUrl);
    if (absoluteSrc && !seenUrls.has(absoluteSrc)) {
      images.push(absoluteSrc);
      seenUrls.add(absoluteSrc);
    }
  }

  $("img").each((_, el) => {
    let src = $(el).attr("src") || $(el).attr("data-src");
    const srcset = $(el).attr("srcset");
    if (srcset) src = parseSrcset(srcset);

    if (src) {
      if (src.startsWith("//")) src = "https:" + src;
      const absoluteSrc = makeAbsoluteUrl(src, baseUrl);
      if (absoluteSrc && !seenUrls.has(absoluteSrc)) {
        images.push(absoluteSrc);
        seenUrls.add(absoluteSrc);
      }
    }
  });

  return images.slice(0, 5);
}

function extractBrand($: cheerio.CheerioAPI): string | undefined {
  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const schema = JSON.parse(jsonLd);
      if (schema.brand?.name) return cleanText(schema.brand.name);
      if (schema.brand) return cleanText(schema.brand);
    } catch (e) {}
  }

  const ogSite = $('meta[property="og:site_name"]').attr("content");
  if (ogSite) return cleanText(ogSite);

  return undefined;
}

function extractColors($: cheerio.CheerioAPI, url: string): any[] {
  // Simple color extraction for fallback
  const colors: any[] = [];
  $('[data-option="color"], .color-swatch, .swatch-color').each((_, el) => {
    const colorName = cleanText(
      $(el).attr("data-value") || $(el).attr("title") || $(el).text(),
    );
    if (colorName) {
      colors.push({ name: colorName, available: true });
    }
  });
  return colors;
}

function extractSizes($: cheerio.CheerioAPI, url: string): any[] {
  // Simple size extraction for fallback
  const sizes: any[] = [];
  $('[data-option="size"], .size-swatch, .swatch-size').each((_, el) => {
    const sizeName = cleanText(
      $(el).attr("data-value") || $(el).attr("title") || $(el).text(),
    );
    if (sizeName) {
      sizes.push({ name: sizeName, available: true });
    }
  });
  return sizes;
}

// Reuse your existing helper functions
function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text.trim().replace(/\s+/g, " ");
}

function parsePrice(priceText: string): number {
  if (!priceText || typeof priceText !== "string") return 0;
  const cleaned = priceText.replace(/[^\d.,]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastPeriod = cleaned.lastIndexOf(".");

  let decimalSeparator = ".";
  if (lastComma > lastPeriod) {
    decimalSeparator = ",";
  }

  let numberString = cleaned;
  if (decimalSeparator === ",") {
    numberString = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    numberString = cleaned.replace(/,/g, "");
  }

  numberString = numberString.replace(/[^\d.]/g, "");
  const price = parseFloat(numberString);
  return isNaN(price) ? 0 : price;
}

function detectCurrency(text: string, url?: string): string {
  if (!text) text = "";
  if (text.includes("£") || text.toUpperCase().includes("GBP")) return "£";
  if (text.includes("€") || text.toUpperCase().includes("EUR")) return "€";
  if (
    text.includes("¥") ||
    text.includes("￥") ||
    text.toUpperCase().includes("JPY") ||
    text.toUpperCase().includes("CNY") ||
    text.toUpperCase().includes("RMB")
  )
    return "¥";
  if (text.includes("₹") || text.toUpperCase().includes("INR")) return "₹";
  if (text.includes("A$") || text.toUpperCase().includes("AUD")) return "A$";
  if (text.includes("C$") || text.toUpperCase().includes("CAD")) return "C$";
  if (text.includes("$")) return "$";
  return "$";
}

function getCurrencySymbol(code: string): string {
  if (!code || typeof code !== "string") return "$";
  const upperCode = code.toUpperCase();
  const currencyMap: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    CAD: "C$",
    AUD: "A$",
  };
  return currencyMap[upperCode] || upperCode;
}

function makeAbsoluteUrl(
  src: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!src || typeof src !== "string") return undefined;
  src = src.trim();
  if (!src) return undefined;
  if (/^(https?:)?\/\//i.test(src)) {
    return src.startsWith("//") ? "https:" + src : src;
  }
  if (src.startsWith("data:")) return src;
  if (!baseUrl || typeof baseUrl !== "string") {
    return src.startsWith("/") ? undefined : src;
  }
  try {
    const base = new URL(baseUrl);
    const resolvedUrl = new URL(src, base).href;
    return resolvedUrl;
  } catch (e) {
    return undefined;
  }
}

function parseSrcset(srcset: string): string {
  if (!srcset || typeof srcset !== "string") return "";
  try {
    const parts = srcset.split(",").map((s) => {
      const trimmed = s.trim();
      const spaceIndex = trimmed.lastIndexOf(" ");
      if (spaceIndex === -1) return { url: trimmed, width: 0 };
      const url = trimmed.substring(0, spaceIndex).trim();
      return { url, width: 0 };
    });
    const firstValidUrl = parts.find((p) => p.url);
    if (firstValidUrl) return firstValidUrl.url;
    return "";
  } catch (e) {
    const parts = srcset.split(",").map((s) => s.trim());
    const lastPart = parts[parts.length - 1];
    return lastPart?.split(" ")[0] || "";
  }
}
