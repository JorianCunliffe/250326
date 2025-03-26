// screen.js - Handles screen capture functionality - 250326 - 14.52

export class ScreenManager {
    /**
     * @param {Object} config
     * @param {number} config.width - Target width for resizing captured images
     * @param {number} config.quality - JPEG quality (0-1)
     * @param {Function} [config.onStop] - Callback when screen capture stops
     */
    constructor(config) {
        this.config = {
            width: config.width || 1280,
            quality: config.quality || 0.8,
            onStop: config.onStop || (() => {}),
        };

        this.captureInterval = null;
        this.isInitialized = false;
        this.extensionId = null; // Will store the extension ID
        this.messageReceived = false; // Flag to track if we've received any messages

        this.handleScreenCapture = this.handleScreenCapture.bind(this);

        // Set up message listener for communication with extension
        console.log("Screen: Setting up message listener for extension communication");
        
        window.addEventListener("message", (event) => {
            this.messageReceived = true;
            console.log("Screen: 📨 Received message event:", event.data ? event.data.type : "unknown type");
            
            if (event.data && event.data.type === "EXTENSION_ID") {
                this.extensionId = event.data.id;
                console.log("Screen: ✅ Received extension ID:", this.extensionId);
                
                // Validate the extension ID
                if (!this.extensionId || this.extensionId === "null" || this.extensionId === "undefined") {
                    console.error("Screen: ❌ Invalid extension ID received:", this.extensionId);
                } else {
                    // Store in sessionStorage for persistence
                    try {
                        sessionStorage.setItem('extensionId', this.extensionId);
                        console.log("Screen: Stored extension ID in sessionStorage");
                        
                        // Check and report if extension is available after getting ID
                        this.checkExtensionAvailability();
                    } catch (e) {
                        console.error("Screen: Failed to store in sessionStorage:", e);
                    }
                }
            } else if (event.data && event.data.type === "EXTENSION_LOADED") {
                console.log("Screen: ✅ Extension loaded message received with ID:", event.data.id);
                this.extensionId = event.data.id;
                
                // Validate the extension ID
                if (!this.extensionId || this.extensionId === "null" || this.extensionId === "undefined") {
                    console.error("Screen: ❌ Invalid extension ID received from EXTENSION_LOADED:", this.extensionId);
                } else {
                    // Store in sessionStorage for persistence
                    try {
                        sessionStorage.setItem('extensionId', this.extensionId);
                        console.log("Screen: Stored extension ID from EXTENSION_LOADED in sessionStorage");
                        
                        // Check and report if extension is available after getting ID
                        this.checkExtensionAvailability();
                    } catch (e) {
                        console.error("Screen: Failed to store in sessionStorage:", e);
                    }
                }
            } else if (event.data && event.data.type === "SCREENSHOT_RESULT") {
                console.log("Screen: Screenshot result received");
                this.handleScreenCapture(event.data);
            }
        });
        
        // Try to get extension ID from sessionStorage if available
        try {
            const storedId = sessionStorage.getItem('extensionId');
            if (storedId) {
                console.log("Screen: Retrieved extension ID from sessionStorage:", storedId);
                this.extensionId = storedId;
            }
        } catch (e) {
            console.error("Screen: Failed to retrieve from sessionStorage:", e);
        }
        
        // Check if Chrome runtime is available (extension is loaded)
        this.checkExtensionAvailability();
        
        // Request extension ID explicitly
        console.log("Screen: Explicitly requesting extension ID");
        window.postMessage({ type: "GET_EXTENSION_ID" }, "*");
        
        // Set a delayed check to validate communication
        setTimeout(() => this.validateCommunication(), 3000);
    }
    
    /**
     * Check and log if the extension is available
     */
    checkExtensionAvailability() {
        // Verify if chrome and runtime exist
        this.extensionAvailable = typeof chrome !== 'undefined' && chrome.runtime;
        
        // Log detailed extension detection results
        console.log("Screen: Chrome object available:", typeof chrome !== 'undefined');
        console.log("Screen: Chrome runtime available:", this.extensionAvailable);
        console.log("Screen: Current extension ID:", this.extensionId);
        
        if (!this.extensionAvailable) {
            console.warn("Screen: ⚠️ Chrome extension runtime not available - screenshot functionality will not work");
        } else if (!this.extensionId) {
            console.warn("Screen: ⚠️ Extension ID not available despite runtime being available");
        } else {
            console.log("Screen: ✅ Extension appears to be properly configured");
        }
    }
    
