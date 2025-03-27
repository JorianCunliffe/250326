// screen.js - Handles screen capture functionality - 250326

export class ScreenManager {
    /**
     * @param {Object} config
     * @param {number} [config.width=1280] - Target width for resizing captured images
     * @param {number} [config.quality=0.8] - JPEG quality (0-1)
     * @param {Function} [config.onStop] - Callback when screen capture stops
     */
    constructor(config = {}) { // Add default for config
        this.config = {
            width: config.width || 1280,
            quality: config.quality || 0.8,
            onStop: config.onStop || (() => {}),
            client: config.client || null, // Store the WebSocket client
        };

        if (!this.config.client) {
            console.warn("ScreenManager initialized without a WebSocket client. Cannot send screenshots to Gemini.");
        }

        this.captureInterval = null; // Note: Not used in current logic, consider removing if unused
        this.isInitialized = false;
        this.extensionId = null;
        this.isExtensionAvailable = false;
        this.isProcessing = false; // Flag to prevent concurrent processing attempts

        // REMOVED loadingImagePath and loadingImageDataUrl related logic for initial load

        this.handleScreenCapture = this.handleScreenCapture.bind(this);
        this.processImage = this.processImage.bind(this); // Ensure correct 'this' context

        // --- Message Listener Setup ---
        window.addEventListener("message", (event) => {
            if (event.source !== window || !event.data || !event.data.type) {
                return;
            }
            // console.log(`Screen: 📨 Received message event: ${event.data.type}`, event.data); // Keep for debugging if needed

            switch (event.data.type) {
                case "EXTENSION_ID":
                case "EXTENSION_LOADED": // Treat both similarly for setting ID
                    if (event.data.id && !this.extensionId) { // Only set if ID received and not already set
                        console.log(`Screen: ✅ Received Extension ID via ${event.data.type}: ${event.data.id}`);
                        this.extensionId = event.data.id;
                        this.isExtensionAvailable = true;
                        console.log("Screen: ✅ Extension communication confirmed.");
                    } else if (!event.data.id) {
                        console.warn(`Screen: Received ${event.data.type} message but ID was missing.`);
                    }
                    break;

                case "SCREENSHOT_RESULT":
                    console.log("Screen: Received SCREENSHOT_RESULT");
                    // Pass the *entire* event.data object which contains success, imageData/fullData, message
                    this.handleScreenCapture(event.data);
                    break;
            }
        });

        this.requestExtensionId();

        setTimeout(() => {
            if (!this.isExtensionAvailable) {
                console.warn("Screen: Extension ID not received after 5s. Extension might not be installed/active or content script blocked.");
            }
        }, 5000);

        // REMOVED: loadImageAsDataURL() call from constructor
    }

    requestExtensionId() {
        console.log("Screen: Requesting Extension ID from content script...");
        // Check if postMessage is available (it should be)
        if (window.postMessage) {
            window.postMessage({ type: "GET_EXTENSION_ID" }, "*");
        } else {
            console.error("Screen: window.postMessage is not available in this context.");
        }
    }

    takeScreenshot() {
        console.log("Screen: Attempting to take screenshot...");
        if (!this.isExtensionAvailable || !this.extensionId) {
            console.error("Screen: Cannot take screenshot, extension not available.");
            this.requestExtensionId(); // Try asking again, but don't assume it will work immediately
            // Maybe notify the user or return a specific status?
            return false; // Indicate failure to initiate
        }
        if (!window.postMessage) {
            console.error("Screen: window.postMessage is not available. Cannot send screenshot request.");
            return false; // Indicate failure
        }
        console.log(`Screen: Sending TAKE_SCREENSHOT request via postMessage.`);
        window.postMessage({ type: "TAKE_SCREENSHOT" }, "*");
        return true; // Indicate request was sent
    }

    checkExtensionAvailability() {
        return this.isExtensionAvailable;
    }

    // REMOVED loadImageAsDataURL function entirely as initial load is removed

    handleScreenCapture(response) {
        // Expects response = { success: boolean, imageData?: string, message?: string }
        // Note: background.js should send the *full* dataUrl in 'imageData'
        console.log("Screen: Handling capture response:", response);
        const preview = document.getElementById("screenPreview");

        // --- Preview Element Check ---
        if (!preview) {
            console.error("Screen: Preview element (#screenPreview) not found in DOM.");
            return; // Cannot proceed without preview element
        }

        // --- Error Handling ---

        if (!response || !response.success || !response.imageData) {
            const errorMsg = response?.message || "Unknown screen capture error or no image data";
            console.error(`Screen: Screen capture failed or invalid response: ${errorMsg}`);
            // Optionally display an error state in the preview
            preview.innerHTML = `<p style="color: red; padding: 10px;">Screenshot Failed: ${errorMsg}</p>`;
            preview.style.display = "block"; // Ensure preview area is visible to show error
            return;
        }

        // --- Display successful screenshot ---
        console.log("Screen: Setting up preview for successful screenshot.");
        const img = document.createElement("img");

        img.onload = () => {
            console.log("Screen: Preview image loaded successfully.");
            // You could potentially do resizing *after* load here if needed
        };

        img.onerror = (e) => {
            console.error("Screen: CRITICAL - Error loading received screenshot data URL into preview.", e);
            console.error("Screen: This likely means the 'data:' URL is blocked by Content Security Policy (CSP)!");
            console.error("Screen: Please check the **web page's console** (not the extension's) for CSP errors related to 'img-src'.");
            preview.innerHTML = `<p style="color: red; padding: 10px;">Error displaying screenshot. Check console for CSP errors.</p>`;
            preview.style.display = "block";
        };

        // Set the source - background.js should send the full data URL
        img.src = response.imageData;

        img.style.width = "100%";
        img.style.height = "auto"; // Maintain aspect ratio
        img.style.display = "block"; // Make sure image itself is visible

        preview.innerHTML = ""; // Clear previous content (like error messages)
        preview.appendChild(img);
        preview.style.display = "block"; // Ensure preview container is visible

        console.log("Screen: Preview updated with received image.");

        // --- Process and send the image to Gemini if client is available ---
        if (this.config.client) {
            this.processImage(response.imageData)
                .then(processedData => {
                    if (processedData) {
                        console.log("Screen: Sending processed image to Gemini via client...");
                        this.config.client.sendImage(processedData);
                    }
                })
                .catch(error => {
                    console.error("Screen: Error processing/sending image:", error);
                });
        } else {
            console.warn("Screen: Cannot send image to Gemini - no client available");
        }
    }

