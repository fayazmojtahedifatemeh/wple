import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  title: string;
  price: number;
  currency: string;
  images: string[];
  brand?: string;
  inStock: boolean;
  colors?: string[];
  sizes?: string[];
  url: string;
}

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title = extractTitle($);
    const { price, currency } = extractPrice($);
    const images = extractImages($, url);
    const brand = extractBrand($);
    const inStock = extractStockStatus($);

    return {
      title,
      price,
      currency,
      images,
      brand,
      inStock,
      url,
    };
  } catch (error) {
    console.error('Error scraping product:', error);
    throw new Error('Failed to scrape product from URL');
  }
}

function extractTitle($: cheerio.CheerioAPI): string {
  const selectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'h1.product-title',
    'h1[itemprop="name"]',
    'h1',
    'title',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      const content = element.attr('content') || element.text();
      if (content && content.trim()) {
        return content.trim();
      }
    }
  }

  return 'Untitled Product';
}

function extractPrice($: cheerio.CheerioAPI): { price: number; currency: string } {
  let priceText = '';
  let currency = '$';

  const selectors = [
    'meta[property="og:price:amount"]',
    'meta[property="product:price:amount"]',
    'span[itemprop="price"]',
    '.product-price',
    '.price',
    '[class*="price"]',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      priceText = element.attr('content') || element.text();
      if (priceText && priceText.trim()) {
        break;
      }
    }
  }

  const currencyElement = $('meta[property="og:price:currency"]');
  if (currencyElement.length) {
    const currencyCode = currencyElement.attr('content');
    if (currencyCode) {
      currency = getCurrencySymbol(currencyCode);
    }
  }

  const priceMatch = priceText.match(/[\d,]+\.?\d*/);
  const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

  if (priceText.includes('$')) currency = '$';
  else if (priceText.includes('€')) currency = '€';
  else if (priceText.includes('£')) currency = '£';
  else if (priceText.includes('¥')) currency = '¥';

  return { price, currency };
}

function extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();

  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'img[itemprop="image"]',
    '.product-image img',
    '[class*="product"] img',
    'img[src*="product"]',
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const img = $(element);
      let src = img.attr('content') || img.attr('src') || img.attr('data-src');
      
      if (src && !seenUrls.has(src)) {
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          src = urlObj.origin + src;
        }
        
        if (src.startsWith('http') && !src.includes('placeholder') && !src.includes('icon')) {
          images.push(src);
          seenUrls.add(src);
        }
      }
    });

    if (images.length >= 3) break;
  }

  return images.slice(0, 5);
}

function extractBrand($: cheerio.CheerioAPI): string | undefined {
  const selectors = [
    'meta[property="og:brand"]',
    'meta[itemprop="brand"]',
    '[itemprop="brand"]',
    '.product-brand',
    '[class*="brand"]',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      const content = element.attr('content') || element.text();
      if (content && content.trim()) {
        return content.trim();
      }
    }
  }

  return undefined;
}

function extractStockStatus($: cheerio.CheerioAPI): boolean {
  const availabilityElement = $('meta[property="og:availability"], meta[itemprop="availability"]');
  if (availabilityElement.length) {
    const availability = availabilityElement.attr('content')?.toLowerCase();
    if (availability?.includes('out') || availability?.includes('sold')) {
      return false;
    }
  }

  const textIndicators = $('.out-of-stock, [class*="sold-out"], [class*="unavailable"]');
  if (textIndicators.length > 0) {
    return false;
  }

  return true;
}

function getCurrencySymbol(code: string): string {
  const currencyMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
  };

  return currencyMap[code.toUpperCase()] || code;
}
