# Gemini 2.0 Flash Multimodal Live API Client

A lightweight vanilla JavaScript implementation of the Gemini 2.0 Flash Multimodal Live API client. This project provides real-time interaction with Gemini's API through text, audio, video, and screen sharing capabilities.

This is a simplified version of [Google's original React implementation](https://github.com/google-gemini/multimodal-live-api-web-console), created in response to [this issue](https://github.com/google-gemini/multimodal-live-api-web-console/issues/19).

## Live Demo on GitHub Pages

[Live Demo](https://viaanthroposbenevolentia.github.io/gemini-2-live-api-demo/)

## Key Features

- Real-time chat with Gemini 2.0 Flash Multimodal Live API
- Real-time audio responses from the model
- Real-time audio input from the user, allowing interruptions
- Real-time video streaming from the user's webcam
- Real-time screen sharing from the user's screen
- Function calling
- Transcription of the model's audio (if Deepgram API key provided)
- Built with vanilla JavaScript (no dependencies)
- Mobile-friendly

## Prerequisites

- Modern web browser with WebRTC, WebSocket, and Web Audio API support
- Google AI Studio API key
- `python -m http.server` or `npx http-server` or Live Server extension for VS Code (to host a server for index.html)

## Quick Start

1. Get your API key from Google AI Studio
2. Clone the repository

   ```bash
   git clone https://github.com/ViaAnthroposBenevolentia/gemini-2-live-api-demo.git
   ```

3. Start the development server (adjust port if needed):

   ```bash
   cd gemini-2-live-api-demo
   python -m http.server 8000 # or npx http-server 8000 or Open with Live Server extension for VS Code
   ```

4. Access the application at `http://localhost:8000`

5. Open the settings at the top right, paste your API key, and click "Save"
6. Get free API key from [Deepgram](https://deepgram.com/pricing) and paste in the settings to get real-time transcript (Optional).

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.
