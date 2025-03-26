// screenshot-handler.js
// Handles taking and processing screenshots

class ScreenshotHandler {
    constructor() {
      // Rate limiting
      this.lastSnapshotTime = 0;
      this.cooldownTime = 1000; // 1 second cooldown
      
      // Preview element reference (optional)
      this.previewElement = null;
      
      // Success/error message callbacks
      this.onSuccess = null;
      this.onError = null;
    }
    
    /**
     * Initialize the screenshot handler
     * @param {Object} options - Configuration options
     * @returns {ScreenshotHandler} The handler instance for chaining
     */
    initialize(options = {}) {
      // Set preview element if provided
      if (options.previewElement) {
        this.previewElement = options.previewElement;
      }
      
      // Set callbacks if provided
      if (options.onSuccess) this.onSuccess = options.onSuccess;
      if (options.onError) this.onError = options.onError;
      
      // Set cooldown time if provided
      if (options.cooldownTime) this.cooldownTime = options.cooldownTime;
      
      return this;
    }
    
    /**
     * Take a screenshot of the current tab
     * @returns {Promise<Object>} Result object with success status and data
     */
    async takeSnapshot() {
      try {
        // Rate limiting
        const now = Date.now();
        if (now - this.lastSnapshotTime < this.cooldownTime) {
          const error = 'Too many requests. Please wait.';
          if (this.onError) this.onError(error);
          return { success: false, message: error };
        }
        
        this.lastSnapshotTime = now;
        
        // Capture screenshot
        const result = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
        
        // Store in Chrome storage for later retrieval
        await chrome.storage.local.set({ 'latestSnapshot': result });
        
        // Update preview if available
        this.updatePreview(result);
        
        // Show success message
        if (this.onSuccess) this.onSuccess('Screenshot captured');
        
        // Get base64 data without the prefix
        const base64Data = result.split(',')[1];
        
        return { 
          success: true, 
          data: base64Data,
          fullData: result
        };
      } catch (error) {
        console.error('Screenshot error:', error);
        
        if (this.onError) this.onError('Failed to capture screenshot: ' + error.message);
        
        return { 
          success: false, 
          message: 'Failed to capture screenshot: ' + error.message 
        };
      }
    }
    
    /**
     * Get the most recent screenshot from storage
     * @returns {Promise<string|null>} The screenshot data or null if not available
     */
    async getLatestSnapshot() {
      try {
        const result = await chrome.storage.local.get('latestSnapshot');
        return result.latestSnapshot || null;
      } catch (error) {
        console.error('Failed to retrieve snapshot:', error);
        if (this.onError) this.onError('Failed to retrieve snapshot: ' + error.message);
        return null;
      }
    }
    
    /**
     * Update the preview element with screenshot data
     * @param {string} imageData - The screenshot data
     */
    updatePreview(imageData) {
      if (!this.previewElement) return;
      
      this.previewElement.src = imageData;
      this.previewElement.style.display = 'block';
    }
    
    /**
     * Load the latest snapshot into the preview
     * @returns {Promise<boolean>} Success status
     */
    async loadLatestIntoPreview() {
      if (!this.previewElement) return false;
      
      const snapshot = await this.getLatestSnapshot();
      if (snapshot) {
        this.updatePreview(snapshot);
        return true;
      }
      return false;
    }
    
    /**
     * Clear stored screenshots
     * @returns {Promise<boolean>} Success status
     */
    async clearStoredSnapshots() {
      try {
        await chrome.storage.local.remove('latestSnapshot');
        if (this.previewElement) {
          this.previewElement.src = '';
          this.previewElement.style.display = 'none';
        }
        return true;
      } catch (error) {
        console.error('Failed to clear snapshots:', error);
        if (this.onError) this.onError('Failed to clear snapshots: ' + error.message);
        return false;
      }
    }
    
    /**
     * Set the cooldown time between screenshots
     * @param {number} milliseconds - Cooldown time in milliseconds
     */
    setCooldownTime(milliseconds) {
      this.cooldownTime = milliseconds;
    }
  }
  
  export default ScreenshotHandler;
class ScreenshotHandler {
  constructor() {
    this.lastSnapshotTime = 0;
    this.cooldownTime = 1000; // 1 second cooldown
    
    // Success/error message callbacks
    this.onSuccess = null;
    this.onError = null;
  }
  
  /**
   * Initialize the screenshot handler
   * @param {Object} options - Configuration options
   * @returns {ScreenshotHandler} The handler instance for chaining
   */
  initialize(options = {}) {
    // Set callbacks if provided
    if (options.onSuccess) this.onSuccess = options.onSuccess;
    if (options.onError) this.onError = options.onError;
    
    // Set cooldown time if provided
    if (options.cooldownTime) this.cooldownTime = options.cooldownTime;
    
    return this;
  }
  
  /**
   * Take a screenshot of the current tab
   * @returns {Promise<Object>} Result object with success status and data
   */
  async takeSnapshot() {
    try {
      const now = Date.now();
      if (now - this.lastSnapshotTime < this.cooldownTime) {
        const error = 'Too many requests. Please wait.';
        if (this.onError) this.onError(error);
        return { success: false, message: error };
      }
      
      this.lastSnapshotTime = now;
      const result = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
      
      // Store in Chrome storage
      await chrome.storage.local.set({ 'latestSnapshot': result });
      
      // Get base64 data without the prefix
      const base64Data = result.split(',')[1];
      
      if (this.onSuccess) this.onSuccess('Screenshot captured');
      
      return { 
        success: true, 
        data: base64Data,
        fullData: result
      };
    } catch (error) {
      console.error('Screenshot error:', error);
      
      if (this.onError) this.onError('Failed to capture screenshot: ' + error.message);
      
      return { 
        success: false, 
        message: 'Failed to capture screenshot: ' + error.message 
      };
    }
  }
  
  /**
   * Get the most recent screenshot from storage
   * @returns {Promise<string|null>} The screenshot data or null if not available
   */
  async getLatestSnapshot() {
    try {
      const result = await chrome.storage.local.get('latestSnapshot');
      return result.latestSnapshot || null;
    } catch (error) {
      console.error('Failed to retrieve snapshot:', error);
      if (this.onError) this.onError('Failed to retrieve snapshot: ' + error.message);
      return null;
    }
  }
  
  /**
   * Clear stored screenshots
   * @returns {Promise<boolean>} Success status
   */
  async clearStoredSnapshots() {
    try {
      await chrome.storage.local.remove('latestSnapshot');
      return true;
    } catch (error) {
      console.error('Failed to clear snapshots:', error);
      if (this.onError) this.onError('Failed to clear snapshots: ' + error.message);
      return false;
    }
  }
  
  /**
   * Set the cooldown time between screenshots
   * @param {number} milliseconds - Cooldown time in milliseconds
   */
  setCooldownTime(milliseconds) {
    this.cooldownTime = milliseconds;
  }
}

export default ScreenshotHandler;
