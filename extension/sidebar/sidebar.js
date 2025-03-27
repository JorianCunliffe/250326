// sidebar.js - Refactored
// Configuration Manager
class ConfigManager {
  constructor() {
    this.config = {
      name: '',
      birthdate: null,
      personalInfo: '',
      prompts: [],
      browserUuid: crypto.randomUUID()
    };
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load from storage or set defaults
      const stored = await chrome.storage.local.get('trilliumConfig');
      if (stored.trilliumConfig) {
        this.config = stored.trilliumConfig;
      } else {
        // First-time setup - create a new UUID
        this.config.browserUuid = crypto.randomUUID();
        await this.saveConfig(this.config);
      }
      this.initialized = true;
      return this.config;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      return this.config;
    }
  }

  async saveConfig(updates) {
    try {
      this.config = { ...this.config, ...updates };
      await chrome.storage.local.set({ 'trilliumConfig': this.config });
      return this.config;
    } catch (error) {
      console.error('Failed to save config:', error);
      return this.config;
    }
  }

  getConfig() {
    return this.config;
  }
}

// Input Handlers
class ScreenshotHandler {
  constructor() {
    this.lastSnapshotTime = 0;
    this.cooldownTime = 1000; // 1 second cooldown
    this.onSuccess = null;
    this.onError = null;
  }

  initialize(options = {}) {
    if (options.onSuccess) this.onSuccess = options.onSuccess;
    if (options.onError) this.onError = options.onError;
    if (options.cooldownTime) this.cooldownTime = options.cooldownTime;
    return this;
  }

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

  setCooldownTime(milliseconds) {
    this.cooldownTime = milliseconds;
  }
}

class CameraHandler {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvas = document.createElement('canvas');
    this.active = false;
    this.frameInterval = null;
  }

  async initialize() {
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);
    return this;
  }

  async startStream() {
    try {
      if (this.stream) {
        this.stopStream();
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });

      this.videoElement.srcObject = this.stream;
      this.active = true;
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      this.active = false;
      return false;
    }
  }

  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    this.active = false;
  }

  captureFrame() {
    if (!this.active || !this.stream) {
      return null;
    }

    try {
      const { videoWidth, videoHeight } = this.videoElement;

      // Ensure canvas matches video dimensions
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;

      // Draw video frame to canvas
      const ctx = this.canvas.getContext('2d');
      ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);

      // Get base64 image data
      const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
      return imageData.split(',')[1]; // Remove data URL prefix
    } catch (error) {
      console.error('Frame capture error:', error);
      return null;
    }
  }

  startFrameCapture(callback, interval = 1000) {
    if (this.frameInterval) {
      this.stopFrameCapture();
    }

    this.frameInterval = setInterval(() => {
      const frame = this.captureFrame();
      if (frame && callback) {
        callback(frame);
      }
    }, interval);
  }

  stopFrameCapture() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
  }

  cleanup() {
    this.stopStream();
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
  }
}

// Communication Manager
class MessageManager {
  constructor(targetOrigin) {
    this.targetOrigin = targetOrigin;
    this.handlers = {};
    this.iframe = null;
  }

  initialize(iframeElement) {
    this.iframe = iframeElement;

    window.addEventListener('message', (event) => {
      if (event.origin !== this.targetOrigin) return;

      const { type, data } = event.data;
      if (type && this.handlers[type]) {
        this.handlers[type](data);
      }
    });

    return this;
  }

  registerHandler(messageType, callback) {
    this.handlers[messageType] = callback;
  }

  sendMessage(type, data) {
    if (!this.iframe) {
      console.error('Iframe not initialized');
      return false;
    }

    this.iframe.contentWindow.postMessage({
      type,
      data
    }, this.targetOrigin);

    return true;
  }
}

// Main Application
class TrilliumExtension {
  constructor() {
    // Constants
    this.TARGET_ORIGIN = 'https://trillium-gemini-250317.replit.app';
    this.MESSAGE_TYPES = {
      CONFIG_TRANSFER: 'CONFIG_TRANSFER',
      MODE_CHANGE: 'MODE_CHANGE',
      SCREENSHOT_REQUEST: 'REQUEST_SCREENSHOT',
      SCREENSHOT_RESPONSE: 'SCREENSHOT_RESPONSE',
      CAMERA_FRAME: 'CAMERA_FRAME',
      GET_EXTENSION_ID: 'GET_EXTENSION_ID',
      EXTENSION_ID: 'EXTENSION_ID'
    };

    // Modules
    this.configManager = new ConfigManager();
    this.screenshotHandler = new ScreenshotHandler();
    this.cameraHandler = null; // Initialized on demand
    this.messageManager = new MessageManager(this.TARGET_ORIGIN);
    this.setupForm = null; // Will be initialized after DOM is ready

    // State
    this.currentMode = 'screenshot'; // 'screenshot' or 'camera'
    this.initialized = false;
  }

