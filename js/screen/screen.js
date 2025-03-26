// screen.js - Handles screen capture functionality - 250326

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

        // Loading image path for initialization and fallbacks
        this.loadingImagePath = "js/screen/LOADING.png";
        this.loadingImageDataUrl = null; // Added to store the data URL of the loading image

        this.handleScreenCapture = this.handleScreenCapture.bind(this);

        // Set up message listener for communication with extension
        window.addEventListener("message", (event) => {
            if (event.data && event.data.type === "EXTENSION_ID") {
                this.extensionId = event.data.id;
                console.log("Screen: Received extension ID:", this.extensionId);
            } else if (event.data && event.data.type === "SCREENSHOT_RESULT") {
                this.handleScreenCapture(event.data);
            }
        });

        this.loadImageAsDataURL(); // Load image as DataURL on construction
    }

    async loadImageAsDataURL() {
        return fetch(this.loadingImagePath)
            .then((response) => response.blob())
            .then(
                (blob) =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    }),
            )
            .then((dataUrl) => (this.loadingImageDataUrl = dataUrl))
            .catch((error) =>
                console.error("Error loading image as DataURL:", error),
            );
    }

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
            // Fallback to test image if no valid data
            else {
                console.warn("Screen: No valid image data, using test image");
                img.src = this.loadingImageDataUrl || this.loadingImagePath; // Use loading image data URL or path
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

        // Update preview
        const preview = document.getElementById("screenPreview");
        if (preview) {
            console.log("Screen: Updating preview in processImage");
            const previewImg = document.createElement("img");
            previewImg.src = dataUrl;
            previewImg.style.width = "100%";
            previewImg.style.height = "auto";
            preview.innerHTML = "";
            preview.appendChild(previewImg);
            // Make sure the preview is visible
            preview.style.display = "block";
            console.log("Screen: Preview updated in processImage");
        } else {
            console.warn("Screen: Preview element not found in processImage");
        }

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

        try {
            // Check if extension is installed by sending a message to find the extension ID
            window.postMessage({ type: "GET_EXTENSION_ID" }, "*");

            // Show preview element
            const preview = document.getElementById("screenPreview");
            if (preview) {
                console.log("Screen: Setting up initial preview");
                preview.style.display = "block";

                // Create and set up the image element
                const img = document.createElement("img");
                img.src = this.loadingImageDataUrl || this.loadingImagePath;
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "contain";

                // Add error handling for the image
                img.onerror = (e) => {
                    console.error(
                        "Screen: Error loading initial preview image:",
                        e,
                    );
                    // Try with a simpler approach as fallback
                    img.src = this.loadingImageDataUrl || this.loadingImagePath;
                };

                // Clear and append
                preview.innerHTML = "";
                preview.appendChild(img);
                console.log("Screen: Initial preview set up");
            } else {
                console.warn(
                    "Screen: Preview element not found during initialization",
                );
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

        try {
            // If we have the extension ID, use it to request a screenshot
            if (this.extensionId) {
                console.log(
                    "Screen: Requesting screenshot from extension:",
                    this.extensionId,
                );

                console.log(
                    "Screen: Sending chrome.runtime.sendMessage to extension ID:",
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
                            // Fallback if no recognizable format
                            else {
                                console.warn(
                                    "Screen: Unrecognized response format, using test image",
                                );
                                data = this.loadingImageDataUrl; //Use loading image data URL
                                fullData = "data:image/png;base64," + data;
                            }

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

                // Use test image as fallback while waiting for the real screenshot
                return this.processImage(this.loadingImageDataUrl);
            } else {
                console.warn(
                    "Screen: Extension ID not available, using test image",
                );
                return this.processImage(this.loadingImageDataUrl);
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
