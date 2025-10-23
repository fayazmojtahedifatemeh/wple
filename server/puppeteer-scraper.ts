import puppeteer from 'puppeteer';
import type { ScrapedProduct } from './scraper';

interface PuppeteerConfig {
  waitForSelector?: string;
  timeout?: number;
  additionalWaitTime?: number;
}

const siteConfigs: Record<string, PuppeteerConfig> = {
  'zara.com': {
    waitForSelector: 'span[data-qa-qualifier="price-amount-current"]',
    timeout: 10000,
    additionalWaitTime: 2000
  },
  'hm.com': {
    waitForSelector: '#product-schema',
    timeout: 10000,
    additionalWaitTime: 1000
  },
  'farfetch.com': {
    waitForSelector: 'p[data-component="PriceLarge"]',
    timeout: 10000,
    additionalWaitTime: 2000
  }
};

function getSiteConfig(url: string): PuppeteerConfig | null {
  const hostname = new URL(url).hostname.toLowerCase();
  
  for (const [domain, config] of Object.entries(siteConfigs)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  
  return null;
}

export async function scrapeWithPuppeteer(url: string): Promise<ScrapedProduct> {
  const config = getSiteConfig(url);
  
  if (!config) {
    throw new Error('Site not configured for Puppeteer scraping');
  }

  let browser;
  
  try {
    console.log('[Puppeteer] Launching browser for:', url);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('[Puppeteer] Navigating to page...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: config.timeout || 10000
    });

    if (config.waitForSelector) {
      console.log('[Puppeteer] Waiting for selector:', config.waitForSelector);
      await page.waitForSelector(config.waitForSelector, { 
        timeout: config.timeout || 10000 
      });
    }

    if (config.additionalWaitTime) {
      await new Promise(resolve => setTimeout(resolve, config.additionalWaitTime));
    }

    console.log('[Puppeteer] Page loaded, extracting content...');
    
    const html = await page.content();
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    
    const hostname = new URL(url).hostname.toLowerCase();
    let product: ScrapedProduct;
    
    if (hostname.includes('zara')) {
      product = await extractZaraProduct($, url);
    } else if (hostname.includes('hm.com')) {
      product = await extractHMProduct($, url);
    } else if (hostname.includes('farfetch')) {
      product = await extractFarfetchProduct($, url, page);
    } else {
      throw new Error('Unsupported site for Puppeteer scraping');
    }
    
    console.log('[Puppeteer] Successfully extracted:', product.title);
    
    return product;
    
  } catch (error) {
    console.error('[Puppeteer] Error:', error);
    throw new Error(`Puppeteer scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractZaraProduct($: any, url: string): Promise<ScrapedProduct> {
  const cleanText = (text: string | undefined) => text?.trim().replace(/\s+/g, ' ') || '';
  
  let title = cleanText($('h1.product-detail-card-info__title span.product-detail-card-info__name').text());
  if (!title) title = cleanText($('span[data-qa-qualifier="product-detail-info-name"]').text());
  
  const priceText = cleanText($('span[data-qa-qualifier="price-amount-current"] span.money-amount__main').text());
  const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(/,/g, ''));
  const currency = detectCurrency(priceText, url);
  
  const images: string[] = [];
  $('picture[data-qa-qualifier="media-image"]').each((_: any, el: any) => {
    const srcset = $(el).find('source').attr('srcset');
    if (srcset) {
      const largest = srcset.split(',').map((s: string) => s.trim()).pop();
      if (largest) images.push(largest.split(' ')[0]);
    }
  });
  
  const colors: string[] = [];
  $('ul.product-detail-color-selector__colors li.product-detail-color-item').each((_: any, el: any) => {
    const colorName = cleanText($(el).find('span.screen-reader-text').text());
    if (colorName) colors.push(colorName);
  });
  
  return {
    title: title || 'Unknown Product',
    price,
    currency,
    images: images.slice(0, 5),
    inStock: true,
    colors: colors.length > 0 ? colors : undefined,
    sizes: undefined,
    url
  };
}

async function extractHMProduct($: any, url: string): Promise<ScrapedProduct> {
  const cleanText = (text: string | undefined) => text?.trim().replace(/\s+/g, ' ') || '';
  
  const jsonSchema = $('script#product-schema').html();
  let title = '';
  let price = 0;
  let currency = '$';
  let images: string[] = [];
  
  if (jsonSchema) {
    try {
      const data = JSON.parse(jsonSchema);
      title = data.name || '';
      price = parseFloat(data.offers?.price || '0');
      currency = data.offers?.priceCurrency || '$';
      if (Array.isArray(data.image)) {
        images = data.image.slice(0, 5);
      }
    } catch (e) {
      console.error('[Puppeteer] Failed to parse H&M JSON schema');
    }
  }
  
  if (!title) {
    title = cleanText($('h1').text());
  }
  
  if (price === 0) {
    const priceText = cleanText($('span[translate="no"]').text());
    price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(/,/g, ''));
    currency = detectCurrency(priceText, url);
  }
  
  const colors: string[] = [];
  $('div[data-testid="color-selector-wrapper"] a[role="radio"]').each((_: any, el: any) => {
    const colorName = $(el).attr('title');
    if (colorName) colors.push(cleanText(colorName));
  });
  
  const sizes: string[] = [];
  $('div[data-testid="size-selector"] ul[data-testid="grid"] div[role="radio"]').each((_: any, el: any) => {
    const sizeName = cleanText($(el).find('div').first().text());
    if (sizeName) sizes.push(sizeName);
  });
  
  return {
    title: title || 'Unknown Product',
    price,
    currency,
    images: images.length > 0 ? images : ['https://via.placeholder.com/400'],
    inStock: true,
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    url
  };
}

async function extractFarfetchProduct($: any, url: string, page: any): Promise<ScrapedProduct> {
  const cleanText = (text: string | undefined) => text?.trim().replace(/\s+/g, ' ') || '';
  
  const brand = cleanText($('h1.ltr-i980jo a.ltr-1rkeqir-Body-Heading, a[data-component="DesignerName"]').text());
  const title = cleanText($('p[data-testid="product-short-description"]').text());
  
  const priceText = cleanText($('p[data-component="PriceLarge"]').text());
  const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(/,/g, ''));
  const currency = detectCurrency(priceText, url);
  
  const images: string[] = [];
  $('div.ltr-1kklpjs button.ltr-1c58b5g img, [data-testid="product-image"] img').each((_: any, el: any) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) images.push(src);
  });
  
  const sizes: string[] = [];
  const sizeSelector = $('div[data-testid="ScaledSizeSelector"]');
  if (sizeSelector.length) {
    try {
      const dropdownButton = await page.$('div[data-testid="ScaledSizeSelector"] div.ltr-1aksjyr');
      if (dropdownButton) {
        await dropdownButton.click();
        await page.waitForTimeout(1000);
        
        const newHtml = await page.content();
        const $new = (await import('cheerio')).load(newHtml);
        
        $new('[data-testid="SizeOption"]').each((_: any, el: any) => {
          const sizeName = cleanText($new(el).text());
          if (sizeName) sizes.push(sizeName);
        });
      }
    } catch (e) {
      console.log('[Puppeteer] Could not extract Farfetch sizes');
    }
  }
  
  return {
    title: title || 'Unknown Product',
    brand,
    price,
    currency,
    images: images.slice(0, 5),
    inStock: true,
    colors: undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    url
  };
}

function detectCurrency(text: string, url?: string): string {
  if (text.includes('£') || text.toUpperCase().includes('GBP')) return '£';
  if (text.includes('€') || text.toUpperCase().includes('EUR')) return '€';
  if (text.includes('¥') || text.toUpperCase().includes('JPY') || text.toUpperCase().includes('CNY')) return '¥';
  if (text.includes('₹') || text.toUpperCase().includes('INR')) return '₹';
  if (text.includes('A$') || text.toUpperCase().includes('AUD')) return 'A$';
  if (text.includes('C$') || text.toUpperCase().includes('CAD')) return 'C$';
  
  if (url) {
    const hostname = url.toLowerCase();
    if (hostname.includes('.uk') || hostname.includes('/uk/') || hostname.includes('/gb/')) return '£';
    if (hostname.includes('.eu') || hostname.includes('/eu/') || hostname.includes('/de/') || hostname.includes('/fr/') || hostname.includes('/es/') || hostname.includes('/it/')) return '€';
    if (hostname.includes('.jp') || hostname.includes('/jp/')) return '¥';
    if (hostname.includes('.in') || hostname.includes('/in/')) return '₹';
    if (hostname.includes('.au') || hostname.includes('/au/')) return 'A$';
    if (hostname.includes('.ca') || hostname.includes('/ca/')) return 'C$';
    if (hostname.includes('.cn') || hostname.includes('/cn/')) return '¥';
  }
  
  return '$';
}
