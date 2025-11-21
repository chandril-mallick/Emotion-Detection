// Content script for WhatsApp Emotion Detector
console.log('WhatsApp Emotion Detector with emo_roberta loaded');

// Extension settings
let settings = {
    showEmojis: true,
    enableDarkMode: false,
    isEnabled: true
};

// Load settings from storage
async function loadSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get({
            showEmojis: true,
            enableDarkMode: false,
            isEnabled: true
        }, result => {
            Object.assign(settings, result);
            applyDarkMode();
            resolve();
        });
    });
}

// Apply dark mode if enabled
function applyDarkMode() {
    if (settings.enableDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

// Function to get emoji for emotion
function getEmojiForEmotion(emotion) {
    const emojiMap = {
        'admiration': '😊', 'amusement': '😄', 'anger': '😠', 'annoyance': '😒',
        'approval': '👍', 'caring': '❤️', 'confusion': '😕', 'curiosity': '🤔',
        'desire': '😍', 'disappointment': '😞', 'disapproval': '👎', 'disgust': '🤢',
        'embarrassment': '😳', 'excitement': '🎉', 'fear': '😨', 'gratitude': '🙏',
        'grief': '😢', 'joy': '😊', 'love': '❤️', 'nervousness': '😬',
        'optimism': '😊', 'pride': '🦚', 'realization': '💡', 'relief': '😌',
        'remorse': '😔', 'sadness': '😢', 'surprise': '😮', 'neutral': '😐',
        'error': '❌', 'loading': '⏳'
    };
    
    return emojiMap[emotion.toLowerCase()] || '❓';
}

// Function to create and show an error label
function showError(message, element) {
    const errorLabel = document.createElement('span');
    errorLabel.className = 'emotion-label error';
    errorLabel.textContent = 'Error';
    errorLabel.title = message;
    element.appendChild(errorLabel);
}

// Function to send emotion data to the sidebar
function sendToSidebar(emotionData, messageText) {
    // Send to background script which will forward to sidebar
    chrome.runtime.sendMessage({
        type: 'EMOTION_DETECTED',
        emotion: emotionData,
        text: messageText
    });

    // Store in history
    chrome.storage.local.get(['emotionHistory'], (result) => {
        const history = result.emotionHistory || [];
        history.unshift({
            emotion: emotionData,
            text: messageText,
            timestamp: new Date().toISOString()
        });
        
        // Keep only the last 100 items
        if (history.length > 100) {
            history.pop();
        }
        
        chrome.storage.local.set({ emotionHistory: history });
    });
}

// Function to process new messages
async function processNewMessages() {
    if (!settings.isEnabled) return;
    
    // Find all message elements that don't have our emotion label yet
    const messages = document.querySelectorAll('[data-id*="false"]:not(.emotion-processed)');
    
    // Process messages in batches to avoid rate limiting
    const BATCH_SIZE = 3;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = Array.from(messages).slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(processSingleMessage));
    }
}

// Process a single message
async function processSingleMessage(message) {
    try {
        // Mark as processed immediately to avoid duplicate processing
        message.classList.add('emotion-processing');
        
        // Get message text
        const messageText = message.querySelector('.selectable-text')?.textContent;
        if (!messageText || messageText.trim() === '') {
            message.classList.remove('emotion-processing');
            message.classList.add('emotion-processed');
            return;
        }
        
        // Check if we already have an emotion label
        if (message.querySelector('.emotion-label')) {
            message.classList.remove('emotion-processing');
            message.classList.add('emotion-processed');
            return;
        }
        
        // Show loading indicator
        const loadingIndicator = document.createElement('span');
        loadingIndicator.className = 'emotion-label loading';
        loadingIndicator.textContent = settings.showEmojis ? '⏳' : 'Detecting...';
        message.appendChild(loadingIndicator);
        
        try {
            // Check rate limit status
            const rateLimit = await new Promise(resolve => {
                chrome.runtime.sendMessage(
                    { action: 'getRateLimitStatus' },
                    resolve
                );
            });
            
            if (rateLimit.remaining <= 0) {
                throw new Error(`Rate limit reached. Try again in ${rateLimit.resetIn} seconds.`);
            }
            
            // Send message to background script for emotion detection
            const response = await chrome.runtime.sendMessage({
                action: 'detectEmotion',
                text: messageText
            });
            
            // Remove loading indicator
            if (loadingIndicator.parentNode === message) {
                message.removeChild(loadingIndicator);
            }
            
            if (response && response.success) {
                const emotion = response.emotion;
                const emoji = settings.showEmojis ? getEmojiForEmotion(emotion) : '';
                
                // Create and append emotion label
                const emotionLabel = document.createElement('span');
                emotionLabel.className = 'emotion-label';
                emotionLabel.title = `Detected emotion: ${emotion}`;
                emotionLabel.textContent = settings.showEmojis ? 
                    `${emoji} ${emotion}` : 
                    emotion.charAt(0).toUpperCase() + emotion.slice(1);
                
                // Add the emotion label to the message
                if (emotionLabel) {
                    message.appendChild(emotionLabel);
                    
                    // Send to sidebar
                    if (emotionData && emotionData.length > 0) {
                        sendToSidebar(emotionData, messageText);
                    }
                }
            } else {
                showError(response?.error || 'Failed to detect emotion', message);
            }
        } catch (error) {
            console.error('Error detecting emotion:', error);
            if (loadingIndicator.parentNode === message) {
                message.removeChild(loadingIndicator);
            }
            showError(error.message, message);
        }
        
    } catch (error) {
        console.error('Error processing message:', error);
    } finally {
        message.classList.remove('emotion-processing');
        message.classList.add('emotion-processed');
    }
}

