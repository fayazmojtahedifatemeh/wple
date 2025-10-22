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

function getSiteSpecificSelectors(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('amazon')) {
    return {
      title: ['#productTitle', 'h1.a-size-large'],
      price: ['span.a-price-whole', '.a-price .a-offscreen', '#priceblock_ourprice'],
      image: ['#landingImage', '#imgBlkFront', '.a-dynamic-image'],
      brand: ['#bylineInfo', 'a#brand'],
      availability: ['#availability span'],
    };
  } else if (hostname.includes('zara')) {
    return {
      title: ['.product-detail-info__header-name'],
      price: ['.price__amount', '.money-amount__main'],
      image: ['.product-detail-images__image'],
      brand: [],
    };
  } else if (hostname.includes('hm.com') || hostname.includes('h&m')) {
    return {
      title: ['h1.ProductName-module--productTitle'],
      price: ['span.ProductPrice-module--price'],
      image: ['img.ProductImageCarousel-module--image'],
    };
  }
  
  return null;
}

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const siteSelectors = getSiteSpecificSelectors(url);

    const title = extractTitle($, siteSelectors?.title);
    const { price, currency } = extractPrice($, siteSelectors?.price);
    const images = extractImages($, url, siteSelectors?.image);
    const brand = extractBrand($, siteSelectors?.brand);
    const inStock = extractStockStatus($, siteSelectors?.availability);

    if (!title || title === 'Untitled Product') {
      throw new Error('Failed to extract product title - page may not be accessible');
    }

    if (price === 0) {
      console.warn('[Scraper] Warning: Could not extract price for', url);
    }

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
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - the website took too long to respond');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - the website is blocking automated requests');
      } else if (error.response?.status === 404) {
        throw new Error('Product not found - the URL may be invalid or the product may have been removed');
      } else if (error.response?.status && error.response.status >= 500) {
        throw new Error('Website is temporarily unavailable - please try again later');
      }
    }
    
    console.error('[Scraper] Error scraping product:', error);
    throw new Error(`Failed to scrape product: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractTitle($: cheerio.CheerioAPI, customSelectors?: string[]): string {
  const selectors = [
    ...(customSelectors || []),
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'h1.product-title',
    'h1.product-name',
    'h1[itemprop="name"]',
    '[data-testid="product-title"]',
    '[data-qa="product-name"]',
    'h1',
    'title',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      const content = element.attr('content') || element.text();
      if (content && content.trim()) {
        let title = content.trim();
        if (selector === 'title' && title.includes('|')) {
          title = title.split('|')[0].trim();
        }
        if (title.length > 3) {
          return title;
        }
      }
    }
  }

  return 'Untitled Product';
}

function extractPrice($: cheerio.CheerioAPI, customSelectors?: string[]): { price: number; currency: string } {
  let priceText = '';
  let currency = '$';

  const selectors = [
    ...(customSelectors || []),
    'meta[property="og:price:amount"]',
    'meta[property="product:price:amount"]',
    'span[itemprop="price"]',
    '[data-testid="product-price"]',
    '[data-qa="price"]',
    '.product-price',
    '.price',
    '[class*="price"]:not([class*="old"]):not([class*="original"])',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      priceText = element.attr('content') || element.text();
      if (priceText && priceText.trim()) {
        if (parseFloat(priceText.replace(/[^\d.,]/g, '')) > 0) {
          break;
        }
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

  if (priceText.includes('$')) currency = '$';
  else if (priceText.includes('€')) currency = '€';
  else if (priceText.includes('£')) currency = '£';
  else if (priceText.includes('¥')) currency = '¥';
  else if (priceText.includes('₹')) currency = '₹';

  const cleanedPrice = priceText.replace(/[^\d.,]/g, '');
  const priceMatch = cleanedPrice.match(/[\d,]+\.?\d*/);
  const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

  return { price, currency };
}

function extractImages($: cheerio.CheerioAPI, baseUrl: string, customSelectors?: string[]): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();

  const selectors = [
    ...(customSelectors || []),
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'img[itemprop="image"]',
    '[data-testid="product-image"]',
    '.product-image img',
    '[class*="product"] img',
    'img[src*="product"]',
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const img = $(element);
      let src = img.attr('content') || img.attr('src') || img.attr('data-src') || img.attr('data-zoom');
      
      if (src && !seenUrls.has(src)) {
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          try {
            const urlObj = new URL(baseUrl);
            src = urlObj.origin + src;
          } catch {
            return;
          }
        }
        
        if (src.startsWith('http') && 
            !src.includes('placeholder') && 
            !src.includes('icon') && 
            !src.includes('sprite') &&
            !src.includes('logo')) {
          images.push(src);
          seenUrls.add(src);
        }
      }
    });

    if (images.length >= 5) break;
  }

  return images.slice(0, 5);
}

function extractBrand($: cheerio.CheerioAPI, customSelectors?: string[]): string | undefined {
  const selectors = [
    ...(customSelectors || []),
    'meta[property="og:brand"]',
    'meta[itemprop="brand"]',
    '[itemprop="brand"]',
    '[data-testid="product-brand"]',
    '.product-brand',
    '[class*="brand"]',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length) {
      const content = element.attr('content') || element.text();
      if (content && content.trim() && content.trim().length > 1) {
        return content.trim();
      }
    }
  }

  return undefined;
}

function extractStockStatus($: cheerio.CheerioAPI, customSelectors?: string[]): boolean {
  const availabilityElement = $('meta[property="og:availability"], meta[itemprop="availability"]');
  if (availabilityElement.length) {
    const availability = availabilityElement.attr('content')?.toLowerCase();
    if (availability?.includes('out') || availability?.includes('sold')) {
      return false;
    }
    if (availability?.includes('instock') || availability?.includes('in stock')) {
      return true;
    }
  }

  const selectors = [
    ...(customSelectors || []),
    '.out-of-stock',
    '[class*="sold-out"]',
    '[class*="unavailable"]',
    '[data-testid="out-of-stock"]',
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      const text = element.text().toLowerCase();
      if (text.includes('out') || text.includes('sold') || text.includes('unavailable')) {
        return false;
      }
    }
  }

  const addToCartButton = $('[class*="add-to-cart"], [class*="add-to-bag"], button[type="submit"]');
  if (addToCartButton.length > 0) {
    const buttonText = addToCartButton.text().toLowerCase();
    if (buttonText.includes('out of stock') || buttonText.includes('sold out')) {
      return false;
    }
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
