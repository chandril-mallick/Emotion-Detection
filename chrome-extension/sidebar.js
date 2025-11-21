// Emotion to emoji mapping
const EMOTION_EMOJIS = {
    'anger': '😠',
    'disgust': '🤢',
    'fear': '😨',
    'joy': '😊',
    'neutral': '😐',
    'sadness': '😢',
    'surprise': '😲',
    'love': '❤️',
    'hate': '💢',
    'fun': '😂',
    'sarcasm': '😏',
    'excitement': '😃',
    'boredom': '🥱',
    'relief': '😌',
    'gratitude': '🙏',
    'pride': '🦁',
    'guilt': '😔',
    'shame': '😳',
    'disappointment': '😞',
    'disapproval': '👎',
    'nervousness': '😬',
    'optimism': '😊',
    'confusion': '😕',
    'curiosity': '🤔',
    'desire': '😍',
    'disapproval': '👎',
    'embarrassment': '😳',
    'grief': '😢',
    'gratitude': '🙏',
    'happiness': '😊',
    'hopefulness': '🤞',
    'jealousy': '😒',
    'loneliness': '😔',
    'love': '❤️',
    'nervousness': '😬',
    'optimism': '😊',
    'pride': '🦁',
    'realization': '💡',
    'relief': '😌',
    'remorse': '😔',
    'sadness': '😢',
    'shame': '😳',
    'surprise': '😲',
    'neutral': '😐'
};

// Get DOM elements
const emotionList = document.getElementById('emotionList');
const clearBtn = document.getElementById('clearBtn');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EMOTION_DETECTED') {
        addEmotionToSidebar(request.emotion, request.text);
    }
    return true;
});

// Add emotion to sidebar
function addEmotionToSidebar(emotionData, text) {
    // Remove "no emotions" message if it exists
    const noEmotions = document.querySelector('.no-emotions');
    if (noEmotions) {
        noEmotions.remove();
    }

    // Create emotion element
    const emotionItem = document.createElement('div');
    emotionItem.className = 'emotion-item';
    
    // Get the top emotion
    const topEmotion = emotionData[0];
    const emoji = EMOTION_EMOJIS[topEmotion.label] || '❓';
    
    // Create HTML for the emotion item
    emotionItem.innerHTML = `
        <span class="emotion-emoji">${emoji}</span>
        <span class="emotion-text">${truncateText(text, 30)}</span>
        <span class="emotion-score">${(topEmotion.score * 100).toFixed(0)}%</span>
    `;
    
    // Add click event to show full text
    emotionItem.addEventListener('click', () => {
        showFullText(text, emotionData);
    });
    
    // Add to the top of the list
    emotionList.insertBefore(emotionItem, emotionList.firstChild);
}

// Truncate long text
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Show full text and all emotions in a modal
function showFullText(text, emotions) {
    // Create modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.background = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '80%';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflow = 'auto';
    
    // Add text
    const textElement = document.createElement('p');
    textElement.textContent = text;
    textElement.style.marginBottom = '16px';
    modalContent.appendChild(textElement);
    
    // Add emotions
    const emotionsTitle = document.createElement('h4');
    emotionsTitle.textContent = 'Emotion Analysis:';
    emotionsTitle.style.marginBottom = '8px';
    modalContent.appendChild(emotionsTitle);
    
    emotions.forEach(emotion => {
        const emoji = EMOTION_EMOJIS[emotion.label] || '❓';
        const emotionElement = document.createElement('div');
        emotionElement.style.display = 'flex';
        emotionElement.style.justifyContent = 'space-between';
        emotionElement.style.marginBottom = '4px';
        emotionElement.innerHTML = `
            <span>${emoji} ${emotion.label}</span>
            <span>${(emotion.score * 100).toFixed(1)}%</span>
        `;
        modalContent.appendChild(emotionElement);
    });
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.marginTop = '16px';
    closeButton.style.padding = '8px 16px';
    closeButton.style.background = '#e74c3c';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Clear all emotions
clearBtn.addEventListener('click', () => {
    emotionList.innerHTML = '<div class="no-emotions">No emotions detected yet</div>';
    // Clear storage if needed
    chrome.storage.local.remove('emotionHistory');
});

// Message listener for receiving emotion data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EMOTION_DETECTED' && message.emotion && message.text) {
        addEmotionToSidebar(message.emotion, message.text);
    }
    return true; // Keep the message channel open for async response
});

// Load previous emotions on sidebar open
chrome.storage.local.get(['emotionHistory'], (result) => {
    const history = result.emotionHistory || [];
    if (history.length === 0) return;
    
    // Clear "no emotions" message
    const noEmotions = document.querySelector('.no-emotions');
    if (noEmotions) {
        noEmotions.remove();
    }
    
    // Add each emotion to the sidebar
    history.forEach(item => {
        addEmotionToSidebar(item.emotion, item.text);
    });
});
