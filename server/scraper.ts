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

interface SiteExtractor {
  extractTitle($: cheerio.CheerioAPI): string | null;
  extractPrice($: cheerio.CheerioAPI): { price: number; currency: string } | null;
  extractImages($: cheerio.CheerioAPI, baseUrl: string): string[];
  extractBrand?($: cheerio.CheerioAPI): string | undefined;
  extractColors?($: cheerio.CheerioAPI): string[];
  extractSizes?($: cheerio.CheerioAPI): string[];
}

function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[^\d.,]/g, '');
  const priceMatch = cleaned.match(/[\d,]+\.?\d*/);
  return priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
}

function detectCurrency(text: string): string {
  if (text.includes('£') || text.includes('GBP')) return '£';
  if (text.includes('€') || text.includes('EUR')) return '€';
  if (text.includes('$') || text.includes('USD')) return '$';
  if (text.includes('¥') || text.includes('JPY') || text.includes('CNY')) return '¥';
  if (text.includes('₹') || text.includes('INR')) return '₹';
  return '$';
}

function parseSrcset(srcset: string): string {
  const parts = srcset.split(',').map(s => s.trim());
  const largest = parts[parts.length - 1];
  return largest.split(' ')[0];
}

// Site-specific extractors

const aymStudioExtractor: SiteExtractor = {
  extractTitle($) {
    return cleanText($('h1.product-title').text()) || null;
  },
  extractPrice($) {
    const priceText = cleanText($('price-list sale-price').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('scroll-carousel div.product-gallery__media img').each((_, el) => {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        images.push(parseSrcset(srcset));
      } else {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) images.push(src);
      }
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    const colors: string[] = [];
    $('fieldset').each((_, fieldset) => {
      const legend = $(fieldset).find('legend').text();
      if (legend.includes('Colour')) {
        $(fieldset).find('label.color-swatch span').each((_, el) => {
          const color = cleanText($(el).text());
          if (color) colors.push(color);
        });
      }
    });
    return colors;
  },
  extractSizes($) {
    const sizes: string[] = [];
    $('fieldset').each((_, fieldset) => {
      const legend = $(fieldset).find('legend').text();
      if (legend.includes('Size')) {
        $(fieldset).find('label.block-swatch span').each((_, el) => {
          const size = cleanText($(el).text());
          if (size) sizes.push(size);
        });
      }
    });
    return sizes;
  },
};

const gianaWorldExtractor: SiteExtractor = {
  extractTitle($) {
    return cleanText($('h1.product-title').text()) || null;
  },
  extractPrice($) {
    const priceText = cleanText($('price-list sale-price, price-list regular-price').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('scroll-carousel div.product-gallery__media img, .product-gallery img').each((_, el) => {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        images.push(parseSrcset(srcset));
      } else {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) images.push(src);
      }
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    const colors: string[] = [];
    $('fieldset').each((_, fieldset) => {
      const legend = $(fieldset).find('legend').text();
      if (legend.toLowerCase().includes('colour') || legend.toLowerCase().includes('color')) {
        $(fieldset).find('label span').each((_, el) => {
          const color = cleanText($(el).text());
          if (color && !color.includes('Color')) colors.push(color);
        });
      }
    });
    return colors;
  },
  extractSizes($) {
    const sizes: string[] = [];
    $('fieldset').each((_, fieldset) => {
      const legend = $(fieldset).find('legend').text();
      if (legend.toLowerCase().includes('size')) {
        $(fieldset).find('label span').each((_, el) => {
          const size = cleanText($(el).text());
          if (size && !size.includes('Size')) sizes.push(size);
        });
      }
    });
    return sizes;
  },
};

const zaraExtractor: SiteExtractor = {
  extractTitle($) {
    let title = cleanText($('h1.product-detail-card-info__title span.product-detail-card-info__name').text());
    if (!title) title = cleanText($('span[data-qa-qualifier="product-detail-info-name"]').text());
    return title || null;
  },
  extractPrice($) {
    const priceText = cleanText($('span[data-qa-qualifier="price-amount-current"] span.money-amount__main').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('picture[data-qa-qualifier="media-image"]').each((_, el) => {
      const srcset = $(el).find('source').attr('srcset');
      if (srcset) {
        images.push(parseSrcset(srcset));
      } else {
        const src = $(el).find('img').attr('src');
        if (src && src.startsWith('http')) images.push(src);
      }
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    const colors: string[] = [];
    $('ul.product-detail-color-selector__colors li.product-detail-color-item').each((_, el) => {
      const color = cleanText($(el).find('span.screen-reader-text').text());
      if (color) colors.push(color);
    });
    return colors;
  },
};

const hmExtractor: SiteExtractor = {
  extractTitle($) {
    const jsonSchema = $('script#product-schema').html();
    if (jsonSchema) {
      try {
        const data = JSON.parse(jsonSchema);
        if (data.name) return cleanText(data.name);
      } catch (e) {}
    }
    return cleanText($('h1').text()) || null;
  },
  extractPrice($) {
    const jsonSchema = $('script#product-schema').html();
    if (jsonSchema) {
      try {
        const data = JSON.parse(jsonSchema);
        if (data.offers?.price) {
          return {
            price: parseFloat(data.offers.price),
            currency: detectCurrency(data.offers.priceCurrency || '$'),
          };
        }
      } catch (e) {}
    }
    const priceText = cleanText($('span[translate="no"]').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const jsonSchema = $('script#product-schema').html();
    if (jsonSchema) {
      try {
        const data = JSON.parse(jsonSchema);
        if (Array.isArray(data.image)) {
          return data.image.slice(0, 5);
        }
      } catch (e) {}
    }
    return [];
  },
  extractColors($) {
    const colors: string[] = [];
    $('div[data-testid="color-selector-wrapper"] a[role="radio"]').each((_, el) => {
      const color = $(el).attr('title');
      if (color) colors.push(cleanText(color));
    });
    return colors;
  },
  extractSizes($) {
    const sizes: string[] = [];
    $('div[data-testid="size-selector"] ul[data-testid="grid"] div[role="radio"]').each((_, el) => {
      const size = cleanText($(el).find('div').text());
      if (size) sizes.push(size);
    });
    return sizes;
  },
};

const farfetchExtractor: SiteExtractor = {
  extractTitle($) {
    return cleanText($('p[data-testid="product-short-description"]').text()) || null;
  },
  extractBrand($) {
    return cleanText($('h1.ltr-i980jo a.ltr-1rkeqir-Body-Heading').text());
  },
  extractPrice($) {
    const priceText = cleanText($('p[data-component="PriceLarge"]').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('div.ltr-1kklpjs button.ltr-1c58b5g img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) images.push(src);
    });
    return images.slice(0, 5);
  },
};

const amazonExtractor: SiteExtractor = {
  extractTitle($) {
    return cleanText($('#productTitle').text()) || null;
  },
  extractPrice($) {
    let priceText = cleanText($('span.a-price-whole').first().text());
    if (!priceText) priceText = cleanText($('.a-price .a-offscreen').first().text());
    if (!priceText) priceText = cleanText($('#priceblock_ourprice').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('#altImages ul li.imageThumbnail img').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const largeSrc = src.replace(/\._.*?_\./, '.');
        images.push(largeSrc);
      }
    });
    return images.slice(0, 5);
  },
  extractBrand($) {
    return cleanText($('#bylineInfo, a#brand').text().replace('Visit the', '').replace('Store', '').trim());
  },
};

const mytheresaExtractor: SiteExtractor = {
  extractBrand($) {
    return cleanText($('div.product__area__branding__designer a').text());
  },
  extractTitle($) {
    return cleanText($('div.product__area__branding__name').text()) || null;
  },
  extractPrice($) {
    const priceText = cleanText($('span.pricing__prices__price').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('div.product__gallery__carousel div.swiper-wrapper div.swiper-slide').each((_, el) => {
      if (!$(el).hasClass('swiper-slide-duplicate')) {
        const src = $(el).find('img').attr('src');
        if (src && src.startsWith('http')) images.push(src);
      }
    });
    return images.slice(0, 5);
  },
  extractSizes($) {
    const sizes: string[] = [];
    $('div.dropdown__options__wrapper div.sizeitem').each((_, el) => {
      if (!$(el).hasClass('sizeitem--placeholder')) {
        const size = cleanText($(el).find('span.sizeitem__label').text());
        if (size) sizes.push(size);
      }
    });
    return sizes;
  },
};

const yooxExtractor: SiteExtractor = {
  extractBrand($) {
    return cleanText($('h1.ItemInfo_designer__XsNGI a').text());
  },
  extractTitle($) {
    return cleanText($('h2.ItemInfo_microcat__cTaMO a').text()) || null;
  },
  extractPrice($) {
    const priceText = cleanText($('div.ItemInfo_price___W18c div.price[data-ta="current-price"]').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('div.PicturesSlider_photoSlider__BUjaM img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) images.push(src);
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    const colors: string[] = [];
    $('div.ColorPicker_color-picker__VS_Ec a.ColorPicker_color-elem__KV09t').each((_, el) => {
      const color = $(el).find('div.ColorPicker_color-sample__yS_FM').attr('title');
      if (color) colors.push(cleanText(color));
    });
    return colors;
  },
  extractSizes($) {
    const sizes: string[] = [];
    $('div[data-ta="size-picker"] div.SizePicker_size-item__nL4z_').each((_, el) => {
      const size = cleanText($(el).find('span.SizePicker_size-title__LucnR').text());
      if (size) sizes.push(size);
    });
    return sizes;
  },
};

function getExtractorForSite(url: string): SiteExtractor | null {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('aym-studio')) return aymStudioExtractor;
  if (hostname.includes('gianaworld')) return gianaWorldExtractor;
  if (hostname.includes('zara')) return zaraExtractor;
  if (hostname.includes('hm.com') || hostname.includes('h&m')) return hmExtractor;
  if (hostname.includes('farfetch')) return farfetchExtractor;
  if (hostname.includes('amazon')) return amazonExtractor;
  if (hostname.includes('mytheresa')) return mytheresaExtractor;
  if (hostname.includes('yoox')) return yooxExtractor;
  
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
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const siteExtractor = getExtractorForSite(url);

    let title: string | null = null;
    let priceData: { price: number; currency: string } | null = null;
    let images: string[] = [];
    let brand: string | undefined;
    let colors: string[] | undefined;
    let sizes: string[] | undefined;

    if (siteExtractor) {
      title = siteExtractor.extractTitle($);
      priceData = siteExtractor.extractPrice($);
      images = siteExtractor.extractImages($, url);
      brand = siteExtractor.extractBrand?.($);
      colors = siteExtractor.extractColors?.($);
      sizes = siteExtractor.extractSizes?.($);
    }

    if (!title) {
      title = fallbackExtractTitle($);
    }
    if (!priceData) {
      priceData = fallbackExtractPrice($);
    }
    if (images.length === 0) {
      images = fallbackExtractImages($, url);
    }
    if (!brand) {
      brand = fallbackExtractBrand($);
    }

    if (!title || title === 'Untitled Product') {
      throw new Error('Failed to extract product title - page may not be accessible');
    }

    if (!priceData || priceData.price === 0) {
      console.warn('[Scraper] Warning: Could not extract price for', url);
      priceData = { price: 0, currency: '$' };
    }

    return {
      title,
      price: priceData.price,
      currency: priceData.currency,
      images: images.length > 0 ? images : ['https://via.placeholder.com/400'],
      brand,
      inStock: true,
      colors,
      sizes,
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

function fallbackExtractTitle($: cheerio.CheerioAPI): string {
  const selectors = [
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

function fallbackExtractPrice($: cheerio.CheerioAPI): { price: number; currency: string } {
  let priceText = '';
  let currency = '$';

  const selectors = [
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

  currency = detectCurrency(priceText);

  const price = parsePrice(priceText);

  return { price, currency };
}

function fallbackExtractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();

  const selectors = [
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

function fallbackExtractBrand($: cheerio.CheerioAPI): string | undefined {
  const selectors = [
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
