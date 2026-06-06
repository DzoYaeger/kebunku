// Generate ikon PWA PNG (192 & 512) tanpa dependency: emerald rounded + simbol daun.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.18; // sudut membulat
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);

  const inRounded = (x, y) => {
    const m = size * 0.06; // margin
    const left = m, right = size - m, top = m, bottom = size - m;
    if (x < left + radius && y < top + radius)
      return (x - (left + radius)) ** 2 + (y - (top + radius)) ** 2 <= radius ** 2;
    if (x > right - radius && y < top + radius)
      return (x - (right - radius)) ** 2 + (y - (top + radius)) ** 2 <= radius ** 2;
    if (x < left + radius && y > bottom - radius)
      return (x - (left + radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius ** 2;
    if (x > right - radius && y > bottom - radius)
      return (x - (right - radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius ** 2;
    return x >= left && x <= right && y >= top && y <= bottom;
  };

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const off = y * stride + 1 + x * 4;
      let r = 0, g = 0, b = 0, a = 0;
      if (inRounded(x, y)) {
        // background emerald
        r = 25; g = 135; b = 84; a = 255;
        // "daun": dua elips putih membentuk bentuk daun di tengah
        const dx = x - cx;
        const dy = y - cy;
        const leaf = (dx * 0.9 + dy * 0.9) ** 2 / (size * 0.30) ** 2 +
          (dx * 0.9 - dy * 0.9) ** 2 / (size * 0.12) ** 2;
        if (leaf <= 1) { r = 255; g = 255; b = 255; }
      }
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/pwa-192x192.png', makePng(192));
writeFileSync('public/pwa-512x512.png', makePng(512));
console.log('icons generated');
