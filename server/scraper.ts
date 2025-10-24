import axios from "axios";
import * as cheerio from "cheerio";
import type { ProductVariant, ScrapedProduct } from "@shared/schema";

// --- Helper Functions ---
function cleanText(text: string | undefined): string {
  if (!text) return "";
  // Trim whitespace and replace multiple spaces/newlines with a single space
  return text.trim().replace(/\s+/g, " ");
}

function parsePrice(priceText: string): number {
  if (!priceText || typeof priceText !== "string") return 0; // Handle invalid input
  // Remove currency symbols, letters, thousands separators (both , and .)
  // Keep the decimal separator (, or .)
  const cleaned = priceText.replace(/[^\d.,]/g, "");

  // Determine decimal separator: Check last occurrence of , or .
  const lastComma = cleaned.lastIndexOf(",");
  const lastPeriod = cleaned.lastIndexOf(".");

  let decimalSeparator = "."; // Default to period
  if (lastComma > lastPeriod) {
    decimalSeparator = ",";
  }

  let numberString = cleaned;
  if (decimalSeparator === ",") {
    // European style: Remove periods, replace comma with period
    numberString = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // American/UK style: Remove commas
    numberString = cleaned.replace(/,/g, "");
  }

  // Final check to remove any remaining non-numeric characters except the decimal point
  numberString = numberString.replace(/[^\d.]/g, "");

  const price = parseFloat(numberString);
  return isNaN(price) ? 0 : price; // Return 0 if parsing failed
}

function detectCurrency(text: string, url?: string): string {
  if (!text) text = ""; // Ensure text is a string

  // Check common symbols first
  if (text.includes("£") || text.toUpperCase().includes("GBP")) return "£";
  if (text.includes("€") || text.toUpperCase().includes("EUR")) return "€";
  if (
    text.includes("¥") ||
    text.includes("￥") || // Added full-width Yen
    text.toUpperCase().includes("JPY") ||
    text.toUpperCase().includes("CNY") ||
    text.toUpperCase().includes("RMB")
  )
    return "¥";
  if (text.includes("₹") || text.toUpperCase().includes("INR")) return "₹";
  if (text.includes("A$") || text.toUpperCase().includes("AUD")) return "A$";
  if (text.includes("C$") || text.toUpperCase().includes("CAD")) return "C$";
  // Add more specific currencies here if needed (KRW, CHF, etc.)
  if (text.includes("₩") || text.toUpperCase().includes("KRW")) return "₩";
  if (
    text.includes("Fr.") ||
    text.includes("SFr.") ||
    text.toUpperCase().includes("CHF")
  )
    return "CHF"; // Swiss Franc

  // Check URL last (less reliable)
  if (url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      if (
        hostname.includes(".co.uk") ||
        hostname.includes("/uk") ||
        pathname.includes("/uk") ||
        hostname.includes("/gb") ||
        pathname.includes("/gb")
      )
        return "£";
      if (
        hostname.includes(".de") ||
        hostname.includes(".fr") ||
        hostname.includes(".es") ||
        hostname.includes(".it") ||
        hostname.includes(".eu") ||
        hostname.includes("/eu") ||
        pathname.includes("/eu")
      )
        return "€";
      if (
        hostname.includes(".jp") ||
        hostname.includes("/jp") ||
        pathname.includes("/jp")
      )
        return "¥";
      if (
        hostname.includes(".in") ||
        hostname.includes("/in") ||
        pathname.includes("/in")
      )
        return "₹";
      if (
        hostname.includes(".com.au") ||
        hostname.includes("/au") ||
        pathname.includes("/au")
      )
        return "A$";
      if (
        hostname.includes(".ca") ||
        hostname.includes("/ca") ||
        pathname.includes("/ca")
      )
        return "C$";
      if (
        hostname.includes(".cn") ||
        hostname.includes("/cn") ||
        pathname.includes("/cn")
      )
        return "¥";
      if (
        hostname.includes(".kr") ||
        hostname.includes("/kr") ||
        pathname.includes("/kr")
      )
        return "₩";
      if (
        hostname.includes(".ch") ||
        hostname.includes("/ch") ||
        pathname.includes("/ch")
      )
        return "CHF";
    } catch (e) {
      console.warn(
        `[Scraper] Could not parse URL for currency detection: ${url}`,
        e,
      );
    }
  }

  // Only default to $ if a dollar sign is explicitly present
  if (text.includes("$")) return "$";

  // Return empty string if no currency is clearly identified
  return "";
}

function getCurrencySymbol(code: string): string {
  if (!code || typeof code !== "string") return "$"; // Default or handle error
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
    RMB: "¥",
    KRW: "₩",
    CHF: "CHF", // Added Korean Won, Swiss Franc
    // Add more common codes
    SEK: "kr",
    NOK: "kr",
    DKK: "kr", // Scandinavian Kroner (can be ambiguous, but 'kr' is common)
    RUB: "₽",
    TRY: "₺",
    BRL: "R$",
  };
  return currencyMap[upperCode] || upperCode; // Return the code itself if symbol not found
}

function makeAbsoluteUrl(
  src: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!src || typeof src !== "string") return undefined; // Check if src is valid

  // Trim whitespace from src
  src = src.trim();
  if (!src) return undefined; // Check if empty after trim

  // Check if it's already absolute (http, https, or //)
  if (/^(https?:)?\/\//i.test(src)) {
    // Ensure protocol exists if starting with //
    return src.startsWith("//") ? "https:" + src : src;
  }

  // Check for data URIs
  if (src.startsWith("data:")) {
    return src; // Return data URIs as is
  }

  // Ensure baseUrl is valid before proceeding
  if (!baseUrl || typeof baseUrl !== "string") {
    // console.warn(`[Scraper] makeAbsoluteUrl called with invalid baseUrl: ${baseUrl}`);
    // If no base URL, we can't resolve relative paths starting without '/'
    return src.startsWith("/") ? undefined : src; // Only return if it doesn't look like a root-relative path
  }

  try {
    const base = new URL(baseUrl);
    // Use URL constructor for reliable joining of base and relative path
    const resolvedUrl = new URL(src, base).href;
    return resolvedUrl;
  } catch (e) {
    console.error(
      `[Scraper] Error creating absolute URL for src: "${src}", base: "${baseUrl}"`,
      e,
    );
    // If URL parsing fails, return undefined or the original src if it might be usable
    return undefined;
  }
}

