// Generates App Store marketing screenshots for BaseCalc HVAC.
//
// Each output (1290 x 2796, 6.9" iPhone) shows a faithful recreation of an app
// screen — built from the real theme tokens (src/theme/appTheme.ts), the real
// fonts (Saira / JetBrains Mono / MaterialIcons), the real component layouts,
// and seeded sample data — placed in an iPhone frame on the brand "Field
// Instrument" gradient (teal glow + blueprint grid) with a headline.
//
// Pipeline: HTML -> headless Chrome screenshot @2x -> sharp downscale.
// Run: node scripts/generate-store-screenshots.mjs
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONTS = join(ROOT, 'node_modules/@expo-google-fonts');
const MI_TTF = join(ROOT, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf');
const ICON = join(ROOT, 'assets/icon.png');
// Working dir lives OUTSIDE store-assets so raw 2x renders never get mistaken
// for upload-ready screenshots.
const TMP = join(tmpdir(), 'basecalc-store-shots');
mkdirSync(TMP, { recursive: true });
const seed = JSON.parse(readFileSync(join(ROOT, 'store-assets/seed/basecalc-seed.json'), 'utf8')).state;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ── Device geometry (App Store sizes) ───────────────────────────────────
// Each screen body is authored in logical points and reflows to `iw`, so the
// same markup renders on iPhone (393pt) and iPad (1024pt, real un-optimized layout).
const DEVICES = {
  iphone: {
    out: 'screenshots', W: 1284, H: 2778, iw: 393, island: true,
    phone: { w: 936, h: 1986, left: 174, top: 470, r: 92, bezel: 18 },
    screen: { w: 900, h: 1950, r: 74 },
    head: { top: 118, size: 76, lh: 84, subSize: 35, subTop: 18, pad: 80 },
    glowH: 1100, gridSize: 86, shadow: '0 60px 90px rgba(0,0,0,0.55)',
  },
  ipad: {
    out: 'screenshots-ipad', W: 2048, H: 2732, iw: 1024, island: false,
    phone: { w: 1604, h: 2125, left: 222, top: 470, r: 56, bezel: 22 },
    screen: { w: 1560, h: 2081, r: 34 },
    head: { top: 150, size: 92, lh: 100, subSize: 44, subTop: 22, pad: 170 },
    glowH: 1200, gridSize: 120, shadow: '0 70px 110px rgba(0,0,0,0.55)',
  },
  android: {
    out: 'google-play/screenshots', W: 1080, H: 1920, iw: 393, island: false,
    phone: { w: 786, h: 1572, left: 147, top: 300, r: 76, bezel: 16 },
    screen: { w: 754, h: 1540, r: 54 },
    head: { top: 92, size: 58, lh: 66, subSize: 27, subTop: 14, pad: 56 },
    glowH: 860, gridSize: 70, shadow: '0 50px 76px rgba(0,0,0,0.55)',
  },
};

// ── Theme (dark mode, from src/theme/appTheme.ts) ───────────────────────
const T = {
  bg: '#090B11', bgEl: '#10141F', panel: '#181E2B', panelEl: '#202838', inset: '#0D1119',
  border: 'rgba(255,255,255,0.13)', borderStrong: 'rgba(255,255,255,0.22)', divider: 'rgba(255,255,255,0.10)',
  text: '#F3F5F9', dim: '#C5CDD8', muted: '#A8B0BC', faint: '#7A8491',
  amber: '#14B8A6', amberB: '#2DD4BF', amberSoft: 'rgba(45,212,191,0.14)', onAmber: '#04201C',
  pass: '#34D399', passBg: 'rgba(52,211,153,0.12)', passBorder: 'rgba(52,211,153,0.32)',
  fail: '#FB7185', failBg: 'rgba(251,113,133,0.12)', failBorder: 'rgba(251,113,133,0.34)',
  info: '#38BDF8', placeholder: '#8A94A3',
};
// HVAC calculator category accents (from src/theme/appTheme.ts CATEGORY).
const CAT = { airflow: '#38BDF8', load: '#FB923C', duct: '#A78BFA', refrigerant: '#22C55E', psychrometrics: '#2DD4BF', hydronics: '#60A5FA', efficiency: '#84CC16', general: '#FBBF24' };
const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

// ── Fonts ───────────────────────────────────────────────────────────────
const ff = (fam, wt, file) => `@font-face{font-family:'${fam}';font-weight:${wt};font-style:normal;src:url('file://${join(FONTS, file)}')}`;
const FONTCSS = [
  ff('Saira', 500, 'saira/500Medium/Saira_500Medium.ttf'),
  ff('Saira', 600, 'saira/600SemiBold/Saira_600SemiBold.ttf'),
  ff('Saira', 700, 'saira/700Bold/Saira_700Bold.ttf'),
  ff('Saira', 900, 'saira/900Black/Saira_900Black.ttf'),
  ff('JBMono', 500, 'jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
  ff('JBMono', 700, 'jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
  `@font-face{font-family:'MI';src:url('file://${MI_TTF}')}`,
].join('\n');
const BODY = "'Saira',sans-serif", DISP = "'Saira',sans-serif", MONO = "'JBMono',monospace";
// font roles -> weight: body 500, label 600, heading 700, display 900
const mi = (name, size, color) => `<span style="font-family:'MI';font-size:${size}px;line-height:1;color:${color};font-feature-settings:'liga'">${name}</span>`;

// ── Shared screen pieces ────────────────────────────────────────────────
function statusBar() {
  // Preserve the safe-area spacing without drawing platform status icons into
  // store artwork. App Review treats Android-style glyphs in iOS screenshots as
  // inaccurate metadata.
  return '<div aria-hidden="true" style="height:54px"></div>';
}
const TABS = [
  { ic: 'ac_unit', label: 'Calculators', key: 'calc' },
  { ic: 'work_outline', label: 'Jobs', key: 'jobs' },
  { ic: 'inventory_2', label: 'Materials', key: 'mat' },
  { ic: 'history', label: 'History', key: 'his' },
  { ic: 'settings', label: 'Settings', key: 'set' },
];
function tabBar(active) {
  const items = TABS.map((t) => {
    const on = t.key === active;
    const col = on ? T.amberB : T.muted;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      ${mi(t.ic, 24, col)}
      <span style="font-family:${BODY};font-weight:600;font-size:10px;color:${col};letter-spacing:.2px">${t.label}</span>
    </div>`;
  }).join('');
  return `<div style="position:absolute;left:0;right:0;bottom:0;background:${T.bgEl};border-top:1px solid ${T.divider};padding-top:9px;padding-bottom:8px">
    <div style="display:flex;align-items:flex-start;padding:0 6px">${items}</div>
    <div style="height:5px;width:134px;border-radius:3px;background:rgba(255,255,255,0.30);margin:6px auto 0"></div>
  </div>`;
}
const panel = (inner, pad = 16) => `<div style="background:${T.panel};border:1px solid ${T.border};border-radius:20px;padding:${pad}px;box-shadow:0 10px 18px rgba(0,0,0,0.4)">${inner}</div>`;
const label = (txt, color = T.muted, mb = 0) => `<div style="font-family:${MONO};font-weight:500;font-size:11.5px;letter-spacing:1.5px;text-transform:uppercase;color:${color};margin-bottom:${mb}px">${txt}</div>`;
const iconTile = (icon, color, size = 44) => `<div style="width:${size}px;height:${size}px;border-radius:${size * 0.28}px;background:${rgba(color, 0.14)};border:1px solid ${rgba(color, 0.32)};display:flex;align-items:center;justify-content:center">${mi(icon, size * 0.5, color)}</div>`;
function pill(txt, tone) {
  const m = { neutral: [T.dim, T.inset, T.border], amber: [T.amber, T.amberSoft, rgba(T.amberB, .4)], pass: [T.pass, T.passBg, T.passBorder], fail: [T.fail, T.failBg, T.failBorder], info: [T.info, rgba(T.info, .14), rgba(T.info, .38)] }[tone];
  return `<div style="background:${m[1]};border:1px solid ${m[2]};border-radius:999px;padding:4px 11px;display:inline-flex"><span style="font-family:${BODY};font-weight:600;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:${m[0]}">${txt}</span></div>`;
}
function field(lbl, value, suffix, placeholder) {
  const val = value != null && value !== ''
    ? `<span style="font-family:${BODY};font-weight:500;font-size:16px;color:${T.text}">${value}</span>`
    : `<span style="font-family:${BODY};font-weight:500;font-size:16px;color:${T.placeholder}">${placeholder || '—'}</span>`;
  return `<div style="margin-bottom:10px">
    ${label(lbl, T.muted, 6)}
    <div style="display:flex;align-items:center;background:${T.inset};border:1px solid ${T.border};border-radius:14px;padding:12px 14px">
      <div style="flex:1">${val}</div>
      ${suffix ? `<span style="font-family:${MONO};font-weight:500;font-size:13px;color:${T.muted};margin-left:8px">${suffix}</span>` : ''}
    </div>
  </div>`;
}
const solveBtn = (lbl = 'Solve') => `<div style="display:flex;align-items:center;justify-content:center;gap:8px;background:${T.amberB};border:1px solid ${T.amber};border-radius:15px;padding:15px;margin-top:4px;box-shadow:0 6px 16px ${rgba(T.amberB, .5)}">
  ${mi('ac_unit', 20, T.onAmber)}<span style="font-family:${BODY};font-weight:600;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:${T.onAmber}">${lbl}</span></div>`;

const backBar = () => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
  <div style="width:42px;height:42px;border-radius:13px;background:${T.panel};border:1px solid ${T.border};display:flex;align-items:center;justify-content:center">${mi('chevron_left', 26, T.amber)}</div>
</div>`;
const calcHeader = (title, code) => `${backBar()}<div style="margin-bottom:12px">${label(code, T.amber, 5)}<div style="font-family:${DISP};font-weight:900;font-size:28px;line-height:36px;letter-spacing:.1px;color:${T.text}">${title}</div></div>`;

// Pass/fail LCD readout (ResultReadout)
function resultReadout({ value, unit, limit, pass, message, details }) {
  const accent = pass ? T.pass : T.fail;
  const bg = pass ? T.passBg : T.failBg, bd = pass ? T.passBorder : T.failBorder;
  return `<div style="margin-top:20px">${label('Result', T.muted, 8)}
    <div style="background:${T.inset};border:1px solid ${T.border};border-radius:18px;overflow:hidden">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;padding:18px 18px 12px">
        <div style="flex:1;padding-right:12px">
          <div style="font-family:${MONO};font-weight:700;font-size:40px;line-height:54px;letter-spacing:-.5px;color:${T.text}">${value}</div>
          <div style="font-family:${MONO};font-weight:500;font-size:13px;color:${T.muted};margin-top:4px">${unit}${limit != null ? `   ·   limit ${limit}` : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:7px;background:${bg};border:1px solid ${bd};border-radius:999px;padding:7px 12px">
          <div style="width:9px;height:9px;border-radius:9px;background:${accent};box-shadow:0 0 6px ${accent}"></div>
          <span style="font-family:${BODY};font-weight:600;font-size:12px;letter-spacing:1.5px;color:${accent}">${pass ? 'PASS' : 'FAIL'}</span>
        </div>
      </div>
      <div style="padding:0 18px 14px"><span style="font-family:${BODY};font-weight:500;font-size:14.5px;color:${T.text}">${message}</span></div>
      <div style="border-top:1px solid ${T.divider};background:rgba(0,0,0,0.22);padding:14px 16px;display:flex;flex-direction:column;gap:4px">
        ${details.map((d) => `<div style="font-family:${MONO};font-weight:500;font-size:11.5px;line-height:17px;color:${T.muted}">${d}</div>`).join('')}
      </div>
    </div></div>`;
}
// Multi-output readout (MetricReadout)
function metricReadout({ tint, primary, secondary = [], details = [] }) {
  return `<div style="margin-top:20px">${label('Result', T.muted, 8)}
    <div style="background:${T.inset};border:1px solid ${T.border};border-radius:18px;overflow:hidden">
      <div style="height:4px;background:${tint}"></div>
      <div style="display:flex;gap:14px;padding:16px 18px ${secondary.length ? 14 : 18}px">
        ${primary.map((f) => `<div style="flex:1">${label(f.label, T.muted, 0)}
          <div style="font-family:${MONO};font-weight:700;font-size:34px;line-height:40px;letter-spacing:-.5px;color:${T.text};margin-top:6px">${f.value}</div>
          ${f.unit ? `<div style="font-family:${MONO};font-weight:500;font-size:13px;color:${T.muted};margin-top:2px">${f.unit}</div>` : ''}</div>`).join('')}
      </div>
      ${secondary.length ? `<div style="border-top:1px solid ${T.divider};padding:12px 18px;display:flex;flex-direction:column;gap:9px">
        ${secondary.map((f) => `<div style="display:flex;justify-content:space-between"><span style="font-family:${MONO};font-weight:500;font-size:13px;color:${T.muted}">${f.label}</span><span style="font-family:${MONO};font-weight:500;font-size:13px;color:${T.text}">${f.value}</span></div>`).join('')}</div>` : ''}
    </div></div>`;
}

// ── Screen bodies ───────────────────────────────────────────────────────
const CALCS = [
  { t: 'BTU ↔ Tons', s: 'Capacity conversion', ic: 'whatshot', code: '12,000 BTU/ton', col: CAT.load },
  { t: 'CFM from BTU', s: 'Airflow from load', ic: 'air', code: 'Q = BTU ÷ (1.08 × ΔT)', col: CAT.airflow },
  { t: 'Duct Sizing', s: 'Round & rectangular', ic: 'line_weight', code: 'Area = CFM ÷ V', col: CAT.duct },
  { t: 'Psychrometrics', s: 'Total / sensible / latent', ic: 'water_drop', code: '4.5 × CFM × Δh', col: CAT.psychrometrics },
  { t: 'Refrigerant Lines', s: 'Manufacturer data check', ic: 'linear_scale', code: 'Equivalent length check', col: CAT.refrigerant },
  { t: 'Superheat / Subcool', s: 'Manufacturer target', ic: 'device_thermostat', code: 'Record target', col: CAT.refrigerant },
  { t: 'Hydronics', s: 'BTU · GPM · ΔT', ic: 'water', code: 'Q = 500 × GPM × ΔT', col: CAT.hydronics },
  { t: 'Air Changes', s: 'ACH from CFM', ic: 'cached', code: 'ACH = CFM × 60 ÷ V', col: CAT.airflow },
];
function dashboard() {
  const card = (c) => `<div style="flex:1;background:${T.panel};border:1px solid ${T.border};border-radius:20px;overflow:hidden;box-shadow:0 10px 18px rgba(0,0,0,0.4);display:flex;flex-direction:column;justify-content:space-between;height:176px">
    <div style="height:4px;background:${c.col}"></div>
    <div style="padding:14px 16px 16px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
      ${iconTile(c.ic, c.col, 44)}
      <div style="margin-top:12px">
        <div style="font-family:${BODY};font-weight:700;font-size:16px;color:${T.text}">${c.t}</div>
        <div style="font-family:${BODY};font-weight:500;font-size:13.5px;color:${T.muted};margin-top:4px">${c.s}</div>
      </div>
      ${label(c.code, T.muted, 0)}
    </div></div>`;
  let rows = '';
  for (let i = 0; i < CALCS.length; i += 2) rows += `<div style="display:flex;gap:14px;margin-bottom:14px">${card(CALCS[i])}${card(CALCS[i + 1])}</div>`;
  return `<div style="padding:8px 22px 0">
    <div style="margin-top:6px;margin-bottom:26px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="background:${T.amberSoft};border:1px solid ${rgba(T.amberB, .4)};border-radius:999px;padding:5px 11px">${label('HVAC · Field Toolkit', T.amber, 0)}</div>
        <div style="display:flex;align-items:center;gap:6px"><div style="width:7px;height:7px;border-radius:7px;background:${T.pass};box-shadow:0 0 5px ${T.pass}"></div><span style="font-family:${MONO};font-weight:500;font-size:11px;color:${T.muted}">LIVE</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:14px">
        <img src="file://${ICON}" style="width:74px;height:74px;border-radius:20px"/>
        <div>
          <div style="font-family:${DISP};font-weight:900;font-size:35px;line-height:44px;letter-spacing:.2px"><span style="color:${T.text}">BASE</span><span style="color:${T.amberB}">CALC</span></div>
          <div style="font-family:${BODY};font-weight:700;font-size:14px;line-height:20px;letter-spacing:1.8px;text-transform:uppercase;color:${T.muted};margin-top:2px">HVAC</div>
        </div>
      </div>
      <div style="font-family:${BODY};font-weight:500;font-size:16px;line-height:24px;color:${T.muted};margin-top:10px">HVAC field math with explicit inputs, assumptions, and equipment-data boundaries.</div>
    </div>
    ${rows}
  </div>`;
}
function ductSizing() {
  return `<div style="padding:6px 20px 0">${calcHeader('Duct Sizing', 'Area = CFM ÷ V')}
    ${panel(`${field('Airflow', '1,000', 'CFM')}${field('Target velocity', '900', 'FPM')}
      ${label('Shape', T.muted, 8)}<div style="display:flex;gap:8px;margin-bottom:14px">
        <div style="padding:9px 14px;border-radius:11px;border:1px solid ${T.amberB};background:${T.amberSoft};font-family:${MONO};font-weight:500;font-size:13.5px;color:${T.amberB}">Round</div>
        <div style="padding:9px 14px;border-radius:11px;border:1px solid ${T.border};background:${T.inset};font-family:${BODY};font-weight:500;font-size:13.5px;color:${T.dim}">Rectangular</div></div>
      ${solveBtn('Size duct')}`)}
    ${metricReadout({ tint: CAT.duct, primary: [{ label: 'Round Ø', value: '14', unit: 'in' }, { label: 'Area', value: '1.11', unit: 'ft²' }], secondary: [{ label: 'Rectangular equivalent', value: '16 × 10 in' }, { label: 'Velocity', value: '900 FPM' }] })}
  </div>`;
}
function filterVelocity() {
  return `<div style="padding:6px 20px 0">${calcHeader('Filter Velocity', 'Face velocity · 500 FPM guidance')}
    ${panel(`${field('Airflow', '1,000', 'CFM')}${field('Filter width', '24', 'in')}${field('Filter height', '24', 'in')}${solveBtn('Check')}`)}
    ${resultReadout({ value: '250', unit: 'FPM', limit: 500, pass: true, message: 'Face velocity 250 FPM — within 500 FPM guidance.', details: ['Filter area = 24" × 24" ÷ 144 = 4.00 ft²', 'Velocity = 1,000 ÷ 4.00 = 250 FPM'] })}
  </div>`;
}
function psychrometrics() {
  return `<div style="padding:6px 20px 0">${calcHeader('Psychrometrics', '4.5 × CFM × Δh')}
    ${panel(`${field('Airflow', '1,000', 'CFM')}${field('Entering enthalpy', '30.0', 'BTU/lb')}${field('Leaving enthalpy', '22.0', 'BTU/lb')}${field('Sensible ΔT', '20', '°F')}${solveBtn('Calculate')}`)}
    ${metricReadout({ tint: CAT.psychrometrics, primary: [{ label: 'Total', value: '36,000', unit: 'BTU/hr' }, { label: 'Sensible', value: '21,600', unit: 'BTU/hr' }], secondary: [{ label: 'Latent', value: '14,400 BTU/hr' }, { label: 'Sensible heat ratio', value: '0.60' }] })}
  </div>`;
}
function jobs() {
  const cName = (id) => seed.clients.find((c) => c.id === id)?.name || 'Unknown job contact';
  const tone = { paid: 'pass', sent: 'info', draft: 'neutral', overdue: 'fail' };
  const statusLabel = { paid: 'Closed', sent: 'Ready', draft: 'Draft', overdue: 'Review' };
  const openTickets = seed.invoices.filter((i) => i.status !== 'paid').length;
  const rows = seed.invoices.map((inv) => `<div style="margin-bottom:12px">${panel(`
    <div style="display:flex;align-items:flex-start;gap:13px">
      ${iconTile('assignment', T.amberB, 44)}
      <div style="flex:1;min-width:0">
        <div style="font-family:${MONO};font-weight:500;font-size:12.5px;color:${T.amber}">${inv.invoiceNumber.replace(/^INV-/, 'JOB-')}</div>
        <div style="font-family:${BODY};font-weight:700;font-size:16px;color:${T.text};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cName(inv.clientId)}</div>
        <div style="font-family:${MONO};font-weight:500;font-size:11.5px;color:${T.muted};margin-top:4px">${new Date(inv.date).toLocaleDateString('en-US')} · ${inv.lineItems.length} ${inv.lineItems.length === 1 ? 'item' : 'items'}</div>
      </div>
      <div style="display:flex;align-items:flex-end;flex-shrink:0">
        ${pill(statusLabel[inv.status], tone[inv.status])}
      </div>
    </div>`)}</div>`).join('');
  return `<div style="padding:6px 20px 0">
    <div style="margin-top:4px;margin-bottom:16px">
      <div style="font-family:${DISP};font-weight:900;font-size:28px;line-height:44px;color:${T.text}">Jobs</div>
      <div style="font-family:${BODY};font-weight:500;font-size:16px;color:${T.muted};margin-top:6px">${openTickets} open job worksheets</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;background:${T.inset};border:1px solid ${T.border};border-radius:14px;padding:12px 14px;margin-bottom:16px">
      ${mi('search', 20, T.muted)}<span style="font-family:${BODY};font-weight:500;font-size:16px;color:${T.placeholder}">Search ticket or job contact...</span></div>
    ${rows}
  </div>`;
}
function materials() {
  const groups = [
    { t: 'Refrigerant + Lineset', s: 'Match the exact equipment submittal.', ic: 'linear_scale', col: CAT.refrigerant, items: ['Manufacturer-specified line set', 'Brazing rod and nitrogen', 'Filter drier and service caps'] },
    { t: 'Air Distribution', s: 'Plan duct after the CFM math.', ic: 'air', col: CAT.airflow, items: ['Duct and fittings by CFM', 'Registers, grilles, and boots', 'Flex, mastic, and straps'] },
    { t: 'Equipment + Controls', s: 'Stage the change-out parts.', ic: 'device_thermostat', col: CAT.load, items: ['Condenser and air handler', 'Thermostat and control wire', 'Pads, whips, and disconnects'] },
  ];
  const rows = groups.map((g) => `<div style="margin-bottom:12px">${panel(`
    <div style="display:flex;align-items:flex-start">
      ${iconTile(g.ic, g.col, 44)}
      <div style="flex:1;margin-left:13px">
        <div style="font-family:${BODY};font-weight:700;font-size:17px;color:${T.text}">${g.t}</div>
        <div style="font-family:${BODY};font-weight:500;font-size:13.5px;color:${T.muted};margin-top:1px">${g.s}</div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
          ${g.items.map((item) => `<div style="display:flex;align-items:center;gap:7px">${mi('check_circle', 15, g.col)}<span style="font-family:${BODY};font-weight:500;font-size:13px;color:${T.dim}">${item}</span></div>`).join('')}
        </div>
      </div>
    </div>`)}</div>`).join('');
  return `<div style="padding:6px 20px 0">
    <div style="margin-top:4px;margin-bottom:16px">
      <div style="font-family:${DISP};font-weight:900;font-size:28px;line-height:44px;color:${T.text}">Materials</div>
      <div style="font-family:${BODY};font-weight:500;font-size:16px;color:${T.muted};margin-top:6px">Pull-list starters tied to the calculator workflow.</div>
    </div>
    ${rows}
  </div>`;
}

function worksheetDetail() {
  const work = [
    ['Condenser + air handler change-out', 'Qty 1'],
    ['3-ton lineset + braze notes', 'Qty 25 ft'],
    ['Evacuate, weigh charge, verify ΔT', 'Qty 1'],
  ].map(([title, qty]) => `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
    ${mi('check_circle', 18, T.amberB)}
    <div style="flex:1">
      <div style="font-family:${BODY};font-weight:700;font-size:14.5px;color:${T.text}">${title}</div>
      <div style="font-family:${MONO};font-weight:500;font-size:11.5px;color:${T.muted};margin-top:1px">${qty}</div>
    </div>
  </div>`).join('');
  return `<div style="padding:6px 20px 0">${backBar()}
    <div style="background:${T.panel};border:1px solid ${T.border};border-left:4px solid ${T.amberB};border-radius:20px;padding:16px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">${label('JOB-202606-0004', T.amber, 4)}
          <div style="font-family:${BODY};font-weight:900;font-size:22px;color:${T.text}">Change-out punch list</div>
        </div>
        ${pill('Ready', 'info')}
      </div>
      <div style="height:1px;background:${T.divider};margin:14px 0"></div>
      <div style="display:flex;justify-content:space-between;margin-top:7px">${label('Created', T.muted, 0)}<span style="font-family:${MONO};font-weight:500;font-size:12px;color:${T.dim}">6/26/2026</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:7px">${label('Job state', T.muted, 0)}<span style="font-family:${MONO};font-weight:500;font-size:12px;color:${T.dim}">Ready</span></div>
    </div>
    ${panel(`${label('Work items', T.muted, 10)}${work}`, 16)}
    <div style="height:14px"></div>
    ${panel(`${label('SpeakSheet handoff', T.muted, 8)}
      <div style="font-family:${BODY};font-weight:500;font-size:15px;line-height:22px;color:${T.dim};margin-bottom:12px">BaseCalc stores field math, quantities, and site notes. Send the final customer invoice from SpeakSheet.</div>
      <div style="display:flex;align-items:center;gap:7px;color:${T.amberB}">${mi('ios_share', 18, T.amberB)}<span style="font-family:${BODY};font-weight:700;font-size:12px;text-transform:uppercase;color:${T.amberB}">Send summary</span></div>`, 16)}
  </div>`;
}

function superheatSubcool() {
  return `<div style="padding:6px 20px 0">${calcHeader('Superheat / Subcool', 'Record the equipment manufacturer target')}
    ${panel(`${field('Mode', 'Subcool')}${field('Refrigerant', 'R-410A')}${field('Manufacturer target', '10.0', '°F')}${solveBtn('Validate')}`)}
    ${metricReadout({ tint: CAT.refrigerant, primary: [{ label: 'Subcooling target', value: '10.0', unit: '°F' }, { label: 'Refrigerant', value: 'R-410A' }], secondary: [{ label: 'Source', value: 'Manufacturer data' }] })}
  </div>`;
}

function refrigerantLines() {
  return `<div style="padding:6px 20px 0">${calcHeader('Refrigerant Lines', 'Manufacturer equivalent-length check')}
    ${panel(`${field('Equivalent line length', '80', 'ft')}${field('Manufacturer maximum', '100', 'ft')}${field('Manufacturer suction size', '7/8', 'in')}${field('Manufacturer liquid size', '3/8', 'in')}${solveBtn('Validate')}`)}
    ${metricReadout({ tint: CAT.refrigerant, primary: [{ label: 'Suction', value: '7/8', unit: 'in' }, { label: 'Liquid', value: '3/8', unit: 'in' }], secondary: [{ label: 'Equivalent length', value: '80 ft' }, { label: 'Length margin', value: '20 ft' }] })}
  </div>`;
}

function history() {
  const rows = [
    ['Duct Sizing', '14" round · 1.11 ft²', CAT.duct],
    ['Filter Velocity', '432 FPM face velocity', CAT.airflow],
    ['Psychrometrics', '28,457 BTU/hr total', CAT.psychrometrics],
    ['Superheat / Subcool', 'Manufacturer target 10.0°F', CAT.refrigerant],
  ].map(([title, result, color]) => `<div style="margin-bottom:12px">${panel(`
    <div style="display:flex;align-items:center;gap:13px">
      ${iconTile('calculate', color, 44)}
      <div style="flex:1;min-width:0">
        <div style="font-family:${BODY};font-weight:700;font-size:16px;color:${T.text}">${title}</div>
        <div style="font-family:${MONO};font-weight:500;font-size:12px;color:${T.muted};margin-top:4px">${result}</div>
      </div>
      ${pill('Saved', 'neutral')}
    </div>`)}</div>`).join('');
  return `<div style="padding:6px 20px 0">
    <div style="margin-top:4px;margin-bottom:16px">
      <div style="font-family:${DISP};font-weight:900;font-size:28px;line-height:44px;color:${T.text}">History</div>
      <div style="font-family:${BODY};font-weight:500;font-size:16px;color:${T.muted};margin-top:6px">Saved calculations stay on this device.</div>
    </div>
    ${rows}
  </div>`;
}

// ── Full framed page ────────────────────────────────────────────────────
function page({ body, active, line1, line2, sub }, D) {
  const P = D.phone, S = D.screen, hd = D.head;
  const scale = S.w / D.iw;
  const ih = S.h / scale;
  const island = D.island
    ? `<div style="position:absolute;top:${P.bezel + 22}px;left:50%;transform:translateX(-50%);width:250px;height:64px;border-radius:32px;background:#000;z-index:5"></div>`
    : `<div style="position:absolute;top:${P.bezel + 9}px;left:50%;transform:translateX(-50%);width:16px;height:16px;border-radius:16px;background:#05070B;box-shadow:inset 0 0 0 2px #1a2230;z-index:5"></div>`;
  const screenInner = `<div style="position:absolute;inset:0;background:radial-gradient(120% 60% at 50% -8%, ${rgba(T.amberB, 0.13)}, rgba(0,0,0,0) 60%),linear-gradient(180deg,#0b0e15,${T.bg})"></div>
    <div style="position:absolute;inset:0;opacity:.5;background-image:linear-gradient(${rgba('#ffffff', .028)} 1px,transparent 1px),linear-gradient(90deg,${rgba('#ffffff', .028)} 1px,transparent 1px);background-size:34px 34px"></div>
    <div style="position:relative;height:100%">${statusBar()}<div style="position:relative">${body}</div>${tabBar(active)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTCSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${D.W}px;height:${D.H}px;overflow:hidden}
.page{position:relative;width:${D.W}px;height:${D.H}px;background:linear-gradient(180deg,#151B29 0%,#0C1019 50%,#06080E 100%);font-family:${BODY}}
.glow{position:absolute;left:0;right:0;top:0;height:${D.glowH}px;background:radial-gradient(60% 52% at 50% 2%, ${rgba(T.amberB, 0.30)} 0%, ${rgba(T.amber, 0.08)} 42%, rgba(0,0,0,0) 72%)}
.grid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(${rgba('#ffffff', .028)} 1px,transparent 1px),linear-gradient(90deg,${rgba('#ffffff', .028)} 1px,transparent 1px);background-size:${D.gridSize}px ${D.gridSize}px}
.vign{position:absolute;inset:0;background:radial-gradient(85% 75% at 50% 62%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)}
.head{position:absolute;top:${hd.top}px;left:0;right:0;text-align:center;padding:0 ${hd.pad}px}
.h1{font-family:${DISP};font-weight:900;font-size:${hd.size}px;line-height:${hd.lh}px;letter-spacing:-1px}
.sub{font-family:${BODY};font-weight:500;font-size:${hd.subSize}px;color:${T.muted};margin-top:${hd.subTop}px}
.phone{position:absolute;left:${P.left}px;top:${P.top}px;width:${P.w}px;height:${P.h}px;border-radius:${P.r}px;background:linear-gradient(160deg,#20262F,#0E1219 55%,#05070B);box-shadow:${D.shadow}, inset 0 0 0 1px rgba(255,255,255,0.10)}
.screen{position:absolute;left:${P.bezel}px;top:${P.bezel}px;width:${S.w}px;height:${S.h}px;border-radius:${S.r}px;overflow:hidden;background:${T.bg}}
.inner{position:absolute;top:0;left:0;width:${D.iw}px;height:${ih}px;transform:scale(${scale});transform-origin:top left}
</style></head><body>
<div class="page">
  <div class="glow"></div><div class="grid"></div>
  <div class="head"><div class="h1"><span style="color:${T.text}">${line1}</span> <span style="color:${T.amberB}">${line2}</span></div><div class="sub">${sub}</div></div>
  <div class="vign"></div>
  <div class="phone"><div class="screen"><div class="inner">${screenInner}</div></div>${island}</div>
</div></body></html>`;
}

// ── Render ──────────────────────────────────────────────────────────────
const SHOTS = [
  { out: '01-dashboard.png', body: dashboard, active: 'calc', line1: 'Run the math.', line2: 'In the field.', sub: 'HVAC calculators built for the trade.' },
  { out: '02-duct-sizing.png', body: ductSizing, active: 'calc', line1: 'Calculate duct', line2: 'dimensions.', sub: 'Round and rectangular results from entered CFM and velocity.' },
  { out: '03-filter-velocity.png', body: filterVelocity, active: 'calc', line1: 'Check filter', line2: 'velocity.', sub: 'Calculate face velocity and compare it with an entered target.' },
  { out: '04-psychrometrics.png', body: psychrometrics, active: 'calc', line1: 'Total, sensible,', line2: 'latent.', sub: 'Psychrometric loads in one readout.' },
  { out: '05-jobs.png', body: jobs, active: 'jobs', line1: 'Save job', line2: 'worksheets.', sub: 'Scope, quantities, and notes stay in BaseCalc.' },
  { out: '06-worksheet.png', body: worksheetDetail, active: 'jobs', line1: 'Handoff without', line2: 'invoicing.', sub: 'Send final billing work to SpeakSheet.' },
  { out: '07-materials.png', body: materials, active: 'mat', line1: 'Plan the', line2: 'truck stock.', sub: 'Material reminders before the install.' },
  { out: '08-superheat.png', body: superheatSubcool, active: 'calc', line1: 'Use the exact', line2: 'target.', sub: 'Record manufacturer charging data without guessed constants.' },
  { out: '09-refrigerant-lines.png', body: refrigerantLines, active: 'calc', line1: 'Check the', line2: 'lineset.', sub: 'Validate entered equipment data against equivalent length.' },
  { out: '10-history.png', body: history, active: 'his', line1: 'Keep the', line2: 'job record.', sub: 'Local calculation history for the field.' },
];

// Reused by the marketing-image generator (panorama + hero).
export {
  ROOT, TMP, CHROME, DEVICES, T, CAT, rgba, FONTCSS, BODY, DISP, MONO, mi, ICON,
  statusBar, tabBar, page,
  dashboard, ductSizing, filterVelocity, psychrometrics, jobs, materials, worksheetDetail,
  superheatSubcool, refrigerantLines, history,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const only = process.argv[2]; // optional: "iphone", "ipad", or "android"
  for (const [name, D] of Object.entries(DEVICES)) {
    if (only && only !== name) continue;
    const outDir = join(ROOT, 'store-assets', D.out);
    mkdirSync(outDir, { recursive: true });
    console.log(`\n${name} (${D.W}×${D.H}) → store-assets/${D.out}/`);
    for (const s of SHOTS) {
      const html = page({ ...s, body: s.body() }, D);
      const htmlPath = join(TMP, `${name}-${s.out.replace('.png', '.html')}`);
      const rawPath = join(TMP, `raw-${name}-${s.out}`);
      writeFileSync(htmlPath, html);
      execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--force-device-scale-factor=2', `--window-size=${D.W},${D.H}`,
        '--virtual-time-budget=4000', `--screenshot=${rawPath}`, `file://${htmlPath}`,
      ], { stdio: 'ignore' });
      await sharp(rawPath).resize(D.W, D.H, { fit: 'fill' }).png().toFile(join(outDir, s.out));
      console.log(`  ✓ ${s.out}`);
    }
  }
  console.log('\nDone.');
}
