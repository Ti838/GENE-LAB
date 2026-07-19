const fs = require('fs');
const path = require('path');

const themePath = path.join(__dirname, 'frontend', 'theme.css');

// Read the raw buffer
const buffer = fs.readFileSync(themePath);

// Check if it's UTF-16 LE by looking for the BOM or just null bytes
let isUTF16 = false;
if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    isUTF16 = true;
} else if (buffer.length > 4 && buffer[1] === 0x00 && buffer[3] === 0x00) {
    // No BOM, but has null bytes (typical for ascii chars in utf-16 le)
    isUTF16 = true;
}

if (isUTF16) {
    // Read as UTF-16 LE
    let content = buffer.toString('utf16le');
    // Save as UTF-8
    fs.writeFileSync(themePath, content, 'utf8');
    console.log("Converted theme.css from UTF-16 LE to UTF-8");
} else {
    console.log("theme.css is already UTF-8 or not UTF-16 LE");
}
