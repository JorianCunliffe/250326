// Content script for handling communication between webpage and extension
console.log('Gemini Live extension content script loaded');

// Listen for messages from the page
window.addEventListener('message', function(event) {
  // Make sure the message is from our page
  if (event.source !== window) return;
  
  console.log('Content: Received message from page:', event.data);

  if (event.data && event.data.type === 'GET_EXTENSION_ID') {
    console.log('Content: Processing GET_EXTENSION_ID request');
    // Send the extension ID to the page
    const extensionId = chrome.runtime.id;
    console.log('Content: Sending extension ID back to page:', extensionId);
    window.postMessage({
      type: 'EXTENSION_ID',
      id: extensionId
    }, '*');
  } else if (event.data && event.data.type === 'TAKE_SCREENSHOT') {
    console.log('Content: Processing TAKE_SCREENSHOT request');
    // Forward screenshot request to background script
    chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' }, function(response) {
      console.log('Content: Received response from background script:', response);
      // Forward the response back to the page
      window.postMessage({
        type: 'SCREENSHOT_RESULT',
        ...response
      }, '*');
      console.log('Content: Forwarded screenshot result to page');
    });
  }
});

// Let the page know the extension is loaded
const extensionId = chrome.runtime.id;
console.log('Content: Extension loaded with ID:', extensionId);
window.postMessage({ 
  type: 'EXTENSION_LOADED',
  id: extensionId
}, '*');