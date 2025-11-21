// This script generates simple placeholder icons for the extension
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

function generateIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#25D366'; // WhatsApp green
    ctx.fillRect(0, 0, size, size);
    
    // Draw smiley face
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2); // Face
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#25D366';
    ctx.beginPath();
    ctx.arc(size/2 - size/6, size/2 - size/8, size/10, 0, Math.PI * 2); // Left eye
    ctx.arc(size/2 + size/6, size/2 - size/8, size/10, 0, Math.PI * 2); // Right eye
    ctx.fill();
    
    // Smile
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/4, 0.1 * Math.PI, 0.9 * Math.PI); // Smile
    ctx.lineWidth = size/15;
    ctx.strokeStyle = '#25D366';
    ctx.stroke();
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(imagesDir, filename), buffer);
}

// Generate all required icon sizes
generateIcon(16, 'icon16.png');
generateIcon(48, 'icon48.png');
generateIcon(128, 'icon128.png');

console.log('✅ Icons generated successfully!');