// Initialize the extension
async function init() {
    // Load settings first
    await loadSettings();
    
    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
        if (settings.isEnabled) {
            processNewMessages();
        }
    });

    // Start observing when page loads
    const startObserving = () => {
        const targetNode = document.querySelector('div[data-testid="conversation-panel-body"]');
        if (targetNode && !targetNode._emotionObserver) {
            observer.observe(targetNode, {
                childList: true,
                subtree: true
            });
            targetNode._emotionObserver = true;
            
            // Initial processing
            if (settings.isEnabled) {
                processNewMessages();
            }
        }
    };

    // Handle page load and SPA navigation
    if (document.readyState === 'complete') {
        startObserving();
    } else {
        window.addEventListener('load', startObserving);
    }

    // Handle SPA navigation
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(startObserving, 1000); // Wait for the DOM to update
    };

    let port;

    function setupPortListeners() {
        // Handle messages from the background script
        port.onMessage.addListener((message) => {
            console.log('Received message from background:', message);
            
            if (message.action === 'emotionDetected') {
                console.log('Emotion detected:', message.emotion);
                updateMessageWithEmotion(message.messageId, message.emotion);
            } else if (message.action === 'emotionError') {
                console.error('Error detecting emotion:', message.error);
            }
        });

        // Handle port disconnection
        port.onDisconnect.addListener(() => {
            console.log('Disconnected from background script');
            // Attempt to reconnect after a delay
            setTimeout(connectToBackground, 1000);
        });
    }

    function connectToBackground() {
        try {
            port = chrome.runtime.connect({ name: 'content-script' });
            setupPortListeners();
            console.log('Successfully connected to background script');
        } catch (error) {
            console.error('Failed to connect to background script:', error);
            // Retry connection after a delay
            setTimeout(connectToBackground, 1000);
        }
    }

    // Function to send message with retry logic
    function sendMessageWithRetry(message, retries = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            const send = (attempt = 0) => {
                try {
                    port.postMessage(message);
                    // We don't wait for response here since we'll get it via port.onMessage
                    resolve();
                } catch (error) {
                    console.warn(`Attempt ${attempt + 1} failed:`, error);
                    if (attempt >= retries - 1) {
                        reject(error);
                    } else {
                        setTimeout(() => send(attempt + 1), delay);
                    }
                }
            };
            send();
        });
    }

    // Function to update the message with the detected emotion
    function updateMessageWithEmotion(messageId, emotion) {
        const messageElement = document.querySelector(`[data-id="${messageId}"]`);
        if (messageElement) {
            // Remove any existing emotion label
            const existingLabel = messageElement.querySelector('.emotion-label');
            if (existingLabel) {
                existingLabel.remove();
            }
            
            // Add the new emotion label
            if (emotion && emotion !== 'error') {
                const label = document.createElement('span');
                label.className = 'emotion-label';
                label.textContent = emotion;
                messageElement.appendChild(label);
            }
        }
    }

    // Listen for settings changes
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
            Object.assign(settings, request.settings);
            applyDarkMode();
            
            // Reprocess messages if we were disabled
            if (settings.isEnabled) {
                document.querySelectorAll('.emotion-label').forEach(el => el.remove());
                const messages = document.querySelectorAll('[data-id*="false"]');
                messages.forEach(msg => {
                    msg.classList.remove('emotion-processed');
                });
                processNewMessages();
            } else {
                // Clear all emotion labels if disabled
                document.querySelectorAll('.emotion-label').forEach(el => el.remove());
            }
        }
    });
}

// Start the extension
init();
