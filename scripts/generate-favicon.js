const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  try {
    // Create favicon directory if it doesn't exist
    const faviconDir = path.join(__dirname, '..', 'public', 'favicon');
    if (!fs.existsSync(faviconDir)) {
      fs.mkdirSync(faviconDir, { recursive: true });
    }

    // Generate different sizes of favicon
    const sizes = [16, 32, 48, 64, 128, 256];
    
    for (const size of sizes) {
      await sharp(path.join(__dirname, '..', 'public', 'Udaman_Logo.webp'))
        .resize(size, size)
        .png()
        .toFile(path.join(faviconDir, `favicon-${size}x${size}.png`));
    }

    // Generate apple-touch-icon
    await sharp(path.join(__dirname, '..', 'public', 'Udaman_Logo.webp'))
      .resize(180, 180)
      .png()
      .toFile(path.join(faviconDir, 'apple-touch-icon.png'));

    console.log('✅ Favicon generated successfully!');
  } catch (error) {
    console.error('❌ Error generating favicon:', error);
  }
}

generateFavicon(); 