function parseSrcset(srcset: string): string {
  if (!srcset || typeof srcset !== "string") return ""; // Check input
  try {
    const parts = srcset.split(",").map((s) => {
      const trimmed = s.trim();
      // Split by the last space to reliably separate URL and descriptor
      const spaceIndex = trimmed.lastIndexOf(" ");
      if (spaceIndex === -1) return { url: trimmed, width: 0 }; // No descriptor

      const url = trimmed.substring(0, spaceIndex).trim();
      const descriptor = trimmed.substring(spaceIndex + 1).trim();

      let width = 0;
      if (descriptor.endsWith("w")) {
        const widthVal = parseInt(descriptor.slice(0, -1), 10);
        if (!isNaN(widthVal)) width = widthVal;
      }
      // Could also parse 'x' descriptors here if needed
      // else if (descriptor.endsWith('x')) { ... }

      return { url, width };
    });

    // Filter out entries without a valid URL and sort by width descending
    const sortedParts = parts
      .filter((p) => p.url && p.width > 0)
      .sort((a, b) => b.width - a.width);

    // Return the URL of the widest image, or the first URL if no widths were specified/parsed
    if (sortedParts.length > 0) return sortedParts[0].url;
    const firstValidUrl = parts.find((p) => p.url);
    if (firstValidUrl) return firstValidUrl.url; // Fallback to first URL listed
    return ""; // Return empty if no valid URLs found
  } catch (e) {
    console.error("[Scraper] Error parsing srcset:", srcset, e);
    // Fallback if parsing fails: return the last URL listed
    const parts = srcset.split(",").map((s) => s.trim());
    const lastPart = parts[parts.length - 1];
    return lastPart?.split(" ")[0] || ""; // Get URL part of the last segment
  }
}
// --- End Helper Functions ---

interface SiteExtractor {
  extractTitle($: cheerio.CheerioAPI): string | null;
  extractPrice(
    $: cheerio.CheerioAPI,
    url: string,
  ): { price: number; currency: string } | null;
  extractImages($: cheerio.CheerioAPI, baseUrl: string): string[];
  extractBrand?($: cheerio.CheerioAPI): string | undefined;
  extractColors?($: cheerio.CheerioAPI, url: string): ProductVariant[];
  extractSizes?($: cheerio.CheerioAPI, url: string): ProductVariant[];
  needsPuppeteer?: boolean;
}

