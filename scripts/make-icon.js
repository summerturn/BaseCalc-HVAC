// Generates BaseCalc HVAC app icons from an SVG "field instrument" mark:
// an amber lightning bolt sitting on a meter dial of tick marks.
// Run: node scripts/make-icon.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets');

// MaterialIcons "bolt" path (24x24) — same mark used in-app.
const BOLT = 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z';

// Build a ring of dial ticks centered at (cx,cy).
function ticks(cx, cy, radius, { count = 60, len = 20, major = 5, color = '#FFB020', opacity = 0.30 } = {}) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % major === 0;
    const l = isMajor ? len * 1.7 : len;
    const w = isMajor ? 5 : 3;
    const op = isMajor ? Math.min(1, opacity + 0.25) : opacity;
    const x1 = cx + Math.cos(a) * radius;
    const y1 = cy + Math.sin(a) * radius;
    const x2 = cx + Math.cos(a) * (radius - l);
    const y2 = cy + Math.sin(a) * (radius - l);
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  }
  return out;
}

// boltGroup at center (cx,cy) scaled by `scale`, filled with `fill`.
function bolt(cx, cy, scale, fill) {
  const tx = cx - 12 * scale;
  const ty = cy - 12 * scale;
  return `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale})"><path d="${BOLT}" fill="${fill}"/></g>`;
}

function iconSvg({ size = 1024, bleed = true, glow = true, content = true } = {}) {
  const cx = size / 2, cy = size / 2;
  const ringR = bleed ? size * 0.42 : size * 0.40;
  const boltScale = (bleed ? size * 0.030 : size * 0.028);
  const defs = `
    <defs>
      <radialGradient id="bg" cx="50%" cy="42%" r="75%">
        <stop offset="0%" stop-color="#161B26"/>
        <stop offset="55%" stop-color="#0C0F16"/>
        <stop offset="100%" stop-color="#06080C"/>
      </radialGradient>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFB020" stop-opacity="0.55"/>
        <stop offset="45%" stop-color="#F59E0B" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFD66B"/>
        <stop offset="48%" stop-color="#FFB020"/>
        <stop offset="100%" stop-color="#F0900A"/>
      </linearGradient>
    </defs>`;
  const bgRect = bleed ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>` : '';
  const haloEl = glow ? `<circle cx="${cx}" cy="${cy}" r="${size * 0.34}" fill="url(#halo)"/>` : '';
  const ringEl = content
    ? `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#FFB020" stroke-width="2.5" opacity="0.16"/>${ticks(cx, cy, ringR, { len: size * 0.022 })}`
    : '';
  const boltEl = content ? bolt(cx, cy, boltScale, 'url(#boltGrad)') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}${bgRect}${ringEl}${haloEl}${boltEl}</svg>`;
}

function monoSvg(size = 1024) {
  const cx = size / 2, cy = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bolt(cx, cy, size * 0.028, '#ffffff')}</svg>`;
}

async function render(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, file));
  console.log('wrote', file);
}

(async () => {
  // Full-bleed iOS / store icon
  await render(iconSvg({ size: 1024, bleed: true }), 'icon.png', 1024);
  // Splash mark — transparent bg (splash bg color comes from app config)
  await render(iconSvg({ size: 1024, bleed: false, glow: true }), 'splash-icon.png', 1024);
  // Android adaptive foreground — padded inside safe zone, transparent bg
  const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <g transform="translate(512 512) scale(0.62) translate(-512 -512)">${iconSvg({ size: 1024, bleed: false, glow: true }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></svg>`;
  await render(fg, 'android-icon-foreground.png', 1024);
  // Android adaptive background — gradient only
  await render(iconSvg({ size: 1024, bleed: true, glow: false, content: false }), 'android-icon-background.png', 1024);
  // Android monochrome — white silhouette
  await render(monoSvg(1024), 'android-icon-monochrome.png', 1024);
  // Web favicon
  await render(iconSvg({ size: 256, bleed: true }), 'favicon.png', 64);
})();
