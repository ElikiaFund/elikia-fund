// One-off script to resize the real mobile app icon (black background, white "ElikiaFund"
// wordmark) down to the 180×180 apple-icon.png Next.js expects. Not part of the build — run
// manually if the source icon ever changes.
import sharp from 'sharp';

await sharp('../mobile/assets/images/icon.png').resize(180, 180).png().toFile('src/app/apple-icon.png');

console.log('apple-icon.png generated');
