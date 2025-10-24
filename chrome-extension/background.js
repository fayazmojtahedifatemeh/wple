// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Wishlist Tracker extension installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProductInfo') {
    // This could be used for more complex product extraction
    sendResponse({ success: true });
  }
});

// Set up context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToWishlist',
    title: 'Add to Wishlist',
    contexts: ['page', 'selection', 'link', 'image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToWishlist') {
    // Open popup or send message to content script
    chrome.action.openPopup();
  }
});
