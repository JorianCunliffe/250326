// Content script for handling communication between webpage and extension
console.log('Gemini Live extension content script loaded');

const extensionId = chrome.runtime.id;
console.log('Content: My Extension ID:', extensionId);

// Announce presence ONCE on load
window.postMessage({ type: 'EXTENSION_LOADED', id: extensionId }, '*');
console.log('Content: Sent initial EXTENSION_LOADED');

// Listen for messages from the page
window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || !event.data.type) return;

    console.log('Content: Received message from page:', event.data.type);

    switch (event.data.type) {
        case 'GET_EXTENSION_ID':
            console.log('Content: Processing GET_EXTENSION_ID request');
            window.postMessage({ type: 'EXTENSION_ID', id: extensionId }, '*');
            console.log('Content: Sent EXTENSION_ID response');
            break;

        case 'TAKE_SCREENSHOT':
            console.log('Content: Processing TAKE_SCREENSHOT request');
            chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' }, function(response) {
                console.log('Content: Received response from background script:', response);
                // Forward the response back to the page
                window.postMessage({
                    type: 'SCREENSHOT_RESULT',
                    success: response.success,
                    imageData: response.success ? response.imageData : null, // Pass the dataUrl
                    message: response.message || null
                }, '*');
                console.log('Content: Forwarded screenshot result to page');
            });
            break;
    }
});