    /**
     * Validate if we're receiving communication from the extension
     */
    validateCommunication() {
        if (!this.messageReceived) {
            console.error("Screen: ❌ No messages received from extension after timeout");
            console.log("Screen: Extension status - ID:", this.extensionId, "Available:", this.extensionAvailable);
            
            // Attempt to re-request the extension ID
            console.log("Screen: Re-requesting extension ID after timeout");
            window.postMessage({ type: "GET_EXTENSION_ID" }, "*");
        } else {
            console.log("Screen: ✅ Communication with extension confirmed");
        }
    }
    
    /**
     * Check if the browser extension is installed and available
     * @returns {boolean} True if extension is available
     */
    isExtensionAvailable() {
        return this.extensionAvailable && this.extensionId !== null;
    }

    // Fallback image functionality removed for simplicity

    handleScreenCapture(response) {
        console.log("Screen: Received capture response:", response);

        if (!response || !response.success) {
            console.error(
                "Screen: Invalid screen capture response:",
                response.message || "Unknown error",
            );
            return;
        }

        const preview = document.getElementById("screenPreview");
        if (preview) {
            console.log("Screen: Setting up preview");
            const img = document.createElement("img");

            // Ensure we have a proper data URL
            // If fullData is provided and it's a complete data URL, use it directly
            if (
                response.fullData &&
                response.fullData.startsWith("data:image")
            ) {
                img.src = response.fullData;
            }
            // If we have data (base64 without prefix), add the prefix
            else if (response.data) {
                img.src = "data:image/png;base64," + response.data;
            }
            // If no valid image data, just display empty preview
            else {
                console.warn("Screen: No valid image data");
                preview.innerHTML = "";
                preview.style.display = "none";
                return;
            }

            img.style.width = "100%";
            img.style.height = "auto";
            preview.innerHTML = "";
            preview.appendChild(img);
            // Make sure the preview is visible
            preview.style.display = "block";
            console.log(
                "Screen: Preview updated with src:",
                img.src.substring(0, 30) + "...",
            );
        } else {
            console.error("Screen: Preview element not found");
        }
    }

