// message-manager.js
// Handles communication between the extension and the iframe

class MessageManager {
    constructor(targetOrigin) {
      // The origin of the iframe content
      this.targetOrigin = targetOrigin;
      
      // Event handlers for different message types
      this.handlers = {};
      
      // Reference to the iframe element
      this.iframe = null;
      
      // Message types
      this.MESSAGE_TYPES = {
        CONFIG_TRANSFER: 'CONFIG_TRANSFER',
        REQUEST_CONFIG: 'REQUEST_CONFIG',
        MODE_CHANGE: 'MODE_CHANGE',
        SCREENSHOT_REQUEST: 'REQUEST_SCREENSHOT',
        SCREENSHOT_RESPONSE: 'SCREENSHOT_RESPONSE',
        CAMERA_FRAME: 'CAMERA_FRAME'
      };
    }
    
    /**
     * Initialize the message manager with an iframe reference
     * @param {HTMLIFrameElement} iframeElement - The iframe element to communicate with
     * @returns {MessageManager} The message manager instance for chaining
     */
    initialize(iframeElement) {
      this.iframe = iframeElement;
      
      // Set up global message listener
      window.addEventListener('message', this.handleMessage.bind(this));
      
      return this;
    }
    
    /**
     * Internal message handler
     * @param {MessageEvent} event - The message event
     */
    handleMessage(event) {
      // Security check: Verify the sender is from our trusted origin
      if (event.origin !== this.targetOrigin) {
        // For development, we can be a bit more lenient
        if (!event.origin.startsWith('http://localhost') && 
            !event.origin.startsWith('https://localhost') &&
            !event.origin.includes('replit.app')) {
          console.warn(`Message from untrusted origin: ${event.origin}`);
          return;
        }
      }
      
      // Extract message data
      const { type, data } = event.data;
      
      // Check if we have a handler for this message type
      if (type && this.handlers[type]) {
        try {
          this.handlers[type](data);
        } catch (error) {
          console.error(`Error in handler for message type ${type}:`, error);
        }
      } else if (type === this.MESSAGE_TYPES.REQUEST_CONFIG) {
        // Special case: automatically respond to config requests
        this.handleConfigRequest();
      }
    }
    
    /**
     * Special handler for config requests from the iframe
     */
    handleConfigRequest() {
      // Dispatch a custom event that the main application can listen for
      window.dispatchEvent(new CustomEvent('configRequested'));
    }
    
    /**
     * Register a message handler for a specific message type
     * @param {string} messageType - The type of message to handle
     * @param {Function} callback - The handler function
     */
    registerHandler(messageType, callback) {
      this.handlers[messageType] = callback;
    }
    
    /**
     * Send a message to the iframe
     * @param {string} type - The message type
     * @param {any} data - The message data
     * @returns {boolean} Success status
     */
    sendMessage(type, data) {
      if (!this.iframe || !this.iframe.contentWindow) {
        console.error('Iframe not initialized or not available');
        return false;
      }
      
      try {
        this.iframe.contentWindow.postMessage({
          type,
          data
        }, this.targetOrigin);
        
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    
    /**
     * Send configuration data to the iframe
     * @param {Object} config - The configuration object
     * @returns {boolean} Success status
     */
    sendConfig(config) {
      return this.sendMessage(this.MESSAGE_TYPES.CONFIG_TRANSFER, config);
    }
    
    /**
     * Send mode change notification to the iframe
     * @param {string} mode - The new mode ('screenshot' or 'camera')
     * @returns {boolean} Success status
     */
    sendModeChange(mode) {
      return this.sendMessage(this.MESSAGE_TYPES.MODE_CHANGE, { mode });
    }
    
    /**
     * Send a camera frame to the iframe
     * @param {string} frameData - Base64 encoded image data
     * @returns {boolean} Success status
     */
    sendCameraFrame(frameData) {
      return this.sendMessage(this.MESSAGE_TYPES.CAMERA_FRAME, frameData);
    }
    
    /**
     * Clean up event listeners
     */
    cleanup() {
      window.removeEventListener('message', this.handleMessage.bind(this));
    }
  }
  
  export default MessageManager;