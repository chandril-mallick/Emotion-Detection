from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from transformers import pipeline
import uvicorn
import json
from fastapi.encoders import jsonable_encoder
import logging
import time
from pydantic import ConfigDict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Emotion Detection API")

# Load the emotion detection model
emotion_labels = {
    'anger': '😠',
    'disgust': '🤢',
    'fear': '😨',
    'joy': '😊',
    'neutral': '😐',
    'sadness': '😢',
    'surprise': '😮'
}

try:
    logger.info("Loading emotion detection model...")
    emotion_classifier = pipeline(
        "text-classification",
        model="j-hartmann/emotion-english-distilroberta-base",
        return_all_scores=True
    )
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")
    raise RuntimeError("Failed to load emotion detection model")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    message: str
    sender: Optional[str] = None
    receiver: Optional[str] = None
    model_config = ConfigDict(extra='forbid')

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

manager = ConnectionManager()

# WebSocket endpoint for real-time communication
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process the message and detect emotion
            if 'message' not in message_data:
                await websocket.send_json({"error": "No message provided"})
                continue
                
            predictions = emotion_classifier(message_data['message'])[0]
            top_emotion = max(predictions, key=lambda x: x['score'])
            
            # Send the emotion back to the client
            await websocket.send_json({
                "type": "emotion",
                "emotion": top_emotion['label'],
                "score": top_emotion['score']
            })
            
            emotion_emojis = {
                'anger': '😠',
                'disgust': '🤢',
                'fear': '😨',
                'joy': '😊',
                'neutral': '😐',
                'sadness': '😢',
                'surprise': '😮'
            }
            
            response = {
                "type": "message",
                "sender": user_id,
                "receiver": message_data.get('receiver'),
                "message": message_data['message'],
                "emotion": {
                    "label": top_emotion['label'],
                    "score": top_emotion['score'],
                    "emoji": emotion_emojis.get(top_emotion['label'], '❓')
                },
                "timestamp": message_data.get('timestamp')
            }
            
            # Send the message to the receiver if specified, otherwise broadcast to all
            if message_data.get('receiver'):
                await manager.send_personal_message(response, message_data['receiver'])
            else:
                # Broadcast to all connected clients
                for connection in manager.active_connections.values():
                    await connection.send_json(response)
                    
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# REST endpoint for single message emotion detection (kept for backward compatibility)
@app.post("/detect_emotion")
async def detect_emotion(message: Message):
    try:
        if not message.message.strip():
            return {"error": "Message cannot be empty"}
        
        # Get emotion prediction
        result = emotion_classifier(message.message[:512])  # Limit input length
        
        if not result or not isinstance(result, list) or len(result) == 0:
            return {"error": "Failed to analyze emotion"}
        
        # Get the top emotion
        top_emotion = max(result[0], key=lambda x: x['score'])
        
        # Get emoji for the detected emotion
        emoji = emotion_labels.get(top_emotion['label'], '❓')
        
        return {
            "emotion": top_emotion['label'],
            "emoji": emoji,
            "score": top_emotion['score'],
            "message": message.message
        }
        
    except Exception as e:
        logger.error(f"Error in detect_emotion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
