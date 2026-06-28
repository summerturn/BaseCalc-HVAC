// Renders BaseCalc HVAC app-icon CONCEPTS for review.
// Run: node scripts/icon-concepts.mjs   →   design/concepts/*.png
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'design', 'concepts');
mkdirSync(OUT, { recursive: true });

// Bold, clean lightning bolt centered in a 1024 box.
function bolt(fill, { scale = 1, cx = 512, cy = 512 } = {}) {
  const p = 'M596 150 L372 566 L500 566 L436 874 L676 446 L548 446 L612 150 Z';
  const t = `translate(${cx - 512 * scale} ${cy - 512 * scale}) scale(${scale})`;
  return `<path d="${p}" transform="${t}" fill="${fill}" stroke="${fill}" stroke-width="6" stroke-linejoin="round"/>`;
}

function grid(step, color) {
  let s = '';
  for (let x = step; x < 1024; x += step) s += `<line x1="${x}" y1="0" x2="${x}" y2="1024" stroke="${color}" stroke-width="2"/>`;
  for (let y = step; y < 1024; y += step) s += `<line x1="0" y1="${y}" x2="1024" y2="${y}" stroke="${color}" stroke-width="2"/>`;
  return s;
}

const defs = `
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1A2233"/><stop offset="0.5" stop-color="#0C0F18"/><stop offset="1" stop-color="#05070B"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.30" r="0.62">
    <stop offset="0" stop-color="#FFB020" stop-opacity="0.55"/><stop offset="0.5" stop-color="#F59E0B" stop-opacity="0.12"/><stop offset="1" stop-color="#F59E0B" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="boltg" x1="0.2" y1="0" x2="0.5" y2="1">
    <stop offset="0" stop-color="#FFE48F"/><stop offset="0.45" stop-color="#FFB020"/><stop offset="1" stop-color="#EE8A00"/>
  </linearGradient>
  <radialGradient id="vign" cx="0.5" cy="0.42" r="0.75">
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.40"/>
  </radialGradient>
  <linearGradient id="ambg" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="#FFC24D"/><stop offset="0.5" stop-color="#FFB020"/><stop offset="1" stop-color="#F08A00"/>
  </linearGradient>`;

// A — Hero bolt (minimal, premium)
const A = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${defs}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <ellipse cx="512" cy="300" rx="560" ry="520" fill="url(#glow)"/>
  ${bolt('url(#boltg)', { scale: 1.04 })}
  <rect width="1024" height="1024" fill="url(#vign)"/></svg>`;

// B — Bolt + blueprint grid (technical / calculator)
const B = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${defs}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g opacity="0.6">${grid(128, 'rgba(255,255,255,0.05)')}</g>
  <ellipse cx="512" cy="300" rx="560" ry="520" fill="url(#glow)"/>
  ${bolt('url(#boltg)', { scale: 1.0 })}
  <rect width="1024" height="1024" fill="url(#vign)"/></svg>`;

// C — Bolt in a gauge ring (field instrument)
function ticks() {
  let s = '';
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 - Math.PI / 2;
    const r1 = 392, r2 = i % 4 === 0 ? 360 : 374;
    const x1 = 512 + Math.cos(a) * r1, y1 = 512 + Math.sin(a) * r1;
    const x2 = 512 + Math.cos(a) * r2, y2 = 512 + Math.sin(a) * r2;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,176,32,0.30)" stroke-width="${i % 4 === 0 ? 7 : 3}" stroke-linecap="round"/>`;
  }
  return s;
}
const C = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${defs}</defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <ellipse cx="512" cy="320" rx="540" ry="500" fill="url(#glow)"/>
  <circle cx="512" cy="512" r="420" fill="none" stroke="rgba(255,176,32,0.16)" stroke-width="10"/>
  ${ticks()}
  ${bolt('url(#boltg)', { scale: 0.82, cy: 512 })}
  <rect width="1024" height="1024" fill="url(#vign)"/></svg>`;

// D — Amber plate (inverted: dark bolt on amber) — bold at small sizes
const D = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${defs}
  <radialGradient id="ag" cx="0.5" cy="0.32" r="0.85"><stop offset="0" stop-color="#FFC861"/><stop offset="0.55" stop-color="#FFB020"/><stop offset="1" stop-color="#E07A00"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#ag)"/>
  ${bolt('#15110A', { scale: 1.04 })}
  <rect width="1024" height="1024" fill="url(#vign)" opacity="0.5"/></svg>`;

const concepts = { 'A-hero': A, 'B-grid': B, 'C-gauge': C, 'D-plate': D };
for (const [name, svg] of Object.entries(concepts)) {
  await sharp(Buffer.from(svg)).png().resize(360, 360).toFile(join(OUT, `${name}.png`));
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, `${name}-1024.png`));
  console.log(`✓ ${name}`);
}
console.log('Concepts in design/concepts/');
