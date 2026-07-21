// Generates BaseCalc HVAC marketing imagery:
//   • A continuous PANORAMA carousel — N iPhone frames (1284×2778) whose teal
//     airflow + glow flow seamlessly across frame edges, so they read as one
//     image when placed side-by-side in the App Store carousel.
//   • A landscape HERO (2400×1500) with three fanned devices + the wordmark.
//
// Reuses the real app-screen layouts from generate-store-screenshots.mjs.
// Pipeline: HTML -> headless Chrome @2x -> sharp downscale.
// Run: node scripts/generate-store-marketing.mjs
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ROOT, CHROME, T, rgba, FONTCSS, BODY, DISP, ICON,
  statusBar, tabBar, dashboard, ductSizing, filterVelocity, psychrometrics, history,
} from './generate-store-screenshots.mjs';

const TMP = join(tmpdir(), 'basecalc-marketing');
mkdirSync(TMP, { recursive: true });
const IW = 393; // logical screen width the app bodies are authored at

const render = (html, w, h, outPath) => {
  const htmlPath = join(TMP, `mk-${Math.random().toString(36).slice(2)}.html`);
  const rawPath = `${htmlPath}.png`;
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=2', `--window-size=${w},${h}`,
    '--virtual-time-budget=4000', `--screenshot=${rawPath}`, `file://${htmlPath}`,
  ], { stdio: 'ignore' });
  return sharp(rawPath).resize(w, h, { fit: 'fill' }).png().toFile(outPath);
};

// ── A phone, freely positioned / scaled / rotated ───────────────────────
function phone({ body, active, left, top, w, rot = 0, z = 1, platform = 'ios' }) {
  const baseW = 936, baseH = 1986, bezel = 18;
  const k = w / baseW;
  const h = baseH * k, bz = bezel * k, r = 92 * k;
  const sw = (baseW - bezel * 2) * k, sh = (baseH - bezel * 2) * k, scr = 74 * k;
  const scale = sw / IW, ih = sh / scale;
  const camera = platform === 'android'
    ? `<div style="position:absolute;top:${(bezel + 20) * k}px;left:50%;transform:translateX(-50%);width:${32 * k}px;height:${32 * k}px;border-radius:50%;background:#05070B;z-index:5"></div>`
    : `<div style="position:absolute;top:${(bezel + 22) * k}px;left:50%;transform:translateX(-50%);width:${250 * k}px;height:${64 * k}px;border-radius:${32 * k}px;background:#000;z-index:5"></div>`;
  const inner = `<div style="position:absolute;inset:0;background:radial-gradient(120% 60% at 50% -8%, ${rgba(T.amberB, 0.13)}, rgba(0,0,0,0) 60%),linear-gradient(180deg,#0b0e15,${T.bg})"></div>
    <div style="position:absolute;inset:0;opacity:.5;background-image:linear-gradient(${rgba('#ffffff', .028)} 1px,transparent 1px),linear-gradient(90deg,${rgba('#ffffff', .028)} 1px,transparent 1px);background-size:34px 34px"></div>
    <div style="position:relative;height:100%">${statusBar()}<div style="position:relative">${body}</div>${tabBar(active)}</div>`;
  return `<div style="position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);transform-origin:center center;z-index:${z}">
    <div style="position:absolute;inset:0;border-radius:${r}px;background:linear-gradient(160deg,#20262F,#0E1219 55%,#05070B);box-shadow:0 70px 110px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.10)"></div>
    <div style="position:absolute;left:${bz}px;top:${bz}px;width:${sw}px;height:${sh}px;border-radius:${scr}px;overflow:hidden;background:${T.bg}">
      <div style="position:absolute;top:0;left:0;width:${IW}px;height:${ih}px;transform:scale(${scale});transform-origin:top left">${inner}</div>
    </div>${camera}
  </div>`;
}

