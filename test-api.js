// Test script for Hugging Face API
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, 'chrome-extension/.env') });

async function testApiKey() {
    const apiKey = process.env.HUGGING_FACE_API_KEY;
    
    if (!apiKey || !apiKey.startsWith('hf_')) {
        console.error('❌ Invalid API key format');
        return;
    }
    
    console.log('🔑 API Key found');
    console.log('🚀 Testing API connection...');
    
    try {
        // Use the new inference endpoint
        const response = await fetch('https://api-inference.huggingface.co/models/arpanghoshal/EmoRoBERTa', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                inputs: 'I love this product!',
                options: { 
                    wait_for_model: true,
                    use_cache: true
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ API Key is working!');
            console.log('📊 Detected Emotion:', result[0][0]);
            console.log('🔍 Full response:', JSON.stringify(result[0], null, 2));
        } else {
            const error = await response.json();
            console.error('❌ API Error:', error);
        }
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testApiKey();
