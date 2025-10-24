// content.js
// This script runs on all pages to help extract product information

(function() {
  'use strict';

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getProductInfo') {
      const productInfo = extractProductInfo();
      sendResponse(productInfo);
    }
  });

  function extractProductInfo() {
    // Enhanced product extraction for various e-commerce sites
    const selectors = {
      title: [
        'h1[data-testid="product-title"]',
        'h1.product-title',
        'h1[class*="title"]',
        'h1[class*="name"]',
        '.product-name h1',
        '.product-title',
        'h1',
        '[data-testid="product-name"]',
        '.product-info h1',
        '#productTitle',
        '.product-name',
        '.item-title'
      ],
      price: [
        '[data-testid="price"]',
        '.price',
        '.product-price',
        '[class*="price"]',
        '.price-current',
        '.price-value',
        '[data-testid="current-price"]',
        '.price-now',
        '.sale-price',
        '.current-price',
        '#priceblock_dealprice',
        '#priceblock_ourprice',
        '.a-price-whole'
      ],
      image: [
        '[data-testid="product-image"]',
        '.product-image img',
        '.product-photo img',
        '.main-image img',
        'img[alt*="product"]',
        '.product-gallery img',
        '#landingImage',
        '.a-dynamic-image',
        '.product-image-main img'
      ],
      brand: [
        '[data-testid="brand"]',
        '.brand',
        '.product-brand',
        '[class*="brand"]',
        '.brand-name',
        '.manufacturer'
      ]
    };

    function findElement(selectors) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
      return null;
    }

    const titleElement = findElement(selectors.title);
    const priceElement = findElement(selectors.price);
    const imageElement = findElement(selectors.image);
    const brandElement = findElement(selectors.brand);

    const title = titleElement?.textContent?.trim() || document.title;
    const price = priceElement?.textContent?.trim() || '';
    const brand = brandElement?.textContent?.trim() || '';
    const images = imageElement ? [imageElement.src] : [];

    // Extract currency symbol
    const currencyMatch = price.match(/[^\d\s.,]/);
    const currency = currencyMatch ? currencyMatch[0] : '$';

    // Clean price (remove currency symbols and extract number)
    const cleanPrice = price.replace(/[^\d.,]/g, '').replace(',', '');
    const numericPrice = parseFloat(cleanPrice) || 0;

    return {
      title,
      price: numericPrice > 0 ? `${currency}${numericPrice.toFixed(2)}` : '',
      currency,
      brand,
      images,
      url: window.location.href
    };
  }

  // Add visual indicator when extension is active
  function addExtensionIndicator() {
    if (document.getElementById('wishlist-tracker-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'wishlist-tracker-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    indicator.textContent = 'Wishlist Tracker Active';
    indicator.title = 'Click to add this product to your wishlist';
    
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    document.body.appendChild(indicator);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }, 5000);
  }

  // Only show indicator on product pages
  const productKeywords = ['product', 'item', 'buy', 'shop', 'store'];
  const isProductPage = productKeywords.some(keyword => 
    window.location.href.toLowerCase().includes(keyword) ||
    document.title.toLowerCase().includes(keyword)
  );

  if (isProductPage) {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addExtensionIndicator);
    } else {
      addExtensionIndicator();
    }
  }
})();