// --- AYM Studio Extractor (Needs Puppeteer - No Change) ---
const aymStudioExtractor: SiteExtractor = {
  needsPuppeteer: true,
  extractTitle($) {
    return cleanText($("h1.product-title").text()) || null;
  },
  extractPrice($, url) {
    const currencyMeta = $('meta[property="og:price:currency"]').attr(
      "content",
    );
    const priceMeta = $('meta[property="og:price:amount"]').attr("content");
    if (priceMeta && currencyMeta)
      return {
        price: parseFloat(priceMeta),
        currency: getCurrencySymbol(currencyMeta),
      };
    const priceText = cleanText(
      $("price-list sale-price, price-list regular-price").text(),
    );
    if (!priceText) return null;
    let currency = currencyMeta
      ? getCurrencySymbol(currencyMeta)
      : detectCurrency(priceText, url);
    return { price: parsePrice(priceText), currency: currency };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    const seenUrls = new Set<string>();
    $("scroll-carousel div.product-gallery__media img").each((_, el) => {
      let src: string | undefined = $(el).attr("src");
      const srcset = $(el).attr("srcset");
      if (srcset) src = parseSrcset(srcset);
      const absoluteSrc = makeAbsoluteUrl(src, baseUrl);
      if (absoluteSrc && !seenUrls.has(absoluteSrc)) {
        images.push(absoluteSrc);
        seenUrls.add(absoluteSrc);
      }
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    // Note: This HTML structure might also be wrong if it needs Puppeteer
    const colors: ProductVariant[] = [];
    const foundNames = new Set<string>();
    $("div.product-form__swatches--colour label.product-form__swatch").each(
      (_, el) => {
        const colorName = cleanText(
          $(el).find("span.product-form__swatch-value").text(),
        );
        const swatchImg = $(el)
          .find("img.product-form__swatch-image")
          .attr("src");
        const isSoldOut =
          $(el).find("span.product-form__swatch-value--sold-out").length > 0;
        if (colorName && !foundNames.has(colorName)) {
          colors.push({
            name: colorName,
            swatch: makeAbsoluteUrl(swatchImg, ""),
            available: !isSoldOut,
          });
          foundNames.add(colorName);
        }
      },
    );
    return colors;
  },
  extractSizes($) {
    // Note: This HTML structure might also be wrong if it needs Puppeteer
    const sizes: ProductVariant[] = [];
    const foundNames = new Set<string>();
    $("div.product-form__swatches--size label.product-form__swatch").each(
      (_, el) => {
        const sizeName = cleanText(
          $(el).find("span.product-form__swatch-value").text(),
        );
        const isSoldOut =
          $(el).find("span.product-form__swatch-value--sold-out").length > 0;
        if (sizeName && !foundNames.has(sizeName)) {
          sizes.push({ name: sizeName, available: !isSoldOut });
          foundNames.add(sizeName);
        }
      },
    );
    return sizes;
  },
};

// ==========================================================
// FIX: GianaWorld Extractor v6 (Targeting window JSON Object)
// ==========================================================
const gianaWorldExtractor: SiteExtractor = {
  needsPuppeteer: false,
  extractTitle($) {
    // Try window product data first
    try {
      const scriptContent = $(
        'script:contains("window.ORDERSIFY_BIS.product =")',
      ).html();
      if (scriptContent) {
        // Safely extract the JSON part
        const jsonMatch = scriptContent.match(
          /window\.ORDERSIFY_BIS\.product = ({.*?});/s,
        );
        if (jsonMatch && jsonMatch[1]) {
          // Use vm.runInNewContext for safer evaluation than eval
          const sandbox = {};
          vm.runInNewContext(`productData = ${jsonMatch[1]}`, sandbox);
          // @ts-ignore
          const productData = sandbox.productData;
          if (productData && productData.title) {
            console.log("[Giana Extractor] Title found via window JSON.");
            return cleanText(productData.title);
          }
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing window product JSON for title:",
        e,
      );
    }
    // Fallback to ld+json and H1
    try {
      const scriptContent = $('script[type="application/ld+json"]').html();
      if (scriptContent) {
        const jsonData = JSON.parse(scriptContent);
        if (jsonData.name) return cleanText(jsonData.name);
      }
    } catch (e) {}
    return (
      cleanText(
        $("h1.product-title, h1.product_title, h1[itemprop='name']")
          .first()
          .text(),
      ) || null
    );
  },
  extractBrand($) {
    // Try window product data first
    try {
      const scriptContent = $(
        'script:contains("window.ORDERSIFY_BIS.product =")',
      ).html();
      if (scriptContent) {
        const jsonMatch = scriptContent.match(
          /window\.ORDERSIFY_BIS\.product = ({.*?});/s,
        );
        if (jsonMatch && jsonMatch[1]) {
          const sandbox = {};
          vm.runInNewContext(`productData = ${jsonMatch[1]}`, sandbox);
          // @ts-ignore
          const productData = sandbox.productData;
          if (
            productData &&
            productData.vendor &&
            productData.vendor !== "OurWeWeWe" &&
            productData.vendor.toLowerCase() !== "shopify"
          ) {
            console.log("[Giana Extractor] Brand found via window JSON.");
            return cleanText(productData.vendor);
          }
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing window product JSON for brand:",
        e,
      );
    }
    // Fallback using previous robust logic
    let brand: string | undefined = undefined;
    try {
      const siteName = $('meta[property="og:site_name"]').attr("content");
      if (siteName && siteName.toUpperCase() === "GIANA") return "GIANA";
      const scriptContent = $('script[type="application/ld+json"]').html();
      if (scriptContent) {
        const jsonData = JSON.parse(scriptContent);
        if (jsonData.brand?.name && typeof jsonData.brand.name === "string") {
          brand = jsonData.brand.name.trim();
          if (
            brand &&
            brand !== "OurWeWeWe" &&
            brand.toLowerCase() !== "shopify"
          )
            return brand;
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing ld+json for brand (fallback):",
        e,
      );
    }
    if (!brand || brand === "OurWeWeWe" || brand?.toLowerCase() === "shopify") {
      brand = cleanText(
        $(
          '.product-vendor a, .product__vendor a, [data-testid="product-vendor"]',
        )
          .first()
          .text(),
      );
    }
    if (!brand || brand === "OurWeWeWe" || brand?.toLowerCase() === "shopify") {
      const pageText = $("body").text();
      if (pageText.includes("GIANA")) return "GIANA";
    }
    // Final check: Default to GIANA if nothing else specific was found
    return brand && brand !== "OurWeWeWe" && brand.toLowerCase() !== "shopify"
      ? brand.trim()
      : "GIANA";
  },
  extractPrice($, url) {
    // Try window product data first (specifically variant price, as main price might vary)
    try {
      const scriptContent = $(
        'script:contains("window.ORDERSIFY_BIS.product =")',
      ).html();
      if (scriptContent) {
        const jsonMatch = scriptContent.match(
          /window\.ORDERSIFY_BIS\.product = ({.*?});/s,
        );
        if (jsonMatch && jsonMatch[1]) {
          const sandbox = {};
          vm.runInNewContext(`productData = ${jsonMatch[1]}`, sandbox);
          // @ts-ignore
          const productData = sandbox.productData;
          const firstAvailableVariant = productData?.variants?.find(
            (v: any) => v.available,
          );
          if (firstAvailableVariant && firstAvailableVariant.price) {
            console.log(
              "[Giana Extractor] Price found via window JSON (first available variant).",
            );
            const priceInCents = firstAvailableVariant.price;
            const currencyCode =
              $('meta[property="og:price:currency"]').attr("content") ||
              detectCurrency("", url) ||
              "USD";
            return {
              price: priceInCents / 100,
              currency: getCurrencySymbol(currencyCode),
            };
          } else if (productData && productData.price) {
            console.log(
              "[Giana Extractor] Price found via window JSON (main product price).",
            );
            const priceInCents = productData.price;
            const currencyCode =
              $('meta[property="og:price:currency"]').attr("content") ||
              detectCurrency("", url) ||
              "USD";
            return {
              price: priceInCents / 100,
              currency: getCurrencySymbol(currencyCode),
            };
          }
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing window product JSON for price:",
        e,
      );
    }
    // Fallback using previous robust logic
    try {
      const scriptContent = $('script[type="application/ld+json"]').html();
      if (scriptContent) {
        const jsonData = JSON.parse(scriptContent);
        const offer = jsonData.offers?.[0] || jsonData.offers;
        if (offer?.price && offer.priceCurrency) {
          return {
            price: parseFloat(offer.price),
            currency: getCurrencySymbol(offer.priceCurrency),
          };
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing ld+json for price (fallback):",
        e,
      );
    }
    const currencyMeta = $('meta[property="og:price:currency"]').attr(
      "content",
    );
    const priceMeta = $('meta[property="og:price:amount"]').attr("content");
    if (priceMeta && currencyMeta)
      return {
        price: parseFloat(priceMeta),
        currency: getCurrencySymbol(currencyMeta),
      };
    let priceText = cleanText(
      $(
        ".price__sale .price-item--sale, .product-single__price--on-sale .money",
      )
        .first()
        .text(),
    );
    if (!priceText)
      priceText = cleanText(
        $(
          ".price__regular .price-item--regular, .product-single__price .money, .product__price",
        )
          .first()
          .text(),
      );
    if (!priceText)
      priceText = cleanText($("span[data-product-price]").first().text());
    if (!priceText) return null;
    let currency = currencyMeta
      ? getCurrencySymbol(currencyMeta)
      : detectCurrency(priceText, url);
    return { price: parsePrice(priceText), currency: currency };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    const seenUrls = new Set<string>();
    let foundJsonImages = false;
    try {
      const scriptContent = $(
        'script:contains("window.ORDERSIFY_BIS.product =")',
      ).html();
      if (scriptContent) {
        const jsonMatch = scriptContent.match(
          /window\.ORDERSIFY_BIS\.product = ({.*?});/s,
        );
        if (jsonMatch && jsonMatch[1]) {
          const sandbox = {};
          vm.runInNewContext(`productData = ${jsonMatch[1]}`, sandbox);
          // @ts-ignore
          const productData = sandbox.productData;
          const imageSources =
            productData?.images || productData?.media?.map((m: any) => m.src);
          if (imageSources && Array.isArray(imageSources)) {
            imageSources.forEach((imgSrc: string) => {
              if (imgSrc && typeof imgSrc === "string") {
                if (imgSrc.startsWith("//")) imgSrc = "https:" + imgSrc;
                const absoluteSrc = makeAbsoluteUrl(imgSrc, baseUrl);
                if (absoluteSrc && !seenUrls.has(absoluteSrc)) {
                  images.push(absoluteSrc);
                  seenUrls.add(absoluteSrc);
                  foundJsonImages = true;
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing window product JSON for images:",
        e,
      );
    }
    if (foundJsonImages) {
      console.log("[Giana Extractor] Images found via window JSON.");
      return images
        .map((img) =>
          img.startsWith("http:") ? img.replace("http:", "https:") : img,
        )
        .slice(0, 5);
    }

    console.log(
      "[Giana Extractor] Window JSON image extraction failed, falling back...",
    );
    $(
      'script[type="application/json"][data-product-json], script#ProductJson-product-template',
    ).each((_, el) => {
      if (foundJsonImages) return;
      try {
        const jsonData = JSON.parse($(el).html() || "{}");
        const productData = jsonData.product || jsonData;
        const mediaArray = productData.media;
        if (mediaArray && Array.isArray(mediaArray)) {
          mediaArray.forEach((mediaItem: any) => {
            if (mediaItem.src && typeof mediaItem.src === "string") {
              const abs = makeAbsoluteUrl(mediaItem.src, baseUrl);
              if (abs && !seenUrls.has(abs)) {
                images.push(abs);
                seenUrls.add(abs);
                foundJsonImages = true;
              }
            }
          });
        } else if (productData.images && Array.isArray(productData.images)) {
          productData.images.forEach((imgSrc: string) => {
            const abs = makeAbsoluteUrl(imgSrc, baseUrl);
            if (abs && !seenUrls.has(abs)) {
              images.push(abs);
              seenUrls.add(abs);
              foundJsonImages = true;
            }
          });
        }
      } catch (e) {}
    });
    if (images.length > 0)
      return images
        .map((img) =>
          img.startsWith("http:") ? img.replace("http:", "https:") : img,
        )
        .slice(0, 5);
    if (images.length === 0) {
      try {
        const scriptContent = $('script[type="application/ld+json"]').html();
        if (scriptContent) {
          const jsonData = JSON.parse(scriptContent);
          const imgData = jsonData.image;
          if (Array.isArray(imgData)) {
            imgData.forEach((imgUrl: string) => {
              const abs = makeAbsoluteUrl(imgUrl, baseUrl);
              if (abs && !seenUrls.has(abs)) {
                images.push(abs);
                seenUrls.add(abs);
              }
            });
          } else if (typeof imgData === "string") {
            const abs = makeAbsoluteUrl(imgData, baseUrl);
            if (abs && !seenUrls.has(abs)) {
              images.push(abs);
              seenUrls.add(abs);
            }
          }
        }
      } catch (e) {}
    }
    if (images.length === 0) {
      const mainImageSelectors = [
        ".product__media-list img",
        ".product-gallery img",
        ".product__media img",
        ".product-single__photo img",
        "div[data-product-images] img",
        "scroll-carousel div.product-gallery__media img",
      ];
      for (const selector of mainImageSelectors) {
        $(selector).each((_, el) => {
          let src = $(el).attr("src") || $(el).attr("data-src");
          const srcset = $(el).attr("srcset") || $(el).attr("data-srcset");
          if (srcset) src = parseSrcset(srcset);
          const abs = makeAbsoluteUrl(src, baseUrl);
          if (abs && !seenUrls.has(abs)) {
            images.push(abs);
            seenUrls.add(abs);
          }
        });
        if (images.length > 0) break;
      }
    }
    const httpsImages = images.map((img) =>
      img.startsWith("http:") ? img.replace("http:", "https:") : img,
    );
    return httpsImages.slice(0, 5);
  },
  extractColors($, url) {
    const colors: ProductVariant[] = [];
    const foundNames = new Set<string>();
    let jsonDataParsed = false;

    // Try window product JSON first
    try {
      const scriptContent = $(
        'script:contains("window.ORDERSIFY_BIS.product =")',
      ).html();
      if (scriptContent) {
        const jsonMatch = scriptContent.match(
          /window\.ORDERSIFY_BIS\.product = ({.*?});/s,
        );
        if (jsonMatch && jsonMatch[1]) {
          const sandbox = {};
          vm.runInNewContext(`productData = ${jsonMatch[1]}`, sandbox);
          // @ts-ignore
          const productData = sandbox.productData;
          const colorOptionIndex = productData.options?.findIndex(
            (opt: string) =>
              typeof opt === "string" && opt.toLowerCase() === "color",
          );

          if (
            colorOptionIndex !== undefined &&
            colorOptionIndex !== -1 &&
            productData.variants &&
            Array.isArray(productData.variants)
          ) {
            productData.variants.forEach((variant: any) => {
              const colorName = variant[`option${colorOptionIndex + 1}`]; // e.g., option2 if 'Color' is the 2nd option
              if (
                colorName &&
                typeof colorName === "string" &&
                !foundNames.has(colorName)
              ) {
                let swatchUrl: string | undefined = variant.featured_image?.src; // Prioritize variant's featured image
                if (swatchUrl && swatchUrl.startsWith("//"))
                  swatchUrl = "https:" + swatchUrl;
                colors.push({
                  name: cleanText(colorName),
                  available: variant.available,
                  swatch: makeAbsoluteUrl(swatchUrl, url),
                });
                foundNames.add(colorName);
                jsonDataParsed = true;
              }
            });
          }
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing window product JSON for colors:",
        e,
      );
    }

    if (jsonDataParsed) {
      console.log(
        `[Giana Extractor] Found ${colors.length} colors via window JSON.`,
      );
      return colors;
    }

    // Fallback to HTML <select> or labels
    console.log(
      "[Giana Extractor] Window JSON Color extraction failed, falling back to HTML.",
    );
    // --- Start of HTML Fallback for Colors ---
    $(
      'select[name*="option"], select[id*="Color"], select[data-option*="color"]',
    ).each((_, selectEl) => {
      const $select = $(selectEl);
      const selectId = $select.attr("id");
      const $label = selectId
        ? $(`label[for="${selectId}"]`)
        : $select.siblings("label");
      const labelText = $label.text();
      const selectName = $select.attr("name");

      if (
        labelText.toLowerCase().includes("color") ||
        selectName?.toLowerCase().includes("color")
      ) {
        console.log(
          `[Giana Extractor HTML Fallback] Found potential color select: id=${selectId}, name=${selectName}`,
        );
        $select.find("option").each((_, optionEl) => {
          const $option = $(optionEl);
          const colorName = cleanText(
            $option.val()?.toString() || $option.text(),
          );
          const disabled = $option.prop("disabled");
          const available = !disabled;
          const optionText = $option.text().toLowerCase();
          const isSoldOut =
            optionText.includes("sold out") ||
            optionText.includes("unavailable");

          if (
            colorName &&
            !colorName.toLowerCase().startsWith("select") &&
            !foundNames.has(colorName)
          ) {
            colors.push({
              name: colorName,
              available: available && !isSoldOut,
              swatch: undefined,
            });
            foundNames.add(colorName);
          }
        });
        if (colors.length > 0) return false; // Stop searching selects if we found colors
      }
    });
    // Fallback to labels/radios if select failed
    if (colors.length === 0) {
      console.log(
        "[Giana Extractor HTML Fallback] <select> failed for colors, trying labels/radios...",
      );
      $(
        'fieldset legend:contains("Color") + ul label, fieldset[data-option-name*="color" i] label, div.product-form__swatches--colour label.product-form__swatch, label.color-swatch',
      ).each((_, el) => {
        // Added original selectors back
        const colorName = cleanText(
          $(el).text().trim() ||
            $(el).find("input").val()?.toString() ||
            $(el).find(".swatch-element__tooltip").text() ||
            $(el).find("span.product-form__swatch-value").text(),
        ); // Added original span selector
        const inputId = $(el).attr("for");
        const input = inputId ? $(`#${inputId}`) : $(el).find("input");
        let available = !(
          input.prop("disabled") ||
          $(el).hasClass("disabled") ||
          $(el).hasClass("sold-out") ||
          $(el).hasClass("is-disabled") ||
          $(el).find("span.product-form__swatch-value--sold-out").length > 0
        ); // Added original sold-out check
        let swatch: string | undefined =
          $(el).find("img").attr("src") ||
          $(el).find(".swatch__color-image").css("background-image"); // Added original selectors
        if (swatch && swatch.startsWith('url("'))
          swatch = swatch.replace('url("', "").replace('")', "");

        if (
          colorName &&
          colorName.toLowerCase() !== "color" &&
          !foundNames.has(colorName)
        ) {
          colors.push({
            name: colorName,
            swatch: makeAbsoluteUrl(swatch, url),
            available: available,
          }); // Pass url to makeAbsoluteUrl
          foundNames.add(colorName);
        }
      });
    }
    // --- End of HTML Fallback ---
    console.log(
      `[Giana Extractor] Found ${colors.length} colors via HTML fallback.`,
    );
    return colors;
  },
  extractSizes($, url) {
    const sizes: ProductVariant[] = [];
    const foundNames = new Set<string>();
    let jsonDataParsed = false;

    // Try window product JSON first
    try {
      const scriptContent = $(
        'script:contains("window.ORDERSIFY_BIS.product =")',
      ).html();
      if (scriptContent) {
        const jsonMatch = scriptContent.match(
          /window\.ORDERSIFY_BIS\.product = ({.*?});/s,
        );
        if (jsonMatch && jsonMatch[1]) {
          const sandbox = {};
          vm.runInNewContext(`productData = ${jsonMatch[1]}`, sandbox);
          // @ts-ignore
          const productData = sandbox.productData;
          const sizeOptionIndex = productData.options?.findIndex(
            (opt: string) =>
              typeof opt === "string" && opt.toLowerCase() === "size",
          );

          if (
            sizeOptionIndex !== undefined &&
            sizeOptionIndex !== -1 &&
            productData.variants &&
            Array.isArray(productData.variants)
          ) {
            productData.variants.forEach((variant: any) => {
              const sizeName = variant[`option${sizeOptionIndex + 1}`];
              if (
                sizeName &&
                typeof sizeName === "string" &&
                !foundNames.has(sizeName)
              ) {
                sizes.push({
                  name: cleanText(sizeName),
                  available: variant.available,
                });
                foundNames.add(sizeName);
                jsonDataParsed = true;
              }
            });
          }
        }
      }
    } catch (e) {
      console.error(
        "[Giana Extractor] Error parsing window product JSON for sizes:",
        e,
      );
    }

    if (jsonDataParsed) {
      console.log(
        `[Giana Extractor] Found ${sizes.length} sizes via window JSON.`,
      );
      return sizes;
    }

    // Fallback to HTML <select> or labels
    console.log(
      "[Giana Extractor] Window JSON Size extraction failed, falling back to HTML.",
    );
    // --- Start of HTML Fallback for Sizes ---
    $(
      'select[name*="option"], select[id*="Size"], select[data-option*="size"]',
    ).each((_, selectEl) => {
      const $select = $(selectEl);
      const selectId = $select.attr("id");
      const $label = selectId
        ? $(`label[for="${selectId}"]`)
        : $select.siblings("label");
      const labelText = $label.text();
      const selectName = $select.attr("name");

      if (
        labelText.toLowerCase().includes("size") ||
        selectName?.toLowerCase().includes("size")
      ) {
        console.log(
          `[Giana Extractor HTML Fallback] Found potential size select: id=${selectId}, name=${selectName}`,
        );
        $select.find("option").each((_, optionEl) => {
          const $option = $(optionEl);
          const sizeName = cleanText(
            $option.val()?.toString() || $option.text(),
          );
          const disabled = $option.prop("disabled");
          const available = !disabled;
          const optionText = $option.text().toLowerCase();
          const isSoldOut =
            optionText.includes("sold out") ||
            optionText.includes("unavailable");

          if (
            sizeName &&
            !sizeName.toLowerCase().startsWith("select") &&
            !foundNames.has(sizeName)
          ) {
            sizes.push({ name: sizeName, available: available && !isSoldOut });
            foundNames.add(sizeName);
          }
        });
        if (sizes.length > 0) return false; // Stop searching selects
      }
    });

    // Fallback to labels/radios if select failed
    if (sizes.length === 0) {
      console.log(
        "[Giana Extractor HTML Fallback] <select> failed for sizes, trying labels/radios...",
      );
      $(
        'fieldset legend:contains("Size") + ul label, fieldset[data-option-name*="size" i] label, div.product-form__swatches--size label.product-form__swatch, label.block-swatch',
      ).each((_, el) => {
        // Added original selectors back
        const sizeName = cleanText(
          $(el).text().trim() ||
            $(el).find("input").val()?.toString() ||
            $(el).find(".swatch-element__tooltip").text() ||
            $(el).find("span.product-form__swatch-value").text(),
        ); // Added original span selector
        const inputId = $(el).attr("for");
        const input = inputId ? $(`#${inputId}`) : $(el).find("input");
        let available = !(
          input.prop("disabled") ||
          $(el).hasClass("disabled") ||
          $(el).hasClass("sold-out") ||
          $(el).hasClass("is-disabled") ||
          $(el).find("span.product-form__swatch-value--sold-out").length > 0
        ); // Added original sold-out check

        if (
          sizeName &&
          sizeName.toLowerCase() !== "size" &&
          !foundNames.has(sizeName)
        ) {
          sizes.push({ name: sizeName, available: available });
          foundNames.add(sizeName);
        }
      });
    }
    // --- End of HTML Fallback ---
    console.log(
      `[Giana Extractor] Found ${sizes.length} sizes via HTML fallback.`,
    );
    return sizes;
  },
};
// ==========================================================
// End GianaWorld Fix
// ==========================================================

// --- Other Extractors (Keep full code) ---
const zaraExtractor: SiteExtractor = {
  /* Full code */ needsPuppeteer: true,
  extractTitle($) {
    let title = cleanText(
      $(
        "h1.product-detail-card-info__title span.product-detail-card-info__name",
      ).text(),
    );
    if (!title)
      title = cleanText(
        $('span[data-qa-qualifier="product-detail-info-name"]').text(),
      );
    return title || null;
  },
  extractPrice($, url) {
    const priceText = cleanText(
      $(
        'span[data-qa-qualifier="price-amount-current"] span.money-amount__main',
      ).text(),
    );
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText, url),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $('picture[data-qa-qualifier="media-image"]').each((_, el) => {
      const srcset = $(el).find("source").attr("srcset");
      if (srcset) {
        images.push(parseSrcset(srcset));
      } else {
        const src = $(el).find("img").attr("src");
        if (src && src.startsWith("http")) images.push(src);
      }
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    const colors: ProductVariant[] = [];
    $(
      "ul.product-detail-color-selector__colors li.product-detail-color-item",
    ).each((_, el) => {
      const colorName = cleanText($(el).find("span.screen-reader-text").text());
      if (colorName) {
        colors.push({ name: colorName, available: true });
      }
    });
    return colors;
  },
};
const hmExtractor: SiteExtractor = {
  /* Full code */ needsPuppeteer: true,
  extractTitle($) {
    const jsonSchema = $("script#product-schema").html();
    if (jsonSchema) {
      try {
        const data = JSON.parse(jsonSchema);
        if (data.name) return cleanText(data.name);
      } catch (e) {}
    }
    return cleanText($("h1").text()) || null;
  },
  extractPrice($, url) {
    const jsonSchema = $("script#product-schema").html();
    if (jsonSchema) {
      try {
        const data = JSON.parse(jsonSchema);
        if (data.offers?.price) {
          return {
            price: parseFloat(data.offers.price),
            currency: getCurrencySymbol(data.offers.priceCurrency || "$"),
          };
        }
      } catch (e) {}
    }
    const priceText = cleanText($('span[translate="no"]').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText, url),
    };
  },
  extractImages($, baseUrl) {
    const jsonSchema = $("script#product-schema").html();
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
    const colors: ProductVariant[] = [];
    $('div[data-testid="color-selector-wrapper"] a[role="radio"]').each(
      (_, el) => {
        const colorName = $(el).attr("title");
        const swatchImg = $(el).find("img").attr("src");
        if (colorName) {
          colors.push({
            name: cleanText(colorName),
            swatch: swatchImg,
            available: true,
          });
        }
      },
    );
    return colors;
  },
  extractSizes($) {
    const sizes: ProductVariant[] = [];
    $(
      'div[data-testid="size-selector"] ul[data-testid="grid"] div[role="radio"]',
    ).each((_, el) => {
      const sizeName = cleanText($(el).find("div").first().text());
      const ariaLabel = $(el).attr("aria-label") || "";
      const isAvailable = !ariaLabel.toLowerCase().includes("out of stock");
      if (sizeName) {
        sizes.push({ name: sizeName, available: isAvailable });
      }
    });
    return sizes;
  },
};
const farfetchExtractor: SiteExtractor = {
  /* Full code */ needsPuppeteer: true,
  extractTitle($) {
    return (
      cleanText($('p[data-testid="product-short-description"]').text()) || null
    );
  },
  extractBrand($) {
    return cleanText(
      $(
        'h1.ltr-i980jo a.ltr-1rkeqir-Body-Heading, a[data-component="DesignerName"]',
      ).text(),
    );
  },
  extractPrice($, url) {
    const priceText = cleanText($('p[data-component="PriceLarge"]').text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText, url),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $(
      'div.ltr-1kklpjs button.ltr-1c58b5g img, [data-testid="product-image"] img',
    ).each((_, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http")) images.push(src);
    });
    return images.slice(0, 5);
  },
};
const amazonExtractor: SiteExtractor = {
  /* Full code */ needsPuppeteer: true,
  extractTitle($) {
    return cleanText($("#productTitle").text()) || null;
  },
  extractPrice($, url) {
    let priceText = cleanText($("span.a-price-whole").first().text());
    if (!priceText)
      priceText = cleanText($(".a-price .a-offscreen").first().text());
    if (!priceText) priceText = cleanText($("#priceblock_ourprice").text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText, url),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $("#altImages ul li.imageThumbnail img").each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const largeSrc = src.replace(/\._.*?_\./, ".");
        images.push(largeSrc);
      }
    });
    return images.slice(0, 5);
  },
  extractBrand($) {
    return cleanText(
      $("#bylineInfo, a#brand")
        .text()
        .replace("Visit the", "")
        .replace("Store", "")
        .trim(),
    );
  },
};
const mytheresaExtractor: SiteExtractor = {
  /* Full code */ needsPuppeteer: false,
  extractBrand($) {
    return cleanText($("div.product__area__branding__designer a").text());
  },
  extractTitle($) {
    return cleanText($("div.product__area__branding__name").text()) || null;
  },
  extractPrice($, url) {
    const priceText = cleanText($("span.pricing__prices__price").text());
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText, url),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $(
      "div.product__gallery__carousel div.swiper-wrapper div.swiper-slide",
    ).each((_, el) => {
      if (!$(el).hasClass("swiper-slide-duplicate")) {
        const src = $(el).find("img").attr("src");
        if (src && src.startsWith("http")) images.push(src);
      }
    });
    return images.slice(0, 5);
  },
  extractSizes($) {
    const sizes: ProductVariant[] = [];
    $("div.dropdown__options__wrapper div.sizeitem").each((_, el) => {
      if (!$(el).hasClass("sizeitem--placeholder")) {
        const sizeName = cleanText($(el).find("span.sizeitem__label").text());
        const isAvailable = !$(el).hasClass("sizeitem--notavailable");
        if (sizeName) {
          sizes.push({ name: sizeName, available: isAvailable });
        }
      }
    });
    return sizes;
  },
};
const yooxExtractor: SiteExtractor = {
  /* Full code */ needsPuppeteer: false,
  extractBrand($) {
    return cleanText($("h1.ItemInfo_designer__XsNGI a").text());
  },
  extractTitle($) {
    return cleanText($("h2.ItemInfo_microcat__cTaMO a").text()) || null;
  },
  extractPrice($, url) {
    const priceText = cleanText(
      $('div.ItemInfo_price___W18c div.price[data-ta="current-price"]').text(),
    );
    if (!priceText) return null;
    return {
      price: parsePrice(priceText),
      currency: detectCurrency(priceText, url),
    };
  },
  extractImages($, baseUrl) {
    const images: string[] = [];
    $("div.PicturesSlider_photoSlider__BUjaM img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http")) images.push(src);
    });
    return images.slice(0, 5);
  },
  extractColors($) {
    const colors: ProductVariant[] = [];
    $(
      "div.ColorPicker_color-picker__VS_Ec a.ColorPicker_color-elem__KV09t",
    ).each((_, el) => {
      const colorName = $(el)
        .find("div.ColorPicker_color-sample__yS_FM")
        .attr("title");
      const isDisabled = $(el).parent().hasClass("SizePicker_disabled__ma4Lp");
      if (colorName) {
        colors.push({ name: cleanText(colorName), available: !isDisabled });
      }
    });
    return colors;
  },
  extractSizes($) {
    const sizes: ProductVariant[] = [];
    $('div[data-ta="size-picker"] div.SizePicker_size-item__nL4z_').each(
      (_, el) => {
        const sizeName = cleanText(
          $(el).find("span.SizePicker_size-title__LucnR").text(),
        );
        const isDisabled = $(el).hasClass("SizePicker_disabled__ma4Lp");
        if (sizeName) {
          sizes.push({ name: sizeName, available: !isDisabled });
        }
      },
    );
    return sizes;
  },
};
// --- End Other Extractors ---

function getExtractorForSite(url: string): SiteExtractor | null {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("aym-studio.com")) return aymStudioExtractor;
  if (hostname.includes("gianaworld.com")) return gianaWorldExtractor;
  if (hostname.includes("zara.com")) return zaraExtractor;
  if (hostname.includes("hm.com") || hostname.includes("www2.hm.com"))
    return hmExtractor;
  if (hostname.includes("farfetch.com")) return farfetchExtractor;
  if (hostname.includes("amazon.")) return amazonExtractor;
  if (hostname.includes("mytheresa.com")) return mytheresaExtractor;
  if (hostname.includes("yoox.com")) return yooxExtractor;
  return null;
}

export async function scrapeProductFromUrl(
  url: string,
): Promise<ScrapedProduct> {
  let siteExtractor: SiteExtractor | null = null; // Defined outside try
  try {
    siteExtractor = getExtractorForSite(url);
    console.log(`[Scraper] Starting scrape for: ${url}`);

    if (siteExtractor?.needsPuppeteer) {
      console.log(
        `[Scraper] Site ${new URL(url).hostname} requires Puppeteer, delegating...`,
      );
      const { scrapeWithPuppeteer } = await import("./puppeteer-scraper");
      return await scrapeWithPuppeteer(url);
    }

    // --- Axios Request ---
    console.log(`[Scraper] Scraping ${new URL(url).hostname} with Axios...`);
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Ch-Ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Dnt: "1",
      },
      timeout: 20000,
      maxRedirects: 5,
    });
    if (response.status < 200 || response.status >= 300)
      throw new Error(`Request failed with status code ${response.status}`);
    const html = response.data;
    const $ = cheerio.load(html);
    // --- End Axios Request ---

    let title: string | null = null;
    let priceData: { price: number; currency: string } | null = null;
    let images: string[] = [];
    let brand: string | undefined;
    let colors: ProductVariant[] | undefined;
    let sizes: ProductVariant[] | undefined;

    if (siteExtractor) {
      console.log(`[Scraper] Using extractor for: ${new URL(url).hostname}`);
      title = siteExtractor.extractTitle($);
      priceData = siteExtractor.extractPrice($, url);
      images = siteExtractor.extractImages($, url);
      brand = siteExtractor.extractBrand?.($);
      colors = siteExtractor.extractColors?.($, url);
      sizes = siteExtractor.extractSizes?.($, url);
      console.log(
        `[Extractor Results] Title: ${title}, Price: ${priceData?.price}, Brand: ${brand}, Colors: ${colors?.length}, Sizes: ${sizes?.length}`,
      );
    } else {
      console.log(
        `[Scraper] No specific extractor found for ${new URL(url).hostname}. Using fallbacks.`,
      );
    }

    // --- Fallback Logic ---
    if (!title) {
      title = fallbackExtractTitle($);
      console.log("[Fallback] Used Title Fallback");
    }
    if (!priceData) {
      priceData = fallbackExtractPrice($, url);
      console.log("[Fallback] Used Price Fallback");
    }
    if (!images || images.length === 0) {
      images = fallbackExtractImages($, url);
      console.log("[Fallback] Used Images Fallback");
    }
    if (!brand) {
      brand = fallbackExtractBrand($);
      console.log("[Fallback] Used Brand Fallback");
    }
    // --- End Fallback Logic ---

    if (!title || title === "Untitled Product")
      throw new Error(
        "Failed to extract product title - page may not be accessible or scraping blocked.",
      );
    if (!priceData || isNaN(priceData.price) || priceData.price < 0) {
      console.warn("[Scraper] Warning: Could not extract valid price for", url);
      priceData = { price: 0, currency: detectCurrency("", url) || "$" };
    }

    let inStock = true;
    if (sizes && sizes.length > 0) {
      inStock = sizes.some((size) => size.available !== false);
    } else if (colors && colors.length > 0) {
      inStock = colors.some((color) => color.available !== false);
    }

    console.log(
      `[Scraper Final Data] Title: ${title}, Price: ${priceData.price}, Brand: ${brand}, Colors: ${colors?.length || 0}, Sizes: ${sizes?.length || 0}, InStock: ${inStock}`,
    );

    return {
      title,
      price: priceData.price,
      currency: priceData.currency,
      images:
        images && images.length > 0
          ? images
          : ["https://via.placeholder.com/400?text=No+Image+Found"],
      brand,
      inStock: inStock,
      colors: colors && colors.length > 0 ? colors : undefined,
      sizes: sizes && sizes.length > 0 ? sizes : undefined,
      url,
    };
  } catch (error) {
    // --- Error Handling ---
    console.error(`[Scraper] FULL ERROR for ${url}:`, error); // Log the full error object
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
        return Promise.reject(
          new Error("Request timeout - the website took too long to respond."),
        );
      if (status === 403)
        return Promise.reject(
          new Error(
            "Access denied (403) - website is blocking automated requests.",
          ),
        );
      if (status === 404)
        return Promise.reject(
          new Error(
            "Product not found (404) - URL invalid or product removed.",
          ),
        );
      if (status && status >= 500)
        return Promise.reject(
          new Error(
            `Website server error (${status}) - please try again later.`,
          ),
        );
      console.error(
        `[Scraper] Axios Error Status: ${status}, Code: ${error.code}, Message: ${error.message}`,
      );
      return Promise.reject(
        new Error(
          `Network error scraping product (Status: ${status || "N/A"}). Check server logs.`,
        ),
      );
    } else if (error instanceof Error) {
      console.error("[Scraper] Internal Scraping Error:", error.message);
      return Promise.reject(error); // Re-throw the specific error
    } else {
      console.error("[Scraper] Unexpected Non-Error Thrown:", error);
      return Promise.reject(
        new Error(
          "An unexpected error occurred during scraping. Check server logs.",
        ),
      );
    }
    // --- End Error Handling ---
  }
}

// --- Fallback Functions (Full Implementations) ---
function fallbackExtractTitle($: cheerio.CheerioAPI): string {
  const selectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    "h1.product-title",
    "h1.product-name",
    'h1[itemprop="name"]',
    '[data-testid="product-title"]',
    '[data-qa="product-name"]',
    ".product_title",
    ".productTitle",
    "h1",
    "title",
  ];
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length) {
      const content =
        element.is("meta") || element.is("title")
          ? element.attr("content") || element.text()
          : element.text();
      if (content && content.trim()) {
        let title = content.trim().replace(/\s+/g, " ");
        if (selector === "title" && title.includes("|"))
          title = title.substring(0, title.lastIndexOf("|")).trim();
        if (selector === "title" && title.includes(" - "))
          title = title.substring(0, title.lastIndexOf(" - ")).trim();
        if (title.length > 3 && title.toLowerCase() !== "product") return title;
      }
    }
  }
  return "Untitled Product";
}

