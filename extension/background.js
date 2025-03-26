
// Listen for screenshot requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Message received in extension:', request);
  console.log('Background: Sender details:', sender);
  
  if (request.type === 'TAKE_SCREENSHOT') {
    console.log('Background: Taking screenshot - request details:', JSON.stringify(request));
    try {
      chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
        if (chrome.runtime.lastError) {
          console.error('Background: Screenshot error details:', chrome.runtime.lastError);
          console.error('Background: Screenshot error message:', chrome.runtime.lastError.message);
          sendResponse({
            success: false,
            message: chrome.runtime.lastError.message
          });
          return;
        }
        
        console.log('Background: Screenshot taken successfully, data URL length:', dataUrl ? dataUrl.length : 0);
        console.log('Background: Screenshot data URL prefix:', dataUrl ? dataUrl.substring(0, 50) + '...' : 'none');
        sendResponse({
          success: true,
          imageData: dataUrl
        });
        console.log('Background: Response sent back to content script');
      });
    } catch (error) {
      console.error('Background: Screenshot error caught in try/catch:', error);
      console.error('Background: Error stack:', error.stack);
      sendResponse({
        success: false,
        message: error.message
      });
    }
    return true; // Required to use sendResponse asynchronously
  } else if (request.type === 'GET_EXTENSION_ID') {
    // Send back the extension ID
    console.log('Background: Returning extension ID:', chrome.runtime.id);
    sendResponse({
      success: true,
      id: chrome.runtime.id
    });
    return true;
  }
});

// Enable side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
