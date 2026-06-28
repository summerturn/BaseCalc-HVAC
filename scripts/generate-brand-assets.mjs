// Generates BaseCalc HVAC brand assets (icon, splash, adaptive icons, grid
// tiles, glow, logo lockups). Build-time only (devDependency `sharp`).
// Design: a premium BaseCalc "BC" monogram with an HVAC-themed mark.
// Run: node scripts/generate-brand-assets.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');
const SAIRA_BLACK = join(ROOT, 'node_modules/@expo-google-fonts/saira/900Black/Saira_900Black.ttf');
const SAIRA_BOLD = join(ROOT, 'node_modules/@expo-google-fonts/saira/700Bold/Saira_700Bold.ttf');

function fontCss() {
  return `
    @font-face{font-family:SairaIcon;font-weight:900;src:url('file://${SAIRA_BLACK}')}
    @font-face{font-family:SairaIcon;font-weight:700;src:url('file://${SAIRA_BOLD}')}
  `;
}

function gridLines(canvas, step, color) {
  let lines = '';
  for (let x = step; x < canvas; x += step) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${canvas}" stroke="${color}" stroke-width="${canvas * 0.002}"/>`;
  for (let y = step; y < canvas; y += step) lines += `<line x1="0" y1="${y}" x2="${canvas}" y2="${y}" stroke="${color}" stroke-width="${canvas * 0.002}"/>`;
  return lines;
}

const DEFS = `
  <style>${fontCss()}</style>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#182032"/><stop offset="0.48" stop-color="#0B0F18"/><stop offset="1" stop-color="#05070B"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.54" cy="0.34" r="0.66">
    <stop offset="0" stop-color="#FFB020" stop-opacity="0.46"/><stop offset="0.48" stop-color="#F59E0B" stop-opacity="0.12"/><stop offset="1" stop-color="#F59E0B" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="amber" x1="0.18" y1="0" x2="0.82" y2="1">
    <stop offset="0" stop-color="#FFE7A6"/><stop offset="0.45" stop-color="#FFB020"/><stop offset="1" stop-color="#E98500"/>
  </linearGradient>
  <linearGradient id="white" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C8D1DE"/>
  </linearGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.44" r="0.78">
    <stop offset="0.60" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
  </radialGradient>
  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="22" stdDeviation="26" flood-color="#000000" flood-opacity="0.42"/>
  </filter>`;

// AC waveform mark — a live sine sweep on a faint baseline, amber on dark.
function monogram(S, { mono = false } = {}) {
  const scale = S / 1024;
  const tx = (value) => (value * scale).toFixed(2);
  const wave = mono ? '#FFFFFF' : 'url(#amber)';
  const ghost = mono ? 'rgba(255,255,255,0.20)' : 'rgba(255,176,32,0.20)';
  const dash = mono ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.24)';
  const node = mono ? '#FFFFFF' : '#FFF6DF';
  const term = mono ? '#FFFFFF' : 'url(#amber)';

  return `<g filter="${mono ? '' : 'url(#softShadow)'}">
    <line x1="${tx(150)}" y1="${tx(512)}" x2="${tx(902)}" y2="${tx(512)}" stroke="${dash}" stroke-width="${tx(10)}" stroke-dasharray="${tx(14)} ${tx(42)}" stroke-linecap="round"/>
    <path d="M${tx(120)} ${tx(560)} C${tx(240)} ${tx(252)} ${tx(376)} ${tx(252)} ${tx(496)} ${tx(560)} C${tx(616)} ${tx(868)} ${tx(752)} ${tx(868)} ${tx(872)} ${tx(560)}" fill="none" stroke="${ghost}" stroke-width="${tx(56)}" stroke-linecap="round"/>
    <path d="M${tx(150)} ${tx(512)} C${tx(270)} ${tx(196)} ${tx(406)} ${tx(196)} ${tx(526)} ${tx(512)} C${tx(646)} ${tx(828)} ${tx(782)} ${tx(828)} ${tx(902)} ${tx(512)}" fill="none" stroke="${wave}" stroke-width="${tx(80)}" stroke-linecap="round"/>
    <circle cx="${tx(338)}" cy="${tx(275)}" r="${tx(40)}" fill="${node}"/>
    <circle cx="${tx(150)}" cy="${tx(512)}" r="${tx(30)}" fill="${term}"/>
    <circle cx="${tx(902)}" cy="${tx(512)}" r="${tx(30)}" fill="${term}"/>
  </g>`;
}