function fallbackExtractPrice(
  $: cheerio.CheerioAPI,
  url: string,
): { price: number; currency: string } {
  let priceText = "";
  let currency = "$";
  let price = 0;
  try {
    const scriptContent = $('script[type="application/ld+json"]').html();
    if (scriptContent) {
      const jsonData = JSON.parse(scriptContent);
      const offer = jsonData.offers?.[0] || jsonData.offers;
      if (offer && offer.price && offer.priceCurrency) {
        price = parseFloat(offer.price);
        currency = getCurrencySymbol(offer.priceCurrency);
        if (!isNaN(price) && price > 0) return { price, currency };
      }
    }
  } catch (e) {}
  const currencyMeta = $('meta[property="og:price:currency"]').attr("content");
  const priceMeta = $('meta[property="og:price:amount"]').attr("content");
  if (priceMeta && !isNaN(parseFloat(priceMeta)) && parseFloat(priceMeta) > 0) {
    price = parseFloat(priceMeta);
    currency = currencyMeta
      ? getCurrencySymbol(currencyMeta)
      : detectCurrency("", url) || "$";
    return { price, currency };
  }
  const productPriceMeta = $('meta[property="product:price:amount"]').attr(
    "content",
  );
  if (
    productPriceMeta &&
    !isNaN(parseFloat(productPriceMeta)) &&
    parseFloat(productPriceMeta) > 0
  ) {
    price = parseFloat(productPriceMeta);
    currency =
      $('meta[property="product:price:currency"]').attr("content") ||
      currencyMeta ||
      detectCurrency("", url) ||
      "$";
    return { price, currency: getCurrencySymbol(currency) };
  }
  const selectors = [
    'span[itemprop="price"]',
    '[data-testid="product-price"]',
    '[data-qa="price"]',
    ".product-price",
    ".price",
    ".Price",
    ".price--main",
    ".product__price",
    '[class*="price"]:not([class*="old"]):not([class*="original"]):not([class*="was"])',
    "#priceblock_ourprice",
    "#price",
    "#productPrice",
  ];
  for (const selector of selectors) {
    $(selector).each((_, element) => {
      priceText = $(element).attr("content") || $(element).text();
      if (priceText && priceText.trim()) {
        const potentialPrice = parsePrice(priceText);
        if (!isNaN(potentialPrice) && potentialPrice > 0) {
          currency = detectCurrency(priceText, url) || currencyMeta || "$";
          price = potentialPrice;
          return false;
        }
      }
    });
    if (price > 0) break;
  }
  if (price > 0 && (currency === "$" || !currency)) {
    currency = detectCurrency("", url) || "$";
  }
  return { price, currency };
}

