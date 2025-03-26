// Content script for handling communication between webpage and extension
console.log('Gemini Live extension content script loaded');

// Function to validate extension ID
function validateExtensionId() {
  const extensionId = chrome.runtime.id;
  console.log('Content: VALIDATION - Extension ID:', extensionId);
  
  if (!extensionId) {
    console.error('Content: CRITICAL - Extension ID is undefined or null');
  } else {
    console.log('Content: ✅ Extension ID validated:', extensionId);
    // Immediately announce the extension ID to the page
    window.postMessage({
      type: 'EXTENSION_ID',
      id: extensionId
    }, '*');
  }
  
  return extensionId;
}

// Validate extension ID immediately
const extensionId = validateExtensionId();

// Listen for messages from the page
window.addEventListener('message', function(event) {
  // Make sure the message is from our page
  if (event.source !== window) return;
  
  console.log('Content: Received message from page:', event.data ? event.data.type : 'unknown');

  if (event.data && event.data.type === 'GET_EXTENSION_ID') {
    console.log('Content: Processing GET_EXTENSION_ID request');
    // Re-validate and send the extension ID to the page
    const currentId = validateExtensionId();
    console.log('Content: Sending extension ID back to page:', currentId);
    window.postMessage({
      type: 'EXTENSION_ID',
      id: currentId
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
console.log('Content: Extension loaded, announcing presence...');

// Function to broadcast extension ID
function broadcastExtensionId() {
  const currentId = chrome.runtime.id;
  console.log('Content: Broadcasting extension ID:', currentId);
  
  // Send standard EXTENSION_ID message
  window.postMessage({ 
    type: 'EXTENSION_ID',
    id: currentId
  }, '*');
  
  // Also send the EXTENSION_LOADED message
  window.postMessage({ 
    type: 'EXTENSION_LOADED',
    id: currentId
  }, '*');
  
  return currentId;
}

// Broadcast immediately
const extensionId = broadcastExtensionId();

// Add a periodic check to ensure extension ID is communicated
// Using a more frequent interval initially, then slowing down
let checkCount = 0;
const checkInterval = setInterval(() => {
  checkCount++;
  
  // More frequent initially (every 1s for first 5 checks)
  if (checkCount <= 5) {
    console.log('Content: Frequent check - resending extension ID');
    broadcastExtensionId();
  } 
  // Then every 5s for next 5 checks
  else if (checkCount <= 10) {
    console.log('Content: Regular check - resending extension ID');
    broadcastExtensionId();
  }
  // Then stop
  else {
    clearInterval(checkInterval);
    console.log('Content: Stopped periodic ID checks after multiple attempts');
  }
}, checkCount <= 5 ? 1000 : 5000);

// Verify chrome.runtime is accessible
setTimeout(() => {
  try {
    console.log('Content: Verifying chrome.runtime is accessible');
    if (chrome && chrome.runtime) {
      console.log('Content: ✅ chrome.runtime verified as accessible');
      console.log('Content: Current extension ID:', chrome.runtime.id);
    } else {
      console.error('Content: ❌ chrome.runtime is not accessible');
    }
  } catch (error) {
    console.error('Content: ❌ Error accessing chrome.runtime:', error);
  }
}, 2000);