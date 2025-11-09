import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import { FiSend, FiSmile, FiLoader } from 'react-icons/fi';

const API_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws";

const emotionEmojis = {
  anger: { emoji: '😠', color: '#ef4444' },
  disgust: { emoji: '🤢', color: '#10b981' },
  fear: { emoji: '😨', color: '#8b5cf6' },
  joy: { emoji: '😊', color: '#f59e0b' },
  neutral: { emoji: '😐', color: '#6b7280' },
  sadness: { emoji: '😢', color: '#3b82f6' },
  surprise: { emoji: '😮', color: '#ec4899' },
  default: { emoji: '💬', color: '#6b7280' }
};

const emotionLabels = {
  anger: 'Angry',
  disgust: 'Disgusted',
  fear: 'Afraid',
  joy: 'Happy',
  neutral: 'Neutral',
  sadness: 'Sad',
  surprise: 'Surprised',
  default: 'Type a message...'
};

function ChatEmotionApp() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Welcome to Emotion Detection AI! I can analyze the emotional tone of your messages. Try typing something and see what I detect! 😊",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString(),
      emotion: "joy",
      emoji: "🤖"
    }
  ]);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const [isLoading, _setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);
  const [recipientId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const ws = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // WebSocket connection with reconnection
  const connectWebSocket = useCallback(() => {
    // Don't try to reconnect if we're already connected
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Clean up any existing connection
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      
      if (ws.current.readyState === WebSocket.OPEN || 
          ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close();
      }
    }

    try {
      console.log('Attempting to connect to WebSocket...');
      ws.current = new WebSocket(`${WS_URL}/${userId}`);
      
      ws.current.onopen = () => {
        console.log('✅ WebSocket connection established');
        setIsConnected(true);
        
        // Send a system message when connected
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: 'Connected to chat',
          sender: 'system',
          timestamp: new Date().toLocaleTimeString(),
          emotion: 'neutral',
          emoji: '🌐'
        }]);
      };

      ws.current.onmessage = (event) => {
        try {
          console.log('📨 Received message:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.type === 'typing') {
            console.log(`👤 ${data.sender} is typing:`, data.isTyping);
            setTypingUsers(prev => ({
              ...prev,
              [data.sender]: data.isTyping
            }));
            
            if (data.isTyping) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              
              typingTimeoutRef.current = setTimeout(() => {
                console.log(`👤 ${data.sender} stopped typing`);
                setTypingUsers(prev => ({
                  ...prev,
                  [data.sender]: false
                }));
              }, 2000);
            }
          } else if (data.type === 'message') {
            console.log('💬 New message received:', data);
            const newMessage = {
              id: data.id || Date.now(),
              text: data.message,
              sender: data.sender === userId ? 'user' : 'other',
              timestamp: new Date().toLocaleTimeString(),
              emotion: data.emotion?.label || 'neutral',
              emoji: data.emotion?.emoji || '❓'
            };
            
            setMessages(prev => [...prev, newMessage]);
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error, 'Message:', event.data);
        }
      };

      ws.current.onclose = (event) => {
        console.log(`🚨 WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}, Was clean: ${event.wasClean}`);
        setIsConnected(false);
        
        // Don't attempt to reconnect if the component is unmounting
        if (isUnmountedRef.current) return;
        
        // Use exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30 seconds
        console.log(`⏳ Attempting to reconnect in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnection attempt ${reconnectAttemptsRef.current}`);
          connectWebSocket();
        }, delay);
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        // The close event will handle reconnection
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      // The close event will handle reconnection
    }
  }, [userId]);

  // Track if component is mounted
  const isUnmountedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    isUnmountedRef.current = false;
    reconnectAttemptsRef.current = 0;
    
    // Initial connection
    connectWebSocket();
    
    // Set up ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, 30000); // Send ping every 30 seconds
    
    // Cleanup function
    return () => {
      isUnmountedRef.current = true;
      clearInterval(pingInterval);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (ws.current) {
        console.log('🧹 Cleaning up WebSocket connection');
        ws.current.onopen = null;
        ws.current.onclose = null;
        ws.current.onerror = null;
        ws.current.onmessage = null;
        
        if (ws.current.readyState === WebSocket.OPEN || 
            ws.current.readyState === WebSocket.CONNECTING) {
          ws.current.close();
        }
        
        ws.current = null;
      }
    };
  }, [connectWebSocket]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced emotion detection
  useEffect(() => {
    if (message.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        detectEmotion(message);
      }, 800);
    } else {
      setCurrentEmotion('default');
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message]);

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const detectEmotion = async (text) => {
    if (!text.trim()) return;
    
    try {
      const response = await axios.post(`${API_URL}/detect_emotion`, {
        message: text
      });
      
      if (response.data.emoji) {
        setCurrentEmotion(response.data.emotion || 'default');
      }
    } catch (error) {
      console.error('Error detecting emotion:', error);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !isConnected) return;
    
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      emotion: currentEmotion,
      emoji: emotionEmojis[currentEmotion]?.emoji || '💬'
    };

    // Add user message to chat immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Send message via WebSocket
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'message',
        message: message,
        sender: userId,
        receiver: recipientId || null,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Clear input and reset emotion
    setMessage('');
    setCurrentEmotion('neutral');
  };
  
  const handleTyping = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        sender: userId,
        isTyping: true
      }));
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="chat-container" ref={inputRef}>
      <div className="chat-header">
        <div className="connection-status" style={{ 
          backgroundColor: isConnected ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span className="status-dot">•</span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        <div className="emotion-display" style={{ 
          backgroundColor: emotionEmojis[currentEmotion]?.color + '15' || 'rgba(0,0,0,0.05)',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s ease'
        }}>
          <span className="emotion-emoji" style={{ 
            fontSize: '1.25rem',
            lineHeight: 1
          }}>
            {emotionEmojis[currentEmotion]?.emoji || '😊'}
          </span>
          <div className="emotion-text" style={{ 
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1.2
          }}>
            <span className="label" style={{ 
              fontSize: '0.75rem',
              opacity: 0.8
            }}>Current Emotion</span>
            <span className="value" style={{ 
              fontWeight: 600,
              color: emotionEmojis[currentEmotion]?.color || 'inherit'
            }}>
              {emotionLabels[currentEmotion] || 'Neutral'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <div className="message-content">
              {msg.sender === 'bot' && (
                <div className="message-sender">AI Assistant</div>
              )}
              <div className="message-text">
                {msg.text}
              </div>
              <div className="message-footer">
                <span className="message-timestamp">{msg.timestamp}</span>
                {msg.sender === 'user' && msg.emotion && (
                  <span 
                    className="message-emotion" 
                    style={{ 
                      backgroundColor: emotionEmojis[msg.emotion]?.color + '20' || 'rgba(0,0,0,0.05)',
                      color: emotionEmojis[msg.emotion]?.color || 'inherit'
                    }}
                  >
                    {emotionEmojis[msg.emotion]?.emoji || '❓'} {emotionLabels[msg.emotion] || msg.emotion}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Show typing indicators */}
        {Object.entries(typingUsers).map(([userId, isTyping]) => 
          isTyping && (
            <div key={`typing-${userId}`} className="message other">
              <div className="message-content">
                <div className="typing-indicator">
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </div>
              </div>
            </div>
          )
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <form className="message-form" onSubmit={handleSendMessage}>
          <div className="message-input-wrapper">
            <button 
              type="button" 
              className="emoji-button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="Choose emoji"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                color: 'var(--text-secondary)'
              }}
            >
              <FiSmile />
            </button>
            
            {showEmojiPicker && (
              <div className="emoji-picker-container" style={{
                position: 'absolute',
                bottom: '100%',
                left: '0',
                marginBottom: '0.5rem',
                zIndex: 10
              }}>
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick}
                  disableAutoFocus={true}
                  native
                  width="100%"
                  height={350}
                />
              </div>
            )}
            
            <div className="message-input-container" style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="message-input"
                disabled={!isConnected}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  paddingRight: '2.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '1.5rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: 'var(--background-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <div 
                className="emotion-indicator"
                style={{ 
                  position: 'absolute',
                  right: '0.75rem',
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: emotionEmojis[currentEmotion]?.color + '20' || 'rgba(0,0,0,0.05)',
                  color: emotionEmojis[currentEmotion]?.color || 'var(--text-secondary)'
                }}
                title={emotionLabels[currentEmotion] || 'Neutral'}
              >
                {emotionEmojis[currentEmotion]?.emoji || '😊'}
              </div>
            </div>
            
            <button 
              type="submit" 
              className="send-button" 
              disabled={!message.trim() || !isConnected}
              aria-label="Send message"
              style={{
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (!message.trim() || !isConnected) ? 0.5 : 1,
                pointerEvents: (!message.trim() || !isConnected) ? 'none' : 'auto'
              }}
            >
              {isLoading ? <FiLoader /> : <FiSend />}
            </button>
          </div>
        </form>
        
        <div className="emotion-legend" style={{
          marginTop: '0.75rem',
          padding: '0.5rem 0',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ marginRight: '0.25rem' }}>Emotions:</span>
          {Object.entries(emotionEmojis).map(([key, { emoji, label }]) => (
            <span 
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: emotionEmojis[key].color + '15',
                color: emotionEmojis[key].color,
                border: `1px solid ${emotionEmojis[key].color}40`,
                fontSize: '0.7rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                cursor: 'default',
                opacity: currentEmotion === key ? 1 : 0.7
              }}
              title={label}
            >
              {emoji} {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatEmotionApp;
