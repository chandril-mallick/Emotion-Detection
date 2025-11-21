// Test script for the Chrome extension
(async function() {
    console.log('🔍 Testing extension API key...');
    
    // Load environment variables
    const env = {};
    const envContent = await fetch(chrome.runtime.getURL('.env')).then(r => r.text());
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim();
        }
    });
    
    const apiKey = env.HUGGING_FACE_API_KEY;
    
    if (!apiKey) {
        console.error('❌ No API key found in .env file');
        return;
    }
    
    console.log('🔑 Found API key in .env');
    
    // Test the API key
    try {
        console.log('🚀 Testing API connection...');
        const response = await fetch('https://api-inference.huggingface.co/models/arpanghoshal/EmoRoBERTa', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: 'I love this product!',
                options: { wait_for_model: true }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ API Key is working!');
            console.log('📊 Detected Emotion:', result[0][0]);
        } else {
            const error = await response.json();
            console.error('❌ API Error:', error);
        }
    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
})();
