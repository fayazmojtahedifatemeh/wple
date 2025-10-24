# Wishlist Tracker Chrome Extension

A Chrome extension that allows you to add products to your wishlist with one click from any e-commerce website.

## Features

- **One-Click Addition**: Add products to your wishlist directly from any product page
- **Smart Product Detection**: Automatically extracts product title, price, images, and brand
- **Visual Indicator**: Shows when you're on a product page
- **Multiple E-commerce Support**: Works with Amazon, eBay, Shopify stores, and more
- **Beautiful UI**: Modern glassmorphism design with smooth animations

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension will be added to your browser

## Configuration

1. Click the extension icon in your browser toolbar
2. If this is your first time, you'll see a setup screen
3. Enter your wishlist application URL (e.g., `http://localhost:5000` or your deployed URL)
4. The extension will now work with your wishlist

## Usage

1. Navigate to any product page on supported e-commerce sites
2. You'll see a "Wishlist Tracker Active" indicator in the top-right corner
3. Click the extension icon in your browser toolbar
4. Review the extracted product information
5. Click "Add to Wishlist" to add the item

## Supported Sites

The extension works on most e-commerce websites including:
- Amazon
- eBay
- Shopify stores
- WooCommerce stores
- Custom e-commerce sites
- And many more!

## How It Works

The extension uses intelligent selectors to extract product information from various e-commerce sites. It looks for common patterns in:
- Product titles (h1 tags, product name classes)
- Prices (price classes, data attributes)
- Images (product image selectors)
- Brands (brand name elements)

## Development

To modify the extension:

1. Make your changes to the files in this directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality
- `content.js` - Content script for product extraction
- `background.js` - Background service worker
- `icons/` - Extension icons (you'll need to add these)

## Privacy

This extension:
- Only accesses the current tab when you click the extension icon
- Does not collect or store any personal data
- Only sends product information to your configured wishlist URL
- Does not track your browsing behavior

## Troubleshooting

**Extension not working?**
- Make sure you've configured the wishlist URL correctly
- Check that your wishlist application is running
- Try refreshing the extension in `chrome://extensions/`

**Product information not extracted?**
- The extension works best on standard e-commerce sites
- Some sites may have custom layouts that aren't detected
- You can manually add items through the wishlist application

**Permission errors?**
- Make sure you've granted the extension permission to access the current tab
- Check that the wishlist URL is accessible from your browser
