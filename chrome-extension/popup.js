// Handle popup interactions
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on WhatsApp Web
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentUrl = tabs[0]?.url || '';
        const statusElement = document.querySelector('.status p');
        
        if (!currentUrl.includes('web.whatsapp.com')) {
            statusElement.textContent = 'Please open WhatsApp Web';
            statusElement.className = '';
        }
        
        // Load saved settings
        chrome.storage.sync.get({
            isEnabled: true,
            enableDarkMode: false,
            showEmojis: true,
            sidebarOpen: false
        }, function(settings) {
            // Set toggle states
            document.getElementById('toggleExtension').checked = settings.isEnabled;
            document.getElementById('toggleDarkMode').checked = settings.enableDarkMode;
            document.getElementById('toggleEmojis').checked = settings.showEmojis;
            
            // Update sidebar button text
            const sidebarBtn = document.getElementById('toggleSidebar');
            sidebarBtn.textContent = settings.sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar';
            
            // Toggle sidebar when button is clicked
            sidebarBtn.addEventListener('click', function() {
                const newState = !settings.sidebarOpen;
                
                // Update button text immediately for better UX
                this.textContent = newState ? 'Hide Sidebar' : 'Show Sidebar';
                
                // Save the new state
                chrome.storage.sync.set({ sidebarOpen: newState });
                
                // Toggle the sidebar
                chrome.sidePanel.setOptions({
                    enabled: newState,
                    path: 'sidebar.html'
                });
                
                // If opening the sidebar, also trigger the open method
                if (newState) {
                    chrome.sidePanel.open({ windowId: tabs[0].windowId });
                }
            });
        });
        
        // Toggle extension
        document.getElementById('toggleExtension').addEventListener('change', function() {
            chrome.storage.sync.set({ isEnabled: this.checked });
        });
        
        // Toggle dark mode
        document.getElementById('toggleDarkMode').addEventListener('change', function() {
            chrome.storage.sync.set({ enableDarkMode: this.checked });
        });
        
        // Toggle emojis
        document.getElementById('toggleEmojis').addEventListener('change', function() {
            chrome.storage.sync.set({ showEmojis: this.checked });
        });
    });
});
