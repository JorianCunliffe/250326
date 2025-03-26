// camera-handler.js
// Handles camera stream capture and processing

class CameraHandler {
    constructor() {
      // Camera stream reference
      this.stream = null;
      
      // DOM elements for camera handling
      this.videoElement = null;
      this.canvas = document.createElement('canvas');
      
      // Status tracking
      this.active = false;
      
      // Frame capture interval
      this.frameInterval = null;
      
      // Settings
      this.captureWidth = 640;
      this.captureHeight = 480;
      this.frameRate = 1000; // milliseconds between captures
      this.jpegQuality = 0.8; // 0.0 to 1.0
    }
    
    /**
     * Initialize the camera handler
     * @returns {Promise<CameraHandler>} The handler instance for chaining
     */
    async initialize() {
      // Create video element for camera stream
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.style.display = 'none';
      this.videoElement.muted = true; // Prevent audio feedback
      
      // Add to document body (needed for video to work properly)
      document.body.appendChild(this.videoElement);
      
      return this;
    }
    
    /**
     * Start the camera stream
     * @param {Object} constraints - MediaStream constraints
     * @returns {Promise<boolean>} Success status
     */
    async startStream(constraints = null) {
      try {
        // Stop existing stream if any
        if (this.stream) {
          this.stopStream();
        }
        
        // Default constraints if none provided
        const defaultConstraints = {
          video: {
            width: { ideal: this.captureWidth },
            height: { ideal: this.captureHeight },
            facingMode: 'user' // Front camera by default
          }
        };
        
        // Request camera access
        this.stream = await navigator.mediaDevices.getUserMedia(
          constraints || defaultConstraints
        );
        
        // Connect stream to video element
        this.videoElement.srcObject = this.stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
          this.videoElement.onloadedmetadata = () => {
            resolve();
          };
        });
        
        // Start playing
        await this.videoElement.play();
        
        this.active = true;
        return true;
      } catch (error) {
        console.error('Camera access error:', error);
        this.active = false;
        return false;
      }
    }
    
    /**
     * Stop the camera stream
     */
    stopStream() {
      // Stop frame capture if active
      this.stopFrameCapture();
      
      // Stop all tracks in the stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Clear video source
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }
      
      this.active = false;
    }
    
    /**
     * Capture a single frame from the camera
     * @returns {string|null} Base64 encoded image data or null on failure
     */
    captureFrame() {
      if (!this.active || !this.stream) {
        return null;
      }
      
      try {
        // Get the actual video dimensions
        const { videoWidth, videoHeight } = this.videoElement;
        
        if (videoWidth === 0 || videoHeight === 0) {
          console.warn('Video dimensions not available yet');
          return null;
        }
        
        // Ensure canvas matches video dimensions
        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;
        
        // Draw video frame to canvas
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
        
        // Get base64 image data
        const imageData = this.canvas.toDataURL('image/jpeg', this.jpegQuality);
        
        // Return without the data URL prefix
        return imageData.split(',')[1];
      } catch (error) {
        console.error('Frame capture error:', error);
        return null;
      }
    }
    
    /**
     * Start continuous frame capture
     * @param {Function} callback - Function to call with each frame
     * @param {number} interval - Milliseconds between captures
     */
    startFrameCapture(callback, interval = null) {
      if (!this.active) {
        console.warn('Cannot start frame capture when camera is inactive');
        return false;
      }
      
      // Stop existing interval if any
      this.stopFrameCapture();
      
      // Use provided interval or default
      const captureInterval = interval || this.frameRate;
      
      this.frameInterval = setInterval(() => {
        const frame = this.captureFrame();
        if (frame && callback) {
          callback(frame);
        }
      }, captureInterval);
      
      return true;
    }
    
    /**
     * Stop continuous frame capture
     */
    stopFrameCapture() {
      if (this.frameInterval) {
        clearInterval(this.frameInterval);
        this.frameInterval = null;
      }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
      this.stopStream();
      
      // Remove video element from DOM
      if (this.videoElement && this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
      
      this.videoElement = null;
    }
    
    /**
     * Set camera quality settings
     * @param {Object} settings - Quality settings
     */
    setQuality(settings = {}) {
      if (settings.width) this.captureWidth = settings.width;
      if (settings.height) this.captureHeight = settings.height;
      if (settings.frameRate) this.frameRate = settings.frameRate;
      if (settings.jpegQuality) this.jpegQuality = settings.jpegQuality;
    }
    
    /**
     * Check if camera permissions are granted
     * @returns {Promise<boolean>} Permission status
     */
    async checkPermissions() {
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' });
        return permissions.state === 'granted';
      } catch (error) {
        console.error('Permission check failed:', error);
        return false;
      }
    }
  }
  
  export default CameraHandler;