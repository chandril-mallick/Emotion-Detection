// Simple script to create placeholder icons
const fs = require('fs');
const path = require('path');

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
    console.log('✅ Created images directory');
}

// Create simple SVG icons
const createIcon = (size, filename) => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}px" height="${size}px" viewBox="0 0 ${size} ${size}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#25D366"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white"/>
    <circle cx="${size/2 - size/6}" cy="${size/2 - size/8}" r="${size/10}" fill="#25D366"/>
    <circle cx="${size/2 + size/6}" cy="${size/2 - size/8}" r="${size/10}" fill="#25D366"/>
    <path d="M${size/4} ${size/1.8} Q${size/2} ${size/1.5} ${size/1.33} ${size/1.8}" stroke="#25D366" stroke-width="${size/15}" fill="none" />
</svg>`;
    
    fs.writeFileSync(path.join(imagesDir, filename), svg);
    console.log(`✅ Created ${filename}`);
};

// Create all required icon sizes
createIcon(16, 'icon16.png');
createIcon(48, 'icon48.png');
createIcon(128, 'icon128.png');

console.log('\n🎉 Icons created successfully!');