// ── Continuous backdrop (absolute coords; viewBox crops a frame's slice) ──
function wavePath(totalW, midY, amp, wl, step = 14) {
  let d = `M0 ${midY.toFixed(1)}`;
  for (let x = step; x <= totalW; x += step) {
    const y = midY - amp * Math.sin((x / wl) * 2 * Math.PI);
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}
function backdrop({ totalW, H, viewX, viewW, midY, amp, glowsAt, glowY }) {
  const gs = 86;
  let grid = '';
  for (let x = 0; x <= totalW; x += gs) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,255,0.028)" stroke-width="1"/>`;
  for (let y = 0; y <= H; y += gs) grid += `<line x1="0" y1="${y}" x2="${totalW}" y2="${y}" stroke="rgba(255,255,255,0.028)" stroke-width="1"/>`;
  const glows = glowsAt.map((cx) => `<ellipse cx="${cx}" cy="${glowY}" rx="${viewW * 0.6}" ry="${H * 0.2}" fill="url(#pg)"/>`).join('');
  const wl = 1040;
  const main = wavePath(totalW, midY, amp, wl);
  const ghost = wavePath(totalW, midY + 30, amp, wl);
  return `<svg width="${viewW}" height="${H}" viewBox="${viewX} 0 ${viewW} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">
    <defs>
      <linearGradient id="pbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151B29"/><stop offset="0.5" stop-color="#0C1019"/><stop offset="1" stop-color="#06080E"/></linearGradient>
      <linearGradient id="pa" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${totalW}" y2="0"><stop offset="0" stop-color="#CCFBF1"/><stop offset="0.5" stop-color="#2DD4BF"/><stop offset="1" stop-color="#0D9488"/></linearGradient>
      <radialGradient id="pg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2DD4BF" stop-opacity="0.30"/><stop offset="0.5" stop-color="#14B8A6" stop-opacity="0.07"/><stop offset="1" stop-color="#14B8A6" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="${totalW}" height="${H}" fill="url(#pbg)"/>
    ${grid}
    ${glows}
    <path d="${ghost}" fill="none" stroke="rgba(45,212,191,0.16)" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${main}" fill="none" stroke="url(#pa)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── Panorama frames ─────────────────────────────────────────────────────
const PANELS = [
  { body: dashboard, active: 'calc', l1: 'Run the math.', l2: 'In the field.', sub: 'HVAC calculators built for the trade.' },
  { body: ductSizing, active: 'calc', l1: 'Calculate duct', l2: 'dimensions.', sub: 'Round and rectangular results from entered CFM and velocity.' },
  { body: filterVelocity, active: 'calc', l1: 'Check filter', l2: 'velocity.', sub: 'Calculate face velocity and compare it with an entered target.' },
  { body: psychrometrics, active: 'calc', l1: 'Total, sensible,', l2: 'latent.', sub: 'Psychrometric loads in one readout.' },
  { body: history, active: 'his', l1: 'Keep the', l2: 'job record.', sub: 'Local calculation history, always offline.' },
];

async function panorama() {
  const W = 1284, H = 2778, N = PANELS.length, totalW = W * N;
  const phoneW = 884, phoneTop = 772;
  const glowsAt = PANELS.map((_, i) => i * W + W / 2);
  const outDir = join(ROOT, 'store-assets', 'panorama');
  mkdirSync(outDir, { recursive: true });
  console.log(`\npanorama (${N}× ${W}×${H}, continuous ${totalW}px) → store-assets/panorama/`);
  for (let i = 0; i < N; i++) {
    const p = PANELS[i];
    const bg = backdrop({ totalW, H, viewX: i * W, viewW: W, midY: 446, amp: 116, glowsAt, glowY: H * 0.155 });
    const head = `<div style="position:absolute;top:150px;left:80px;width:${W - 160}px;text-align:center;z-index:9">
      <div style="font-family:${DISP};font-weight:900;font-size:78px;line-height:86px;letter-spacing:-1px"><span style="color:${T.text}">${p.l1}</span> <span style="color:${T.amberB}">${p.l2}</span></div>
      <div style="font-family:${BODY};font-weight:500;font-size:35px;color:${T.muted};margin-top:18px">${p.sub}</div>
    </div>`;
    const ph = phone({ body: p.body(), active: p.active, left: (W - phoneW) / 2, top: phoneTop, w: phoneW, z: 4 });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTCSS}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
.page{position:relative;width:${W}px;height:${H}px;font-family:${BODY}}
.vign{position:absolute;inset:0;background:radial-gradient(95% 80% at 50% 60%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.34) 100%);z-index:6}
</style></head><body><div class="page">${bg}${head}${ph}<div class="vign"></div></div></body></html>`;
    await render(html, W, H, join(outDir, `${String(i + 1).padStart(2, '0')}-panorama.png`));
    console.log(`  ✓ ${String(i + 1).padStart(2, '0')}-panorama.png`);
  }
  // Also stitch a single full-width strip for previewing the seam continuity.
  const slices = [];
  for (let i = 0; i < N; i++) slices.push({ input: join(outDir, `${String(i + 1).padStart(2, '0')}-panorama.png`), left: i * W, top: 0 });
  await sharp({ create: { width: totalW, height: H, channels: 3, background: '#06080E' } })
    .composite(slices).png().toFile(join(outDir, '00-stitched-preview.png'));
  console.log('  ✓ 00-stitched-preview.png (full strip)');
}

