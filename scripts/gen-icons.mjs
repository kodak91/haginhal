import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

// Use the real logo (already has green background)
const logoPath = join(publicDir, 'haginhal_logo.png');

// For maskable icon: add ~12% padding on all sides (safe zone requirement)
const makeMaskable = async (size) => {
  const padding = Math.round(size * 0.12);
  const inner = size - padding * 2;
  const resized = await sharp(logoPath).resize(inner, inner).toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      // Same green as the logo background
      background: { r: 76, g: 219, b: 141, alpha: 1 },
    },
  })
    .composite([{ input: resized, top: padding, left: padding }])
    .png()
    .toBuffer();
};

const sizes = [
  { name: 'icon-192.png',        size: 192, mode: 'any'      },
  { name: 'icon-512.png',        size: 512, mode: 'any'      },
  { name: 'icon-512-maskable.png', size: 512, mode: 'maskable' },
  { name: 'apple-touch-icon.png', size: 180, mode: 'apple'   },
  { name: 'favicon-32.png',      size: 32,  mode: 'any'      },
  { name: 'favicon-16.png',      size: 16,  mode: 'any'      },
];

for (const { name, size, mode } of sizes) {
  if (mode === 'maskable') {
    const buf = await makeMaskable(size);
    const { writeFileSync } = await import('fs');
    writeFileSync(join(publicDir, name), buf);
  } else if (mode === 'apple') {
    // Apple touch icon: rounded corners
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="white"/>
       </svg>`
    );
    await sharp(logoPath)
      .resize(size, size)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(join(publicDir, name));
  } else {
    await sharp(logoPath).resize(size, size).png().toFile(join(publicDir, name));
  }
  console.log(`✓ ${name} (${size}px)`);
}

// favicon.ico — embed 32px and 16px PNGs into a minimal .ico file
const p32 = await sharp(logoPath).resize(32, 32).png().toBuffer();
const p16 = await sharp(logoPath).resize(16, 16).png().toBuffer();

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);  // reserved
icoHeader.writeUInt16LE(1, 2);  // type: ICO
icoHeader.writeUInt16LE(2, 4);  // count: 2 images

const dirEntry = (size, dataLen, offset) => {
  const b = Buffer.alloc(16);
  b.writeUInt8(size, 0);   // width
  b.writeUInt8(size, 1);   // height
  b.writeUInt8(0, 2);      // color count (0 = trucolor)
  b.writeUInt8(0, 3);      // reserved
  b.writeUInt16LE(1, 4);   // color planes
  b.writeUInt16LE(32, 6);  // bits per pixel
  b.writeUInt32LE(dataLen, 8);  // size of image data
  b.writeUInt32LE(offset, 12);  // offset of image data
  return b;
};

const dataOffset = 6 + 16 * 2;            // header + 2 dir entries
const dir32 = dirEntry(32, p32.length, dataOffset);
const dir16 = dirEntry(16, p16.length, dataOffset + p32.length);

import { writeFileSync } from 'fs';
const ico = Buffer.concat([icoHeader, dir32, dir16, p32, p16]);
writeFileSync(join(publicDir, 'favicon.ico'), ico);
console.log('✓ favicon.ico (16+32px)');

console.log('\nAll icons generated.');
