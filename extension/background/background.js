
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TAKE_SCREENSHOT') {
    // Return dummy image data immediately
    // This will be a small red square as a test image
    const dummyImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
    sendResponse({ imageData: dummyImageData });
    return true;
  }
});

// Enable side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
