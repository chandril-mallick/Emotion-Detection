// Options page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(
        ['apiKey', 'showEmojis', 'enableDarkMode'], 
        function(settings) {
            document.getElementById('apiKey').value = settings.apiKey || '';
            document.getElementById('showEmojis').checked = settings.showEmojis !== false; // Default to true
            document.getElementById('enableDarkMode').checked = !!settings.enableDarkMode;
        }
    );

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', function() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const showEmojis = document.getElementById('showEmojis').checked;
        const enableDarkMode = document.getElementById('enableDarkMode').checked;

        chrome.storage.sync.set({
            apiKey,
            showEmojis,
            enableDarkMode
        }, function() {
            showStatus('Settings saved successfully!', 'success');
            // Notify content script about settings change
            chrome.tabs.query({url: "*://web.whatsapp.com/*"}, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: { showEmojis, enableDarkMode }
                    });
                });
            });
        });
    });

    // Clear cache
    document.getElementById('clearCache').addEventListener('click', function() {
        chrome.storage.local.remove('emotionCache', function() {
            showStatus('Emotion cache cleared!', 'success');
        });
    });

    // Helper function to show status messages
    function showStatus(message, type = 'success') {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => {
                statusEl.style.display = 'none';
                statusEl.style.opacity = '1';
            }, 500);
        }, 3000);
    }
});
