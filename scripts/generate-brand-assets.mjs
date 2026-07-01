// Generates BaseCalc HVAC brand assets (icon, splash, adaptive icons, grid
// tiles, glow, logo lockups). Build-time only (devDependency `sharp`).
// Design: the BaseCalc "Measured Current" instrument vibe — a dark precision
// field with a blueprint grid and a single living accent — retuned for HVAC:
// a teal airflow-streamlines mark (moving air) in place of the AC waveform.
// Run: node scripts/generate-brand-assets.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');
const SAIRA_BLACK = join(ROOT, 'node_modules/@expo-google-fonts/saira/900Black/Saira_900Black.ttf');
const SAIRA_BOLD = join(ROOT, 'node_modules/@expo-google-fonts/saira/700Bold/Saira_700Bold.ttf');

// ── Brand accent (HVAC: cool teal / aqua "climate") ─────────────────────
const BRAND = '#2DD4BF';       // bright teal — the living accent
const BRAND_DEEP = '#0D9488';  // deep teal — gradient floor
const BRAND_ICE = '#CCFBF1';   // ice highlight — gradient ceiling

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
    <stop offset="0" stop-color="#172A2C"/><stop offset="0.48" stop-color="#0A1416"/><stop offset="1" stop-color="#05090A"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.54" cy="0.34" r="0.66">
    <stop offset="0" stop-color="${BRAND}" stop-opacity="0.46"/><stop offset="0.48" stop-color="${BRAND_DEEP}" stop-opacity="0.12"/><stop offset="1" stop-color="${BRAND_DEEP}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="brand" x1="0.10" y1="0" x2="0.92" y2="1">
    <stop offset="0" stop-color="${BRAND_ICE}"/><stop offset="0.45" stop-color="${BRAND}"/><stop offset="1" stop-color="${BRAND_DEEP}"/>
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

// Airflow mark — three stacked laminar streamlines that bow and flick upward,
// the universal "moving air" cue, with a leading node and end terminals. Same
// flowing-line language as the Electric waveform, retuned for ventilation.
function monogram(S, { mono = false } = {}) {
  const scale = S / 1024;
  const tx = (value) => (value * scale).toFixed(2);
  const flow = mono ? '#FFFFFF' : 'url(#brand)';
  const ghost = mono ? 'rgba(255,255,255,0.18)' : 'rgba(45,212,191,0.18)';
  const dash = mono ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.22)';
  const node = mono ? '#FFFFFF' : '#E9FFFB';
  const term = mono ? '#FFFFFF' : 'url(#brand)';

  // Three airflow streamlines (top thin, middle hero, bottom short), each a
  // gentle hill that flicks up at the right tip like a breeze.
  const top = `M${tx(232)} ${tx(432)} C${tx(372)} ${tx(388)} ${tx(560)} ${tx(388)} ${tx(700)} ${tx(414)} C${tx(770)} ${tx(424)} ${tx(792)} ${tx(404)} ${tx(786)} ${tx(372)}`;
  const mid = `M${tx(150)} ${tx(534)} C${tx(322)} ${tx(486)} ${tx(584)} ${tx(486)} ${tx(760)} ${tx(516)} C${tx(842)} ${tx(530)} ${tx(866)} ${tx(504)} ${tx(856)} ${tx(468)}`;
  const bot = `M${tx(286)} ${tx(636)} C${tx(420)} ${tx(604)} ${tx(572)} ${tx(604)} ${tx(682)} ${tx(628)} C${tx(736)} ${tx(640)} ${tx(756)} ${tx(622)} ${tx(748)} ${tx(594)}`;

  return `<g filter="${mono ? '' : 'url(#softShadow)'}">
    <line x1="${tx(150)}" y1="${tx(534)}" x2="${tx(880)}" y2="${tx(534)}" stroke="${dash}" stroke-width="${tx(9)}" stroke-dasharray="${tx(13)} ${tx(40)}" stroke-linecap="round"/>
    <path d="${mid}" fill="none" stroke="${ghost}" stroke-width="${tx(58)}" stroke-linecap="round"/>
    <path d="${top}" fill="none" stroke="${flow}" stroke-width="${tx(54)}" stroke-linecap="round" opacity="${mono ? 1 : 0.82}"/>
    <path d="${mid}" fill="none" stroke="${flow}" stroke-width="${tx(80)}" stroke-linecap="round"/>
    <path d="${bot}" fill="none" stroke="${flow}" stroke-width="${tx(50)}" stroke-linecap="round" opacity="${mono ? 1 : 0.72}"/>
    <circle cx="${tx(150)}" cy="${tx(534)}" r="${tx(30)}" fill="${term}"/>
    <circle cx="${tx(786)}" cy="${tx(372)}" r="${tx(26)}" fill="${node}"/>
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
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#13211F"/><stop offset="1" stop-color="#080F0E"/></linearGradient>
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
      <stop offset="0" stop-color="${BRAND}" stop-opacity="0.85"/><stop offset="0.55" stop-color="${BRAND_DEEP}" stop-opacity="0.22"/><stop offset="1" stop-color="${BRAND_DEEP}" stop-opacity="0"/>
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
    <text x="902" y="238" fill="${BRAND}" font-size="150" font-weight="900" font-family="SairaIcon, Arial Black, Arial, sans-serif">CALC</text>
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
  render(iconSVG(1024), 'icon.png', { flatten: '#080F0E' }),
  render(splashSVG(1024), 'splash-icon.png'),
  render(adaptiveFgSVG(1024), 'android-icon-foreground.png'),
  render(monoFgSVG(1024), 'android-icon-monochrome.png'),
  render(adaptiveBgSVG(1024), 'android-icon-background.png'),
  render(iconSVG(64), 'favicon.png', { flatten: '#080F0E' }),
  render(gridTileSVG('rgba(255,255,255,0.05)'), 'grid-dark.png'),
  render(gridTileSVG('rgba(13,16,23,0.055)'), 'grid-light.png'),
  render(glowSVG(512), 'glow-amber.png'),
  render(logoLockupSVG({ dark: true }), 'logo-lockup-dark.png'),
  render(logoLockupSVG({ dark: false }), 'logo-lockup-light.png'),
]);

console.log('Brand assets generated');
