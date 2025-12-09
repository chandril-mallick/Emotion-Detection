# Emotion Detection System

A comprehensive Natural Language Processing (NLP) application that detects emotions in text messages in real-time. This project includes a FastAPI backend, React frontend, and a Chrome extension for seamless integration.

## Features

- Real-time emotion detection in text messages
- Support for multiple emotion categories: joy, sadness, anger, fear, surprise, disgust, and neutral
- WebSocket-based real-time communication
- Responsive web interface with emotion visualization
- Chrome extension for browser integration
- RESTful API for emotion detection

## Tech Stack

### Backend
- **Framework**: FastAPI
- **NLP Model**: j-hartmann/emotion-english-distilroberta-base
- **WebSocket Support**: Built-in WebSocket with FastAPI
- **Dependencies**: Transformers, PyTorch, Pydantic, Uvicorn

### Frontend
- **Framework**: React with Vite
- **State Management**: React Hooks
- **Styling**: CSS Modules
- **WebSocket Client**: Native WebSocket API

### Chrome Extension
- Manifest V3 compatible
- Content Script for message interception
- Background service worker
- Real-time emotion analysis

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Chrome browser (for extension)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chandril-mallick/Emotion-Detection.git
   cd Emotion-Detection
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Chrome Extension Setup**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `chrome-extension` directory

## Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   uvicorn app:app --reload
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Using the Chrome Extension**
   - Pin the Emotion Detection extension to your Chrome toolbar
   - Click the extension icon to open the chat interface
   - Start sending messages to see emotion detection in action

## API Documentation

### REST API Endpoints

- `POST /detect` - Analyze emotion in a single message
  - Request body: `{"message": "Your text here"}`
  - Response: `{"emotion": "joy", "confidence": 0.95}`

### WebSocket Endpoint

- `ws://localhost:8000/ws/{user_id}` - Real-time communication
  - Send: `{"message": "Hello", "sender": "user1", "receiver": "user2"}`
  - Receive: `{"message": "Hello", "emotion": "joy", "confidence": 0.95}`

## Project Structure

```
emotion-detector/
├── backend/               # FastAPI application
│   ├── app.py            # Main application file
│   └── requirements.txt  # Python dependencies
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   └── App.jsx       # Main application component
│   └── package.json      # Node.js dependencies
├── chrome-extension/     # Chrome extension files
│   ├── background.js     # Extension background script
│   ├── content.js        # Content script for web pages
│   └── manifest.json     # Extension manifest
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Hugging Face Transformers](https://huggingface.co/transformers/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://reactjs.org/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)

## Contact

For any inquiries, please open an issue on the [GitHub repository](https://github.com/chandril-mallick/Emotion-Detection).

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd emotion-detector
   cd frontend
   ```

2. Install the required Node.js packages:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## Usage

1. Open the application in your web browser
2. Start typing messages in the chat input
3. The app will detect the emotion in your message and display the corresponding emoji in the navbar
4. Sent messages will be displayed with their detected emotion emoji

## API Endpoints

- `POST /detect_emotion` - Analyzes text and returns the detected emotion
  - Request body: `{ "message": "Your text here" }`
  - Response: 
    ```json
    {
      "emotion": "joy",
      "emoji": "😊",
      "score": 0.98,
      "message": "Your original message"
    }
    ```

## Project Structure

```
emotion-detector/
├── backend/
│   ├── app.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── public/              # Static files
    ├── src/
    │   ├── components/      # React components
    │   │   └── ChatEmotionApp.jsx  # Main chat component
    │   ├── App.jsx          # Main application component
    │   ├── App.css          # Application styles
    │   └── main.jsx         # Application entry point
    ├── package.json         # Node.js dependencies
    └── vite.config.js       # Vite configuration
```