    async processImage(imageData) {
        if (!imageData) {
            console.error("Screen: No image data to process");
            return null;
        }

        // Check if imageData already has the data URL prefix
        const base64Data = imageData.startsWith("data:image")
            ? imageData.split(",")[1]
            : imageData;

        // Create full data URL for image loading
        const dataUrl = "data:image/png;base64," + base64Data;

        const img = new Image();

        try {
            // Load the image
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = (e) => {
                    console.error("Screen: Image load error:", e);
                    reject(new Error("Failed to load image"));
                };
                // Set a timeout in case the image never loads
                const timeout = setTimeout(() => {
                    console.error("Screen: Image load timeout");
                    reject(new Error("Image load timeout"));
                }, 5000);

                // Set the source after attaching event handlers
                img.src = dataUrl;

                // Clean up timeout if image loads or errors
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                img.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error("Screen: Image load error:", e);
                    reject(new Error("Failed to load image"));
                };
            });

            console.log(
                "Screen: Image loaded successfully, dimensions:",
                img.width,
                "x",
                img.height,
            );

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = img.height / img.width;
            canvas.width = this.config.width;
            canvas.height = Math.round(this.config.width * aspectRatio);

            // Draw and resize image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Get processed image data
            const processedDataUrl = canvas.toDataURL(
                "image/jpeg",
                this.config.quality,
            );
            console.log("Screen: Image processed successfully");

            return processedDataUrl.split(",")[1];
        } catch (error) {
            console.error("Screen: Error processing image:", error);
            return null;
        }
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log("Screen: Initializing screen capture");
        console.log("Screen: Extension available:", this.extensionAvailable);

        try {
            // Check if extension is installed by sending a message to find the extension ID
            window.postMessage({ type: "GET_EXTENSION_ID" }, "*");

            // Set up empty preview element
            const preview = document.getElementById("screenPreview");
            if (preview) {
                console.log("Screen: Setting up initial preview");
                // Simply clear it and make it ready for screenshots
                preview.innerHTML = "";
                preview.style.display = "none"; // Hide until we have an actual screenshot
                console.log("Screen: Initial preview container prepared");
            } else {
                console.warn(
                    "Screen: Preview element not found during initialization",
                );
            }
            
            // Check if we already have extension ID from storage
            try {
                const storedId = sessionStorage.getItem('extensionId');
                if (storedId) {
                    console.log("Screen: Using extension ID from sessionStorage during initialize:", storedId);
                    this.extensionId = storedId;
                } else {
                    // Request extension ID again explicitly
                    console.log("Screen: Re-requesting extension ID during initialize");
                    window.postMessage({ type: "GET_EXTENSION_ID" }, "*");
                    
                    // Set a timeout to check if we got the extension ID
                    setTimeout(() => {
                        console.log("Screen: Extension ID check timeout - current status:", 
                                   "ID:", this.extensionId,
                                   "Available:", this.isExtensionAvailable());
                    }, 2000);
                }
            } catch (e) {
                console.error("Screen: Failed to work with sessionStorage in initialize:", e);
            }

            this.isInitialized = true;
            console.log("Screen: Screen capture initialized");
        } catch (error) {
            console.error(
                "Screen: Failed to initialize screen capture:",
                error,
            );
            throw new Error(
                "Failed to initialize screen capture: " + error.message,
            );
        }
    }

    async capture() {
        if (!this.isInitialized) {
            throw new Error("Capture failed: Screen capture not initialized");
        }

        console.log("Screen: Capturing screenshot");
        
        // Try to get extension ID from sessionStorage again (in case it was set after initialization)
        try {
            const storedId = sessionStorage.getItem('extensionId');
            if (storedId && !this.extensionId) {
                console.log("Screen: Retrieved extension ID from sessionStorage in capture():", storedId);
                this.extensionId = storedId;
            }
        } catch (e) {
            console.error("Screen: Failed to retrieve from sessionStorage in capture():", e);
        }
        
        console.log("Screen: Extension status before capture -", 
                   "ID available:", !!this.extensionId, 
                   "Runtime available:", this.extensionAvailable);

        try {
            // If we have the extension ID and chrome runtime is available, use it to request a screenshot
            if (this.extensionId && this.extensionAvailable) {
                console.log(
                    "Screen: ✅ Requesting screenshot from extension:",
                    this.extensionId,
                );

                // Request screenshot via extension messaging
                chrome.runtime.sendMessage(
                    this.extensionId,
                    { type: "TAKE_SCREENSHOT" },
                    (response) => {
                        console.log(
                            "Screen: Received response from extension:",
                            response,
                        );

                        if (chrome.runtime.lastError) {
                            console.error(
                                "Screen: Extension error details:",
                                chrome.runtime.lastError,
                            );
                            window.postMessage(
                                {
                                    type: "SCREENSHOT_RESULT",
                                    success: false,
                                    message:
                                        "Extension error: " +
                                        chrome.runtime.lastError.message,
                                },
                                "*",
                            );
                            return;
                        }

                        if (response && response.success) {
                            console.log(
                                "Screen: Processing successful screenshot response",
                            );

                            // Handle different response formats
                            let data, fullData;

                            // If response has imageData property (old format)
                            if (response.imageData) {
                                // Check if it's a full data URL or just base64
                                if (
                                    response.imageData.startsWith("data:image")
                                ) {
                                    fullData = response.imageData;
                                    data = response.imageData.split(",")[1];
                                } else {
                                    // Assume it's just base64 data
                                    data = response.imageData;
                                    fullData = "data:image/png;base64," + data;
                                }
                            }
                            // If response has data and fullData properties (new format from ScreenshotHandler)
                            else if (response.data) {
                                data = response.data;
                                fullData =
                                    response.fullData ||
                                    "data:image/png;base64," + data;
                            }

                            // Send the message with the screenshot data
                            window.postMessage(
                                {
                                    type: "SCREENSHOT_RESULT",
                                    success: true,
                                    data: data,
                                    fullData: fullData,
                                },
                                "*",
                            );
                        } else {
                            console.error(
                                "Screen: Screenshot failed:",
                                response ? response.message : "Unknown error",
                            );
                            window.postMessage(
                                {
                                    type: "SCREENSHOT_RESULT",
                                    success: false,
                                    message: response
                                        ? response.message
                                        : "Unknown error",
                                },
                                "*",
                            );
                        }
                    },
                );

                // No need to return any fallback image
                return null;
            } else {
                console.warn("Screen: Extension ID not available");
                // Try to get extension ID again
                window.postMessage({ type: "GET_EXTENSION_ID" }, "*");
                
                // Return a message to be displayed in the console
                return null;
            }
        } catch (error) {
            console.error("Screen: Error capturing screenshot:", error);
            throw new Error("Error capturing screenshot: " + error.message);
        }
    }

    dispose() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }

        // Hide preview element
        const preview = document.getElementById("screenPreview");
        if (preview) {
            preview.style.display = "none";
            preview.innerHTML = "";
        }

        this.isInitialized = false;
        this.config.onStop();
    }
}

// Class is exported at the top of the file