async function googlePanorama() {
  const W = 1080, H = 1920, N = PANELS.length, totalW = W * N;
  const phoneW = 680, phoneTop = 470;
  const glowsAt = PANELS.map((_, i) => i * W + W / 2);
  const outDir = join(ROOT, 'store-assets', 'google-play', 'panorama');
  mkdirSync(outDir, { recursive: true });
  console.log(`\nGoogle Play panorama (${N}× ${W}×${H}) → store-assets/google-play/panorama/`);
  for (let i = 0; i < N; i++) {
    const p = PANELS[i];
    const bg = backdrop({ totalW, H, viewX: i * W, viewW: W, midY: 280, amp: 72, glowsAt, glowY: H * 0.14 });
    const head = `<div style="position:absolute;top:82px;left:48px;width:${W - 96}px;text-align:center;z-index:9">
      <div style="font-family:${DISP};font-weight:900;font-size:60px;line-height:66px"><span style="color:${T.text}">${p.l1}</span> <span style="color:${T.amberB}">${p.l2}</span></div>
      <div style="font-family:${BODY};font-weight:500;font-size:27px;color:${T.muted};margin-top:12px">${p.sub}</div>
    </div>`;
    const ph = phone({ body: p.body(), active: p.active, left: (W - phoneW) / 2, top: phoneTop, w: phoneW, z: 4, platform: 'android' });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTCSS}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
.page{position:relative;width:${W}px;height:${H}px;font-family:${BODY}}
.vign{position:absolute;inset:0;background:radial-gradient(95% 80% at 50% 60%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.34) 100%);z-index:6}
</style></head><body><div class="page">${bg}${head}${ph}<div class="vign"></div></div></body></html>`;
    await render(html, W, H, join(outDir, `${String(i + 1).padStart(2, '0')}-panorama.png`));
    console.log(`  ✓ ${String(i + 1).padStart(2, '0')}-panorama.png`);
  }
}

// ── Hero ────────────────────────────────────────────────────────────────
async function hero() {
  const W = 2400, H = 1500;
  const bg = backdrop({ totalW: W, H, viewX: 0, viewW: W, midY: 980, amp: 150, glowsAt: [W * 0.5], glowY: H * 0.28 });
  const center = phone({ body: dashboard(), active: 'calc', left: W / 2 - 300, top: 372, w: 600, z: 5 });
  const leftP = phone({ body: filterVelocity(), active: 'calc', left: 360, top: 470, w: 486, rot: -9, z: 3 });
  const rightP = phone({ body: ductSizing(), active: 'calc', left: 1554, top: 470, w: 486, rot: 9, z: 3 });
  const header = `<div style="position:absolute;top:96px;left:0;width:${W}px;text-align:center;z-index:8">
    <div style="display:inline-flex;align-items:center;gap:26px">
      <img src="file://${ICON}" style="width:118px;height:118px;border-radius:30px;box-shadow:0 18px 40px rgba(0,0,0,0.5)"/>
      <div style="font-family:${DISP};font-weight:900;font-size:104px;line-height:104px;letter-spacing:-1px"><span style="color:${T.text}">BASE</span><span style="color:${T.amberB}">CALC</span> <span style="color:${T.muted};font-size:60px;letter-spacing:6px">HVAC</span></div>
    </div>
    <div style="font-family:${BODY};font-weight:500;font-size:42px;color:${T.dim};margin-top:24px">BTU, airflow, duct, and manufacturer-data checks for HVAC field work.</div>
  </div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FONTCSS}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
.page{position:relative;width:${W}px;height:${H}px;font-family:${BODY}}
.vign{position:absolute;inset:0;background:radial-gradient(80% 75% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%);z-index:6}
</style></head><body><div class="page">${bg}<div class="vign"></div>${leftP}${rightP}${center}${header}</div></body></html>`;
  const outDir = join(ROOT, 'store-assets', 'hero');
  mkdirSync(outDir, { recursive: true });
  console.log(`\nhero (${W}×${H}) → store-assets/hero/`);
  const heroPath = join(outDir, 'hero.png');
  await render(html, W, H, heroPath);
  console.log('  ✓ hero.png');
  const featureDir = join(ROOT, 'store-assets', 'google-play');
  mkdirSync(featureDir, { recursive: true });
  await sharp(heroPath)
    .resize({ width: 1024 })
    .extract({ left: 0, top: 0, width: 1024, height: 500 })
    .png()
    .toFile(join(featureDir, 'feature-graphic.png'));
  console.log('  ✓ google-play/feature-graphic.png');
}

const mode = process.argv[2];
if (!mode || mode === 'panorama') await panorama();
if (!mode || mode === 'google-panorama') await googlePanorama();
if (!mode || mode === 'hero') await hero();
console.log('\nDone.');
