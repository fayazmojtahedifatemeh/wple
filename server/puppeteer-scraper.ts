import puppeteer from "puppeteer";
// FIX: Import the new types from the shared schema
import type { ScrapedProduct, ProductVariant } from "@shared/schema";

interface PuppeteerConfig {
  waitForSelector?: string;
  timeout?: number;
  additionalWaitTime?: number;
}

const siteConfigs: Record<string, PuppeteerConfig> = {
  // FIX: Add config for aym-studio
  "aym-studio.com": {
    waitForSelector: "h1.product-title",
    timeout: 10000,
    additionalWaitTime: 2000,
  },
  "zara.com": {
    waitForSelector: 'span[data-qa-qualifier="price-amount-current"]',
    timeout: 10000,
    additionalWaitTime: 2000,
  },
  "hm.com": {
    waitForSelector: "#product-schema",
    timeout: 10000,
    additionalWaitTime: 1000,
  },
  "farfetch.com": {
    waitForSelector: 'p[data-component="PriceLarge"]',
    timeout: 10000,
    additionalWaitTime: 2000,
  },
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

export async function scrapeWithPuppeteer(
  url: string,
): Promise<ScrapedProduct> {
  const config = getSiteConfig(url);

  if (!config) {
    // FIX: Check for gianaworld which we know works without puppeteer
    if (url.includes("gianaworld")) {
      throw new Error(
        "This site should not be using Puppeteer. Check scraper.ts",
      );
    }
    throw new Error("Site not configured for Puppeteer scraping");
  }

  let browser;

  try {
    console.log("[Puppeteer] Launching browser for:", url);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("[Puppeteer] Navigating to page...");
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: config.timeout || 10000,
    });

    if (config.waitForSelector) {
      console.log("[Puppeteer] Waiting for selector:", config.waitForSelector);
      await page.waitForSelector(config.waitForSelector, {
        timeout: config.timeout || 10000,
      });
    }

    if (config.additionalWaitTime) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.additionalWaitTime),
      );
    }

    console.log("[Puppeteer] Page loaded, extracting content...");

    const html = await page.content();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    const hostname = new URL(url).hostname.toLowerCase();
    let product: ScrapedProduct;

    // FIX: Add aym-studio to the extractor list
    if (hostname.includes("aym-studio")) {
      product = await extractAymProduct($, url);
    } else if (hostname.includes("zara")) {
      product = await extractZaraProduct($, url);
    } else if (hostname.includes("hm.com")) {
      product = await extractHMProduct($, url);
    } else if (hostname.includes("farfetch")) {
      product = await extractFarfetchProduct($, url, page);
    } else {
      throw new Error("Unsupported site for Puppeteer scraping");
    }

    console.log("[Puppeteer] Successfully extracted:", product.title);

    return product;
  } catch (error) {
    console.error("[Puppeteer] Error:", error);
    throw new Error(
      `Puppeteer scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function
const cleanText = (text: string | undefined) =>
  text?.trim().replace(/\s+/g, " ") || "";

// FIX: New extractor for aym-studio
async function extractAymProduct($: any, url: string): Promise<ScrapedProduct> {
  const title = cleanText($("h1.product-title").text());
  const brand = "AYM Studio"; // Hardcode or extract if available

  const currencyMeta = $('meta[property="og:price:currency"]').attr("content");
  const priceMeta = $('meta[property="og:price:amount"]').attr("content");
  let price = 0;
  let currency = "$";

  if (priceMeta && currencyMeta) {
    price = parseFloat(priceMeta);
    currency = getCurrencySymbol(currencyMeta);
  } else {
    const priceText = cleanText(
      $("price-list sale-price, price-list regular-price").text(),
    );
    price = parseFloat(priceText.replace(/[^\d.,]/g, "").replace(/,/g, ""));
    currency = detectCurrency(priceText, url);
  }

  const images: string[] = [];
  $("scroll-carousel div.product-gallery__media img").each(
    (_: any, el: any) => {
      let src: string | undefined = $(el).attr("src");
      const srcset = $(el).attr("srcset");
      if (srcset) {
        const largest = srcset
          .split(",")
          .map((s: string) => s.trim())
          .pop();
        if (largest) src = largest.split(" ")[0];
      }
      if (src && src.startsWith("//")) src = "https:" + src;
      if (src && src.startsWith("http") && !images.includes(src)) {
        images.push(src);
      }
    },
  );

  const colors: ProductVariant[] = [];
  $("div.product-form__swatches--colour label.product-form__swatch").each(
    (_: any, el: any) => {
      const colorName = cleanText(
        $(el).find("span.product-form__swatch-value").text(),
      );
      const swatchImg = $(el)
        .find("img.product-form__swatch-image")
        .attr("src");
      const isSoldOut =
        $(el).find("span.product-form__swatch-value--sold-out").length > 0;
      if (colorName) {
        colors.push({
          name: colorName,
          swatch: swatchImg ? "https:" + swatchImg : undefined,
          available: !isSoldOut,
        });
      }
    },
  );

  const sizes: ProductVariant[] = [];
  $("div.product-form__swatches--size label.product-form__swatch").each(
    (_: any, el: any) => {
      const sizeName = cleanText(
        $(el).find("span.product-form__swatch-value").text(),
      );
      const isSoldOut =
        $(el).find("span.product-form__swatch-value--sold-out").length > 0;
      if (sizeName) {
        sizes.push({
          name: sizeName,
          available: !isSoldOut,
        });
      }
    },
  );

  return {
    title: title || "Unknown Product",
    brand,
    price,
    currency,
    images: images.slice(0, 5),
    inStock: true,
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    url,
  };
}

async function extractZaraProduct(
  $: any,
  url: string,
): Promise<ScrapedProduct> {
  let title = cleanText(
    $(
      "h1.product-detail-card-info__title span.product-detail-card-info__name",
    ).text(),
  );
  if (!title)
    title = cleanText(
      $('span[data-qa-qualifier="product-detail-info-name"]').text(),
    );
  const brand = "ZARA";
  const priceText = cleanText(
    $(
      'span[data-qa-qualifier="price-amount-current"] span.money-amount__main',
    ).text(),
  );
  const price = parseFloat(priceText.replace(/[^\d.,]/g, "").replace(/,/g, ""));
  const currency = detectCurrency(priceText, url);

  const images: string[] = [];
  $('picture[data-qa-qualifier="media-image"]').each((_: any, el: any) => {
    const srcset = $(el).find("source").attr("srcset");
    if (srcset) {
      const largest = srcset
        .split(",")
        .map((s: string) => s.trim())
        .pop();
      if (largest) images.push(largest.split(" ")[0]);
    }
  });

  // FIX: Return ProductVariant[]
  const colors: ProductVariant[] = [];
  $(
    "ul.product-detail-color-selector__colors li.product-detail-color-item",
  ).each((_: any, el: any) => {
    const colorName = cleanText($(el).find("span.screen-reader-text").text());
    if (colorName) colors.push({ name: colorName, available: true });
  });

  // FIX: Return ProductVariant[]
  const sizes: ProductVariant[] = [];
  $(
    'div[data-qa-qualifier="size-selector"] button[data-qa-action="size-selector-button"]',
  ).each((_: any, el: any) => {
    const sizeName = cleanText($(el).find("span").text());
    const isDisabled = $(el).attr("disabled") !== undefined;
    if (sizeName && !sizeName.toLowerCase().includes("size guide")) {
      sizes.push({ name: sizeName, available: !isDisabled });
    }
  });

  console.log("[Puppeteer-Zara] Extracted:", {
    title,
    brand,
    colors: colors.length,
    sizes: sizes.length,
  });

  return {
    title: title || "Unknown Product",
    brand,
    price,
    currency,
    images: images.slice(0, 5),
    inStock: true,
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    url,
  };
}

async function extractHMProduct($: any, url: string): Promise<ScrapedProduct> {
  let title = "";
  let brand = "H&M";
  let price = 0;
  let currency = "$";
  let images: string[] = [];

  const jsonSchema = $("script#product-schema").html();
  if (jsonSchema) {
    try {
      const data = JSON.parse(jsonSchema);
      title = data.name || "";
      brand = data.brand?.name || "H&M";
      price = parseFloat(data.offers?.price || "0");
      currency = getCurrencySymbol(data.offers?.priceCurrency || "$");
      if (Array.isArray(data.image)) {
        images = data.image.slice(0, 5);
      }
    } catch (e) {
      console.error("[Puppeteer-HM] Failed to parse JSON schema:", e);
    }
  }

  if (!title) title = cleanText($("h1").text());
  if (price === 0) {
    const priceText = cleanText($('span[translate="no"]').text());
    price = parseFloat(priceText.replace(/[^\d.,]/g, "").replace(/,/g, ""));
    currency = detectCurrency(priceText, url);
  }

  // FIX: Return ProductVariant[]
  const colors: ProductVariant[] = [];
  $('div[data-testid="color-selector-wrapper"] a[role="radio"]').each(
    (_: any, el: any) => {
      const colorName = $(el).attr("title");
      const swatchImg = $(el).find("img").attr("src");
      if (colorName)
        colors.push({
          name: cleanText(colorName),
          swatch: swatchImg,
          available: true,
        });
    },
  );

  // FIX: Return ProductVariant[]
  const sizes: ProductVariant[] = [];
  $(
    'div[data-testid="size-selector"] ul[data-testid="grid"] div[role="radio"]',
  ).each((_: any, el: any) => {
    const sizeName = cleanText($(el).find("div").first().text());
    const ariaLabel = $(el).attr("aria-label") || "";
    const isAvailable = !ariaLabel.toLowerCase().includes("out of stock");
    if (sizeName) sizes.push({ name: sizeName, available: isAvailable });
  });

  console.log("[Puppeteer-HM] Extracted:", {
    title,
    brand,
    colors: colors.length,
    sizes: sizes.length,
  });

  return {
    title: title || "Unknown Product",
    brand,
    price,
    currency,
    images: images.length > 0 ? images : ["https://via.placeholder.com/400"],
    inStock: true,
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    url,
  };
}

async function extractFarfetchProduct(
  $: any,
  url: string,
  page: any,
): Promise<ScrapedProduct> {
  const brand = cleanText(
    $(
      'h1.ltr-i980jo a.ltr-1rkeqir-Body-Heading, a[data-component="DesignerName"]',
    ).text(),
  );
  const title = cleanText(
    $('p[data-testid="product-short-description"]').text(),
  );
  const priceText = cleanText($('p[data-component="PriceLarge"]').text());
  const price = parseFloat(priceText.replace(/[^\d.,]/g, "").replace(/,/g, ""));
  const currency = detectCurrency(priceText, url);

  const images: string[] = [];
  $(
    'div.ltr-1kklpjs button.ltr-1c58b5g img, [data-testid="product-image"] img',
  ).each((_: any, el: any) => {
    const src = $(el).attr("src");
    if (src && src.startsWith("http")) images.push(src);
  });

  // FIX: Return ProductVariant[]
  const colors: ProductVariant[] = [];
  $(
    'div[data-testid="ColorSelector"] button, div[data-component="ColorSelector"] button',
  ).each((_: any, el: any) => {
    const colorName = cleanText(
      $(el).attr("aria-label") || $(el).attr("title") || "",
    );
    if (colorName && !colorName.toLowerCase().includes("select")) {
      colors.push({ name: colorName, available: true });
    }
  });

  // FIX: Return ProductVariant[]
  const sizes: ProductVariant[] = [];
  const sizeSelector = $(
    'div[data-testid="ScaledSizeSelector"], div[data-component="SizeSelector"]',
  );
  if (sizeSelector.length) {
    try {
      console.log("[Puppeteer-Farfetch] Attempting to extract sizes...");
      const dropdownButton = await page.$(
        'div[data-testid="ScaledSizeSelector"] div.ltr-1aksjyr, div[data-component="SizeSelector"] button',
      );
      if (dropdownButton) {
        await dropdownButton.click();
        await page.waitForTimeout(1000);

        const newHtml = await page.content();
        const $new = (await import("cheerio")).load(newHtml);

        $new('[data-testid="SizeOption"], [data-component="SizeOption"]').each(
          (_: any, el: any) => {
            const sizeName = cleanText($new(el).text());
            const isAvailable = $new(el).attr("disabled") === undefined;
            if (sizeName)
              sizes.push({ name: sizeName, available: isAvailable });
          },
        );
        console.log("[Puppeteer-Farfetch] Extracted sizes:", sizes.length);
      } else {
        console.log("[Puppeteer-Farfetch] Size dropdown button not found");
      }
    } catch (e) {
      console.log(
        "[Puppeteer-Farfetch] Could not extract sizes:",
        e instanceof Error ? e.message : "Unknown error",
      );
    }
  } else {
    console.log("[Puppeteer-Farfetch] Size selector not found in page");
  }

  console.log("[Puppeteer-Farfetch] Extracted:", {
    title,
    brand,
    colors: colors.length,
    sizes: sizes.length,
  });

  return {
    title: title || "Unknown Product",
    brand,
    price,
    currency,
    images: images.slice(0, 5),
    inStock: true,
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    url,
  };
}

function detectCurrency(text: string, url?: string): string {
  if (text.includes("£") || text.toUpperCase().includes("GBP")) return "£";
  if (text.includes("€") || text.toUpperCase().includes("EUR")) return "€";
  if (
    text.includes("¥") ||
    text.toUpperCase().includes("JPY") ||
    text.toUpperCase().includes("CNY")
  )
    return "¥";
  if (text.includes("₹") || text.toUpperCase().includes("INR")) return "₹";
  if (text.includes("A$") || text.toUpperCase().includes("AUD")) return "A$";
  if (text.includes("C$") || text.toUpperCase().includes("CAD")) return "C$";

  if (url) {
    const hostname = url.toLowerCase();
    if (
      hostname.includes(".uk") ||
      hostname.includes("/uk/") ||
      hostname.includes("/gb/")
    )
      return "£";
    if (
      hostname.includes(".eu") ||
      hostname.includes("/eu/") ||
      hostname.includes("/de/") ||
      hostname.includes("/fr/") ||
      hostname.includes("/es/") ||
      hostname.includes("/it/")
    )
      return "€";
    if (hostname.includes(".jp") || hostname.includes("/jp/")) return "¥";
    if (hostname.includes(".in") || hostname.includes("/in/")) return "₹";
    if (hostname.includes(".au") || hostname.includes("/au/")) return "A$";
    if (hostname.includes(".ca") || hostname.includes("/ca/")) return "C$";
    if (hostname.includes(".cn") || hostname.includes("/cn/")) return "¥";
  }

  return "$";
}

// FIX: Completely rewritten without any invisible characters
function getCurrencySymbol(code: string): string {
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
  };

  return currencyMap[code.toUpperCase()] || code;
}
