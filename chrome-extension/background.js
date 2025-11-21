// Background script for handling Hugging Face API calls
const MODEL = 'arpanghoshal/EmoRoBERTa';
const RATE_LIMIT = {
    MAX_REQUESTS: 10, // Max requests per minute
    TIME_WINDOW: 60000, // 1 minute in ms
};

// Using a more robust approach for API calls with CORS handling

// Using declarativeNetRequest for CORS handling
// Rules are defined in rules.json
console.log('Background script loaded with declarativeNetRequest rules');

// Track active connections
const connections = new Map();

// Register storage change listener synchronously at the top level
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.sidebarOpen) {
        // Handle sidebar state changes
        chrome.sidePanel.setOptions({
            enabled: changes.sidebarOpen.newValue,
            path: 'sidebar.html'
        }).catch(error => {
            console.debug('Error updating side panel:', error);
        });
    }
});

// Initialize storage change listener (kept for backward compatibility)
function initializeStorageListener() {
    // Already registered at the top level
}

// Initialize message listener immediately
function initializeMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EMOTION_DETECTED') {
            // First check if the side panel is open
            chrome.storage.sync.get(['sidebarOpen'], (result) => {
                if (result.sidebarOpen) {
                    // Only send message if sidebar is open
                    chrome.runtime.sendMessage(message).catch(error => {
                        // Ignore error if no listeners
                        if (chrome.runtime.lastError) {
                            console.debug('No active side panel to receive message');
                        }
                    });
                }
            });
        }
        return true; // Keep the message channel open for async response
    });
}

// Initialize all listeners when the service worker starts
function initializeServiceWorker() {
    initializeStorageListener();
    initializeMessageListener();
    
    // Set initial side panel state
    chrome.storage.sync.get(['sidebarOpen'], function(result) {
        const isOpen = result.sidebarOpen || false;
        chrome.sidePanel.setOptions({
            enabled: isOpen,
            path: 'sidebar.html'
        }).catch(console.debug);
    });
}

// Start the service worker
initializeServiceWorker();

// Listen for connection from content scripts
chrome.runtime.onConnect.addListener((port) => {
    console.log('Connected to port:', port.name);
    
    port.onMessage.addListener((message) => {
        console.log('Received message in background:', message);
        
        if (message.action === 'detectEmotion') {
            detectEmotion(message.text)
                .then(emotion => {
                    console.log('Sending emotion response:', emotion);
                    port.postMessage({ 
                        action: 'emotionDetected',
                        messageId: message.messageId,
                        emotion: emotion
                    });
                })
                .catch(error => {
                    console.error('Error detecting emotion:', error);
                    port.postMessage({
                        action: 'emotionError',
                        messageId: message.messageId,
                        error: error.message
                    });
                });
        }
    });
    
    port.onDisconnect.addListener(() => {
        console.log('Port disconnected:', port.name);
    });
});

// Track API calls for rate limiting
let apiCalls = [];

// Load settings from storage
async function getSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get({
            apiKey: '',
            showEmojis: true,
            enableDarkMode: false
        }, resolve);
    });
}

// Check if we've hit the rate limit
function isRateLimited() {
    const now = Date.now();
    // Remove calls older than the time window
    apiCalls = apiCalls.filter(timestamp => now - timestamp < RATE_LIMIT.TIME_WINDOW);
    
    // Check if we've hit the limit
    return apiCalls.length >= RATE_LIMIT.MAX_REQUESTS;
}

// Get emotion from cache or API
async function detectEmotion(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return 'neutral';
    }

    const apiKey = (await getSettings()).apiKey;
    if (!apiKey) {
        throw new Error('No API key found. Please set your Hugging Face API key in the extension settings.');
    }

    const cacheKey = `emotion_${text.trim().toLowerCase()}`;
    
    // Check cache first
    const cached = await new Promise(resolve => 
        chrome.storage.local.get([cacheKey], result => resolve(result[cacheKey]))
    );
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION_MS) {
        return cached.emotion;
    }

    // Check rate limit
    const now = Date.now();
    apiCalls = apiCalls.filter(timestamp => now - timestamp < RATE_LIMIT.TIME_WINDOW);
    
    if (apiCalls.length >= RATE_LIMIT.MAX_REQUESTS) {
        throw new Error(`Rate limit exceeded. Please wait before making more requests.`);
    }

    try {
        console.log('Making API request to Hugging Face...');
        
        // New Hugging Face Inference API endpoint
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${MODEL}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    inputs: text,
                    options: {
                        use_cache: true,
                        wait_for_model: true
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            // If we get a 410 error, provide a more helpful message
            if (response.status === 410) {
                throw new Error('The Hugging Face API endpoint has changed. Please update the extension to the latest version.');
            }
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
        }
        
        const result = await response.json();
        
        // Process the response to get the dominant emotion
        if (Array.isArray(result) && result.length > 0) {
            // The response structure is an array of objects with label and score
            const emotions = Array.isArray(result[0]) ? result[0] : result;
            
            // Sort by score in descending order and get the first (highest) score
            const sortedScores = emotions.sort((a, b) => b.score - a.score);
            const dominantEmotion = sortedScores[0].label.toLowerCase();
            
            // Cache the result
            const cacheData = {
                emotion: dominantEmotion,
                timestamp: Date.now(),
                scores: sortedScores.reduce((acc, { label, score }) => ({
                    ...acc,
                    [label]: score
                }), {})
            };
            
            await new Promise(resolve => 
                chrome.storage.local.set({ [cacheKey]: cacheData }, resolve)
            );
            
            return dominantEmotion;
        }
        
        return 'neutral';
    } catch (error) {
        console.error('Error detecting emotion:', error);
        throw error;
    }
}

// Helper function for fetch with retry
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10) * 1000;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                continue;
            }
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
        }
    }
}

// Clean up old cache entries
function cleanupCache() {
    chrome.storage.local.get(null, items => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 1 day in ms
        const toRemove = [];
        
        for (const key in items) {
            if (key.startsWith('emotion_') && (now - items[key].timestamp) > oneDay) {
                toRemove.push(key);
            }
        }
        
        if (toRemove.length > 0) {
            chrome.storage.local.remove(toRemove);
        }
    });
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectEmotion') {
        detectEmotion(request.text)
            .then(emotion => sendResponse({ success: true, emotion }))
            .catch(error => {
                console.error('Error in emotion detection:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || 'Failed to detect emotion' 
                });
            });
        return true; // Required for async sendResponse
    } else if (request.action === 'getRateLimitStatus') {
        const remaining = Math.max(0, RATE_LIMIT.MAX_REQUESTS - apiCalls.length);
        sendResponse({ 
            remaining,
            total: RATE_LIMIT.MAX_REQUESTS,
            resetIn: RATE_LIMIT.TIME_WINDOW / 1000 // in seconds
        });
    } else if (request.action === 'clearCache') {
        chrome.storage.local.get(null, items => {
            const emotionKeys = Object.keys(items).filter(key => key.startsWith('emotion_'));
            chrome.storage.local.remove(emotionKeys, () => {
                sendResponse({ success: true });
            });
        });
        return true; // Required for async sendResponse
    }
});

// Clear old API calls periodically
setInterval(() => {
    const now = Date.now();
    apiCalls = apiCalls.filter(timestamp => now - timestamp < RATE_LIMIT.TIME_WINDOW);
}, 60000); // Check every minute

// Initial cleanup
cleanupCache();