  async initialize() {
    try {
      // Get elements
      this.iframeElement = document.getElementById('appFrame');
      this.previewElement = document.getElementById('snapshotPreview');
      this.toggleContainer = document.getElementById('mode-toggle-container');

      if (!this.iframeElement) {
        throw new Error('Required elements not found');
      }

      // Init modules
      await this.configManager.initialize();
      this.messageManager.initialize(this.iframeElement);

      // Initialize setup form
      this.setupForm = new SetupForm(this.configManager);
      this.setupForm.initialize();

      // Listen for config updates from the setup form
      window.addEventListener('configUpdated', (event) => {
        // Send updated config to the iframe
        this.sendConfig();
      });

      // Listen for config requests from the iframe
      window.addEventListener('configRequested', () => {
        // Send current config to the iframe
        this.sendConfig();
      });

      // Register message handlers
      this.registerMessageHandlers();

      // Create UI elements
      this.createToggleUI();

      // Load previous snapshot if available
      const latestSnapshot = await this.screenshotHandler.getLatestSnapshot();
      if (latestSnapshot) {
        this.previewElement.src = latestSnapshot;
        this.previewElement.style.display = 'block';
      }

      this.initialized = true;

      // Send initial config to iframe once it loads
      this.iframeElement.addEventListener('load', () => {
        this.sendConfig();
      });

      return true;
    } catch (error) {
      console.error('Initialization error:', error);
      return false;
    }
  }

  createToggleUI() {
    const toggleHTML = `
      <div class="toggle-control">
        <span class="toggle-label">Mode: </span>
        <label class="switch">
          <input type="checkbox" id="mode-switch">
          <span class="slider round"></span>
        </label>
        <span id="mode-label">Screenshot</span>
      </div>
    `;

    this.toggleContainer.innerHTML = toggleHTML;

    // Add event listener
    document.getElementById('mode-switch').addEventListener('change', (e) => {
      this.setMode(e.target.checked ? 'camera' : 'screenshot');
    });
  }

  async setMode(newMode) {
    if (newMode === this.currentMode) return;

    // Update UI
    document.getElementById('mode-label').textContent = 
      newMode.charAt(0).toUpperCase() + newMode.slice(1);

    // Teardown previous mode
    if (this.currentMode === 'camera' && this.cameraHandler) {
      this.cameraHandler.stopStream();
    }

    // Setup new mode
    if (newMode === 'camera') {
      // Initialize camera handler if needed
      if (!this.cameraHandler) {
        this.cameraHandler = new CameraHandler();
        await this.cameraHandler.initialize();
      }

      const success = await this.cameraHandler.startStream();
      if (!success) {
        // Fallback to screenshot mode
        document.getElementById('mode-switch').checked = false;
        document.getElementById('mode-label').textContent = 'Screenshot';
        this.showError('Could not access camera. Please check permissions.');
        return;
      }

      // Start sending frames when camera is active
      this.cameraHandler.startFrameCapture((frameData) => {
        this.messageManager.sendMessage(this.MESSAGE_TYPES.CAMERA_FRAME, frameData);
      }, 1000); // Send frame every second
    }

    // Update state
    this.currentMode = newMode;

    // Inform iframe about mode change
    this.messageManager.sendMessage(this.MESSAGE_TYPES.MODE_CHANGE, {
      mode: this.currentMode
    });
  }

  registerMessageHandlers() {
    // Handle GET_EXTENSION_ID message
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GET_EXTENSION_ID') {
        console.log('Sidebar: Received request for extension ID');
        // Send back the extension ID
        window.postMessage({
          type: 'EXTENSION_ID',
          id: chrome.runtime.id
        }, '*');
        console.log('Sidebar: Sent extension ID:', chrome.runtime.id);
      }
    });

    this.messageManager.registerHandler(
      this.MESSAGE_TYPES.SCREENSHOT_REQUEST,
      async () => {
        if (this.currentMode !== 'screenshot') return;

        const result = await this.screenshotHandler.takeSnapshot();
        if (result.success) {
          // Update preview
          this.previewElement.src = result.fullData;
          this.previewElement.style.display = 'block';

          // Show success message
          this.showSuccess('Snapshot saved!');

          // Send response
          this.messageManager.sendMessage(
            this.MESSAGE_TYPES.SCREENSHOT_RESPONSE,
            result.data
          );
        } else {
          this.showError(result.message);
        }
      }
    );
  }

  sendConfig() {
    const config = this.configManager.getConfig();
    this.messageManager.sendMessage(this.MESSAGE_TYPES.CONFIG_TRANSFER, config);
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 3000);
    }
  }

  showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 2000);
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new TrilliumExtension();
  await app.initialize();
});