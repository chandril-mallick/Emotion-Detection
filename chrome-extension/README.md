# WhatsApp Emotion Detector Extension

A Chrome extension that detects and displays emotions in real-time for WhatsApp Web chats.

## Features
- Detects emotions from chat messages
- Displays emotion labels next to messages
- Works in real-time as new messages arrive
- Lightweight and non-intrusive

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension should now be active

## Usage

1. Open [WhatsApp Web](https://web.whatsapp.com/) in Chrome
2. The extension will automatically start analyzing messages
3. Emotion labels will appear next to each message

## Development

### File Structure
- `manifest.json` - Extension configuration
- `content.js` - Main script that runs on WhatsApp Web
- `styles.css` - Styling for the emotion labels
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality

### Testing
1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on WhatsApp Web

## Note
This is a basic implementation. For production use, you would want to:
- Implement actual emotion detection (currently uses a placeholder)
- Add error handling
- Add user settings/preferences
- Add proper testing

## License
MIT