function fallbackExtractImages(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();
  try {
    const scriptContent = $('script[type="application/ld+json"]').html();
    if (scriptContent) {
      const jsonData = JSON.parse(scriptContent);
      const imgData = jsonData.image;
      if (Array.isArray(imgData)) {
        imgData.forEach((imgUrl: string) => {
          const abs = makeAbsoluteUrl(imgUrl, baseUrl);
          if (abs && !seenUrls.has(abs)) {
            images.push(abs);
            seenUrls.add(abs);
          }
        });
      } else if (typeof imgData === "string") {
        const abs = makeAbsoluteUrl(imgData, baseUrl);
        if (abs && !seenUrls.has(abs)) {
          images.push(abs);
          seenUrls.add(abs);
        }
      }
      if (images.length > 0) return images.slice(0, 5);
    }
  } catch (e) {}
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    const abs = makeAbsoluteUrl(ogImage, baseUrl);
    if (abs && !seenUrls.has(abs)) {
      images.push(abs);
      seenUrls.add(abs);
    }
  }
  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  if (twitterImage) {
    const abs = makeAbsoluteUrl(twitterImage, baseUrl);
    if (abs && !seenUrls.has(abs)) {
      images.push(abs);
      seenUrls.add(abs);
    }
  }
  if (images.length >= 5) return images.slice(0, 5);
  const selectors = [
    'img[itemprop="image"]',
    '[data-testid="product-image"]',
    ".product-image img",
    '[class*="product"] img',
    'img[src*="product"]',
    ".product__main-photos img",
    ".productView-image img",
    "#main-image",
    "#productImage",
    'img[alt*="product"]',
  ];
  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const img = $(element);
      let src =
        img.attr("content") ||
        img.attr("src") ||
        img.attr("data-src") ||
        img.attr("data-srcset") ||
        img.attr("srcset");
      if (src && (src.includes("srcset=") || src.includes(","))) {
        src = parseSrcset(src);
      }
      const absoluteSrc = makeAbsoluteUrl(src, baseUrl);
      if (
        absoluteSrc &&
        !seenUrls.has(absoluteSrc) &&
        !absoluteSrc.includes("placeholder") &&
        !absoluteSrc.includes("icon") &&
        !absoluteSrc.includes("sprite") &&
        !absoluteSrc.includes("logo") &&
        !absoluteSrc.includes("data:image") &&
        absoluteSrc.length > 10
      ) {
        images.push(absoluteSrc);
        seenUrls.add(absoluteSrc);
      }
      if (images.length >= 5) return false;
    });
    if (images.length >= 5) break;
  }
  return images.slice(0, 5);
}