    async processImage(imageDataUrl) {
        // Input should be a full data URL (e.g., from response.imageData)
        if (!imageDataUrl || !imageDataUrl.startsWith("data:image")) {
            console.error("Screen: processImage requires a valid data URL.", imageDataUrl ? imageDataUrl.substring(0, 30) + "..." : "null");
            return null;
        }

        if (this.isProcessing) {
            console.warn("Screen: Already processing an image, skipping new request.");
            return null;
        }
        this.isProcessing = true;

        console.log("Screen: Starting image processing...");

        const img = new Image();

        try {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = (e) => {
                    // This error here is also HIGHLY suspicious of CSP if it fails
                    console.error("Screen: Error loading image data URL for processing.", e);
                    console.error("Screen: Check web page console for CSP errors!");
                    reject(new Error("Failed to load image for processing"));
                };
                img.src = imageDataUrl; // Load the full data URL
            });

            console.log("Screen: Image loaded for processing, dimensions:", img.width, "x", img.height);

            if (img.width === 0 || img.height === 0) {
                throw new Error("Loaded image has zero dimensions.");
            }

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const aspectRatio = img.height / img.width;
            canvas.width = this.config.width;
            canvas.height = Math.round(this.config.width * aspectRatio);

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const processedDataUrl = canvas.toDataURL("image/jpeg", this.config.quality);
            console.log("Screen: Image processed to JPEG successfully.");

            this.isProcessing = false;
            return processedDataUrl.split(",")[1]; // Return base64 string only

        } catch (error) {
            console.error("Screen: Error during image processing:", error);
            this.isProcessing = false;
            return null; // Return null on failure
        }
    }

    async initialize() {
        if (this.isInitialized) return;
        console.log("Screen: Initializing screen capture manager...");
        
        // Log client availability status
        if (this.config.client) {
            console.log("Screen: Client is available for sending captured images");
        } else {
            console.warn("Screen: No client available during initialization");
        }

        // We request the ID in the constructor now
        // this.requestExtensionId();

        // Prepare the preview element, but leave it empty initially
        const preview = document.getElementById("screenPreview");
        if (preview) {
            preview.innerHTML = ""; // Ensure it's empty
            preview.style.display = "block"; // Make the container visible
            // Optionally add placeholder text:
            // preview.innerHTML = "<p>Waiting for screenshot...</p>";
            console.log("Screen: Initial preview area prepared.");
        } else {
            console.warn("Screen: Preview element (#screenPreview) not found during initialization.");
        }

        this.isInitialized = true;
        console.log("Screen: Screen capture manager initialized.");
    }

    async capture() {
        if (!this.isInitialized) {
            console.error("Capture failed: Screen capture not initialized");
            // Maybe throw new Error("ScreenManager not initialized");
            return null; // Indicate failure or return a specific status/error
        }

        console.log("Screen: Initiating capture request...");

        // Use the takeScreenshot method which uses postMessage
        const requestSent = this.takeScreenshot(); // Returns true if request was sent

        if (!requestSent) {
             console.warn("Screen: Screenshot request failed to send (extension unavailable?).");
             // No fallback to loading image here anymore.
             // The caller needs to handle the fact that no screenshot will arrive.
             return null; // Indicate capture could not be initiated
        } else {
            console.log("Screen: Screenshot request sent. Waiting for SCREENSHOT_RESULT message.");
            // We don't return image data here. We wait for the async response
            // handled by handleScreenCapture. The caller should not expect
            // immediate image data from capture().
            // Return null or a Promise that resolves when the capture is handled?
            // For now, just returning null as the data comes via message event.
            return null;
        }
    }

    dispose() {
        // Clean up any intervals or listeners if they were used
        // if (this.captureInterval) { clearInterval(this.captureInterval); this.captureInterval = null; }

        const preview = document.getElementById("screenPreview");
        if (preview) {
            preview.style.display = "none";
            preview.innerHTML = "";
        }

        this.isInitialized = false;
        console.log("Screen: Screen manager disposed.");
        if (typeof this.config.onStop === 'function') {
            this.config.onStop();
        }
    }
}