const iconSVG = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>${DEFS}</defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <g opacity="0.58">${gridLines(S, S / 8, 'rgba(255,255,255,0.052)')}</g>
  <ellipse cx="${S * 0.54}" cy="${S * 0.34}" rx="${S * 0.56}" ry="${S * 0.52}" fill="url(#glow)"/>
  ${monogram(S)}
  <rect width="${S}" height="${S}" fill="url(#vignette)"/>
</svg>`;

const splashSVG = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>${DEFS}</defs>
  <ellipse cx="${S / 2}" cy="${S / 2}" rx="${S * 0.43}" ry="${S * 0.43}" fill="url(#glow)"/>
  <g transform="translate(${S * 0.10} ${S * 0.10}) scale(0.80)">${monogram(S)}</g>
</svg>`;

const adaptiveFgSVG = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>${DEFS}</defs>
  <g transform="translate(${S * 0.12} ${S * 0.12}) scale(0.76)">${monogram(S)}</g>
</svg>`;

const monoFgSVG = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs><style>${fontCss()}</style></defs>
  <g transform="translate(${S * 0.12} ${S * 0.12}) scale(0.76)">${monogram(S, { mono: true })}</g>
</svg>`;

const adaptiveBgSVG = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#161B28"/><stop offset="1" stop-color="#0A0C11"/></linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <g opacity="0.5">${gridLines(S, S / 8, 'rgba(255,255,255,0.05)')}</g>
</svg>`;

const gridTileSVG = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34">
  <path d="M34 0 V34 M0 34 H34" stroke="${color}" stroke-width="1" fill="none"/>
</svg>`;

const glowSVG = (S) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="g" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFB020" stop-opacity="0.85"/><stop offset="0.55" stop-color="#FF9D2E" stop-opacity="0.22"/><stop offset="1" stop-color="#FF9D2E" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
</svg>`;

function logoTileSVG(S) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs>${DEFS}</defs>
    <rect width="${S}" height="${S}" rx="${S * 0.18}" fill="url(#bg)"/>
    <g opacity="0.52">${gridLines(S, S / 8, 'rgba(255,255,255,0.052)')}</g>
    <ellipse cx="${S * 0.54}" cy="${S * 0.34}" rx="${S * 0.54}" ry="${S * 0.50}" fill="url(#glow)"/>
    ${monogram(S)}
  </svg>`;
}

function stripSvg(svg) {
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

function logoLockupSVG({ dark }) {
  const fg = dark ? '#F3F5F9' : '#0F172A';
  const sub = dark ? '#A8B0BC' : '#5C6572';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="520" viewBox="0 0 1800 520">
    <defs>${DEFS}</defs>
    <g transform="translate(32 96)">${stripSvg(logoTileSVG(328))}</g>
    <text x="418" y="238" fill="${fg}" font-size="150" font-weight="900" font-family="SairaIcon, Arial Black, Arial, sans-serif">BASE</text>
    <text x="902" y="238" fill="#FFB020" font-size="150" font-weight="900" font-family="SairaIcon, Arial Black, Arial, sans-serif">CALC</text>
    <text x="424" y="324" fill="${sub}" font-size="52" font-weight="700" font-family="SairaIcon, Arial, sans-serif" letter-spacing="6">HVAC</text>
  </svg>`;
}

const out = (name) => join(ASSETS, name);
const render = (svg, file, { flatten } = {}) => {
  let pipeline = sharp(Buffer.from(svg)).png();
  if (flatten) pipeline = pipeline.flatten({ background: flatten });
  return pipeline.toFile(out(file));
};

await Promise.all([
  render(iconSVG(1024), 'icon.png', { flatten: '#0A0C11' }),
  render(splashSVG(1024), 'splash-icon.png'),
  render(adaptiveFgSVG(1024), 'android-icon-foreground.png'),
  render(monoFgSVG(1024), 'android-icon-monochrome.png'),
  render(adaptiveBgSVG(1024), 'android-icon-background.png'),
  render(iconSVG(64), 'favicon.png', { flatten: '#0A0C11' }),
  render(gridTileSVG('rgba(255,255,255,0.05)'), 'grid-dark.png'),
  render(gridTileSVG('rgba(13,16,23,0.055)'), 'grid-light.png'),
  render(glowSVG(512), 'glow-amber.png'),
  render(logoLockupSVG({ dark: true }), 'logo-lockup-dark.png'),
  render(logoLockupSVG({ dark: false }), 'logo-lockup-light.png'),
]);

console.log('Brand assets generated');