function fallbackExtractBrand($: cheerio.CheerioAPI): string | undefined {
  let brand: string | undefined = undefined;
  try {
    const scriptContent = $('script[type="application/ld+json"]').html();
    if (scriptContent) {
      const jsonData = JSON.parse(scriptContent);
      if (jsonData.brand?.name && typeof jsonData.brand.name === "string") {
        brand = jsonData.brand.name.trim();
        if (brand && brand.toLowerCase() !== "shopify") return brand;
      }
    }
  } catch (e) {}
  const ogBrand = $('meta[property="og:brand"]').attr("content");
  if (ogBrand && ogBrand.trim()) return ogBrand.trim();
  const productBrand = $('meta[property="product:brand"]').attr("content");
  if (productBrand && productBrand.trim()) return productBrand.trim();
  const itemBrand = $('meta[itemprop="brand"]').attr("content");
  if (itemBrand && itemBrand.trim()) return itemBrand.trim();
  const selectors = [
    '[itemprop="brand"]',
    '[data-testid="product-brand"]',
    ".product-brand",
    '[class*="brand"]',
    ".pdp-header__meta",
    ".product-meta__vendor",
    ".product__vendor",
  ];
  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length) {
      const content = element.attr("content") || element.text();
      if (
        content &&
        content.trim() &&
        content.trim().length > 1 &&
        content.toLowerCase() !== "brand"
      ) {
        brand = content.trim().replace(/^brand:\s*/i, "");
        if (brand) return brand;
      }
    }
  }
  const title = fallbackExtractTitle($);
  const titleParts = title.split(" - ");
  if (
    titleParts.length > 1 &&
    titleParts[0].length < 20 &&
    titleParts[0] !== "Untitled Product"
  ) {
    return titleParts[0];
  }
  return undefined;
}
// --- End Fallback Functions ---
