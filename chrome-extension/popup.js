// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');
  const setup = document.getElementById('setup');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const success = document.getElementById('success');
  const productTitle = document.getElementById('product-title');
  const productPrice = document.getElementById('product-price');
  const addBtn = document.getElementById('add-btn');
  const viewBtn = document.getElementById('view-btn');
  const settingsLink = document.getElementById('settings-link');

  // Check if extension is configured
  const config = await chrome.storage.sync.get(['wishlistUrl']);
  
  if (!config.wishlistUrl) {
    setup.style.display = 'block';
    settingsLink.onclick = () => {
      chrome.runtime.openOptionsPage();
    };
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) {
    showError('No active tab found');
    return;
  }

  // Extract product information from the page
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractProductInfo
    });

    const productInfo = results[0]?.result;
    
    if (productInfo) {
      productTitle.textContent = productInfo.title || 'Unknown Product';
      productPrice.textContent = productInfo.price || '$0.00';
      content.style.display = 'block';
    } else {
      showError('Could not extract product information from this page');
    }
  } catch (err) {
    showError('Error extracting product information');
    console.error(err);
  }

  // Add to wishlist button
  addBtn.addEventListener('click', async () => {
    try {
      loading.style.display = 'block';
      content.style.display = 'none';
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractProductInfo
      });

      const productInfo = results[0]?.result;
      
      if (!productInfo) {
        throw new Error('Could not extract product information');
      }

      // Send to wishlist API
      const response = await fetch(`${config.wishlistUrl}/api/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: productInfo.title,
          price: parseFloat(productInfo.price?.replace(/[^0-9.]/g, '') || '0'),
          currency: productInfo.currency || '$',
          url: tab.url,
          brand: productInfo.brand,
          images: productInfo.images || [],
          inStock: true,
          colors: [],
          sizes: [],
        }),
      });

      if (response.ok) {
        showSuccess('Item added to wishlist!');
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        throw new Error('Failed to add item to wishlist');
      }
    } catch (err) {
      showError(err.message || 'Failed to add item to wishlist');
      loading.style.display = 'none';
      content.style.display = 'block';
    }
  });

  // View wishlist button
  viewBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: config.wishlistUrl });
  });
});

function extractProductInfo() {
  // Common selectors for product information
  const titleSelectors = [
    'h1[data-testid="product-title"]',
    'h1.product-title',
    'h1[class*="title"]',
    'h1[class*="name"]',
    '.product-name h1',
    '.product-title',
    'h1',
    '[data-testid="product-name"]',
    '.product-info h1'
  ];

  const priceSelectors = [
    '[data-testid="price"]',
    '.price',
    '.product-price',
    '[class*="price"]',
    '.price-current',
    '.price-value',
    '[data-testid="current-price"]'
  ];

  const imageSelectors = [
    '[data-testid="product-image"]',
    '.product-image img',
    '.product-photo img',
    '.main-image img',
    'img[alt*="product"]',
    '.product-gallery img'
  ];

  const brandSelectors = [
    '[data-testid="brand"]',
    '.brand',
    '.product-brand',
    '[class*="brand"]'
  ];

  function findElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  const titleElement = findElement(titleSelectors);
  const priceElement = findElement(priceSelectors);
  const imageElement = findElement(imageSelectors);
  const brandElement = findElement(brandSelectors);

  const title = titleElement?.textContent?.trim() || document.title;
  const price = priceElement?.textContent?.trim() || '';
  const brand = brandElement?.textContent?.trim() || '';
  const images = imageElement ? [imageElement.src] : [];

  // Extract currency symbol
  const currencyMatch = price.match(/[^\d\s.,]/);
  const currency = currencyMatch ? currencyMatch[0] : '$';

  return {
    title,
    price,
    currency,
    brand,
    images
  };
}

function showError(message) {
  const error = document.getElementById('error');
  error.textContent = message;
  error.style.display = 'block';
  setTimeout(() => {
    error.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  const success = document.getElementById('success');
  success.textContent = message;
  success.style.display = 'block';
  setTimeout(() => {
    success.style.display = 'none';
  }, 3000);
}
