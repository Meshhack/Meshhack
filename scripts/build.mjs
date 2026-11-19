#!/usr/bin/env node
// Draws the profile and keeps it current. What it says lives in content.mjs;
// this file only decides how it looks.
//
//   assets/terminal*.svg   the animated session with the skyline
//   assets/tab-*.svg       the tab row, one image per tab so each can be a link
//   assets/btn-*.svg       the buttons under the contact window
//   assets/footer*.svg     the closing strip
//   assets/work*.svg, clients, npm, stack, contact
//                          each section, drawn as its own terminal window
//   README.md              written from scratch on every run
// Every image comes in two sizes; phones get the "-narrow" one.
//
//   node scripts/build.mjs
//
// No dependencies. Needs Node 20+. Reads GITHUB_TOKEN (or GH_TOKEN) to fetch
// the contribution calendar; without one, or if a fetch fails, it reuses the
// last good copy in data/ so a bad morning never breaks the profile.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PROFILE } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => path.join(ROOT, ...p);

// Colours and type are the ones meshack.co.ke uses.
const C = {
  bg: '#0a0a0c',
  panel: '#131316',
  border: '#232328',
  white: '#f4f4f5',
  bright: '#b9bbc2',
  mid: '#85878e',
  comment: '#777982', // the site's #5c5e66, lifted until it passes contrast at this size
  dim: '#5c5e66',
  faint: '#3a3c43',
  orange: '#ff5c00',
};

const LAYOUTS = {
  wide: {
    W: 880, fs: 15, lh: 25, padL: 76, gutterX: 46, padR: 32,
    tabH: 38, tabFs: 14, tabGap: 8, tabGutter: 3, measure: 76,
    headFs: 24, headLh: 34, statusH: 34, statusFs: 12.5,
    nameCol: 14, stacked: false,
    sky: { H: 124, kicc: 1.18, monthFs: 10, monthGap: 30 },
  },
  narrow: {
    W: 440, fs: 14, lh: 23, padL: 20, gutterX: null, padR: 20,
    tabH: 44, tabFs: 13.5, tabGap: 7, tabGutter: 2.5, measure: 99,
    headFs: 20, headLh: 29, statusH: 32, statusFs: 11.5,
    nameCol: 0, stacked: true,
    sky: { H: 92, kicc: 0.88, monthFs: 9, monthGap: 58 },
  },
};

// ──────────────────────────────────────────────────────────────── data ──

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function getJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'user-agent': 'profile-readme-build', accept: 'application/json', ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

async function fetchContributions() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('no GITHUB_TOKEN set');
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{firstDay contributionDays{contributionCount}}}}}}`;
  const body = await getJson('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: PROFILE.login } }),
  });
  const cal = body?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal?.weeks?.length) throw new Error(body?.errors?.[0]?.message || 'empty calendar');
  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => ({
      start: w.firstDay,
      count: w.contributionDays.reduce((n, d) => n + d.contributionCount, 0),
    })),
  };
}

async function fetchNpm() {
  const found = await getJson(
    `https://registry.npmjs.org/-/v1/search?text=maintainer:${PROFILE.npmUser}&size=50`,
  );
  const packages = (found.objects || []).map((o) => ({
    name: o.package.name,
    version: o.package.version,
    description: o.package.description || '',
  }));
  if (!packages.length) throw new Error('npm search came back empty');
  return { packages };
}

// Fetch fresh data; on any failure keep what we had.
let stale = false;
async function load(name, fetcher, check) {
  const file = at('data', `${name}.json`);
  const cached = await readJson(file, null);
  try {
    const fresh = await fetcher();
    check?.(fresh, cached);
    const text = JSON.stringify(fresh, null, 2) + '\n';
    if (JSON.stringify(cached, null, 2) + '\n' !== text) await writeFile(file, text);
    return fresh;
  } catch (err) {
    if (!cached) throw new Error(`could not load ${name} and there is no saved copy: ${err.message}`);
    console.warn(`! ${name}: ${err.message} — using the saved copy`);
    stale = true;
    return cached;
  }
}

// A year of work does not halve overnight. If the calendar says it did, the
// token probably cannot see private contributions: keep yesterday's city.
function looksWhole(fresh, cached) {
  if (cached && fresh.total < cached.total * 0.5) {
    throw new Error(`calendar dropped from ${cached.total} to ${fresh.total} contributions`);
  }
}

// ───────────────────────────────────────────────────────────── helpers ──

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (v) => String(Math.round(v * 10) / 10); // one decimal, no trailing zero
const sec = (t) => `${Math.round(t * 1000) / 1000}s`;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small seeded generator, so a given week always draws the same building.
function seeded(key) {
  let a = hash(key);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// ───────────────────────────────────────────────────────────── skyline ──

// The KICC tower and its amphitheatre, in silhouette, standing behind the data.
function kicc(cx, ground, s) {
  const X = (v) => n(cx + v * s);
  const Y = (v) => n(ground - v * s);
  const pts = (list) => list.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
  const bands = [];
  for (let y = 12; y < 102; y += 5) bands.push(`M${X(-11)} ${Y(y)}H${X(11)}`);
  return [
    `<g class="kicc">`,
    // podium, tower, the flare under the saucer, saucer, cap, helipad
    `<path class="kf" d="M${X(-46)} ${Y(0)}V${Y(5)}H${X(72)}V${Y(0)}Z"/>`,
    `<path class="kf" d="M${X(-11)} ${Y(5)}V${Y(104)}H${X(11)}V${Y(5)}Z"/>`,
    `<polygon class="kf" points="${pts([[-11, 104], [11, 104], [20, 111], [-20, 111]])}"/>`,
    `<path class="kf" d="M${X(-20)} ${Y(111)}V${Y(117)}H${X(20)}V${Y(111)}Z"/>`,
    `<path class="kf" d="M${X(-12)} ${Y(117)}V${Y(121)}H${X(12)}V${Y(117)}Z"/>`,
    `<path class="kf" d="M${X(-16)} ${Y(121)}V${Y(122.6)}H${X(16)}V${Y(121)}Z"/>`,
    `<path class="kl" d="M${X(0)} ${Y(122.6)}V${Y(132)}"/>`,
    `<path class="kb" d="${bands.join('')}"/>`,
    // amphitheatre: a low drum under a cone, like the hut it was modelled on
    `<path class="kf" d="M${X(26)} ${Y(5)}V${Y(13)}H${X(68)}V${Y(5)}Z"/>`,
    `<polygon class="kf" points="${pts([[23, 13], [71, 13], [50, 35], [44, 35]])}"/>`,
    `<path class="kf" d="M${X(45.5)} ${Y(35)}V${Y(39)}H${X(48.5)}V${Y(35)}Z"/>`,
    `</g>`,
  ].join('');
}

function skyline({ weeks, x0, x1, ground, H, kiccScale, monthFs, monthGap, t0 }) {
  const slot = (x1 - x0) / weeks.length;
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const last = weeks.length - 1;
  const minH = Math.max(8, H * 0.09);
  const out = [];
  const boxes = []; // where stars must not go

  // KICC sits a third of the way along, behind everything.
  const kx = x0 + (x1 - x0) * 0.3;
  out.push(`<g class="fade" style="animation-delay:${sec(t0)}">${kicc(kx, ground, kiccScale)}</g>`);
  boxes.push([kx - 48 * kiccScale, ground - 40 * kiccScale, kx + 74 * kiccScale, ground]);
  boxes.push([kx - 22 * kiccScale, ground - 134 * kiccScale, kx + 22 * kiccScale, ground]);

  // a little light pollution along the horizon
  out.push(
    `<rect class="fade" style="animation-delay:${sec(t0)}" x="-10" y="${n(ground - H)}" width="4000" height="${n(H)}" fill="url(#haze)"/>`,
  );

  const tones = ['url(#b0)', 'url(#b1)', 'url(#b2)'];
  const win = Math.max(1.7, Math.min(2.6, slot * 0.16));
  const buildings = [];

  weeks.forEach((week, i) => {
    const isNow = i === last;
    if (!week.count && !isNow) return; // an empty week is an empty lot
    const r = seeded(week.start);
    const w = slot * (0.66 + 0.22 * r());
    const x = x0 + i * slot + (slot - w) * r();
    const h = Math.max(minH, H * Math.sqrt(week.count / max));
    const top = ground - h;
    const tone = tones[Math.floor(r() * tones.length)];
    const parts = [];
    boxes.push([x - 2, top - 16, x + w + 2, ground]);

    // roofline: tall buildings get a mast, a setback or a water tank
    const roof = r();
    if (h > H * 0.42) {
      if (roof < 0.34) {
        const mx = x + w * (0.3 + 0.4 * r());
        parts.push(`<path class="mast" d="M${n(mx)} ${n(top)}v${n(-(7 + 7 * r()))}"/>`);
      } else if (roof < 0.62) {
        const inset = w * 0.22;
        parts.push(`<rect x="${n(x + inset)}" y="${n(top - 4)}" width="${n(w - 2 * inset)}" height="4.5" fill="${tone}"/>`);
        parts.push(`<path class="edge" d="M${n(x + inset)} ${n(top - 4)}h${n(w - 2 * inset)}"/>`);
      } else if (roof < 0.8) {
        const tx = x + w * 0.14;
        parts.push(`<rect x="${n(tx)}" y="${n(top - 3.5)}" width="${n(w * 0.34)}" height="4" fill="${tone}"/>`);
      }
    }

    parts.push(`<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(h)}" fill="${tone}"/>`);
    parts.push(`<path class="edge" d="M${n(x)} ${n(top)}h${n(w)}"/>`);

    // windows: mostly dark, a few still up
    const pitchX = win * 1.95;
    const pitchY = win * 2.3;
    const cols = Math.max(1, Math.floor((w - win) / pitchX));
    const rows = Math.max(1, Math.floor((h - win * 2.2) / pitchY));
    const startX = x + (w - (cols * pitchX - (pitchX - win))) / 2;
    const startY = top + win * 1.5;
    const paths = { off: '', dim: '', lit: '' };
    const nowCell = isNow ? [Math.floor(r() * cols), Math.min(rows - 1, Math.floor(rows * 0.3))] : null;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = startX + col * pitchX;
        const wy = startY + row * pitchY;
        if (nowCell && nowCell[0] === col && nowCell[1] === row) {
          const big = win * 1.3;
          parts.push(`<circle class="glow" cx="${n(wx + win / 2)}" cy="${n(wy + win / 2)}" r="${n(win * 5)}" fill="url(#lamp)"/>`);
          parts.push(
            `<rect class="now" x="${n(wx - (big - win) / 2)}" y="${n(wy - (big - win) / 2)}" width="${n(big)}" height="${n(big)}"/>`,
          );
          continue;
        }
        const p = r();
        const d = `M${n(wx)} ${n(wy)}h${n(win)}v${n(win)}h${n(-win)}z`;
        if (p < 0.14) {
          // a handful flick on and off, slowly, out of step with each other
          if (r() < 0.3) {
            parts.push(
              `<rect class="lit tw" style="animation-delay:${sec(-r() * 12)};animation-duration:${sec(7 + r() * 9)}" x="${n(wx)}" y="${n(wy)}" width="${n(win)}" height="${n(win)}"/>`,
            );
          } else paths.lit += d;
        } else if (p < 0.42) paths.dim += d;
        else paths.off += d;
      }
    }
    // put the window paths before the glow so the orange one stays on top
    const glass = Object.entries(paths)
      .filter(([, d]) => d)
      .map(([cls, d]) => `<path class="${cls}" d="${d}"/>`)
      .join('');
    const glowAt = parts.findIndex((p) => p.startsWith('<circle class="glow"') || p.startsWith('<rect class="lit tw"'));
    if (glowAt === -1) parts.push(glass);
    else parts.splice(glowAt, 0, glass);

    const delay = t0 + 0.25 + i * 0.028;
    buildings.push(
      `<g class="grow" style="transform-origin:0 ${n(ground)}px;animation-delay:${sec(delay)}">${parts.join('')}</g>`,
    );
  });

  // stars, kept clear of the buildings
  const starRng = seeded('stars');
  const stars = [];
  const want = Math.round((x1 - x0) / 17);
  for (let tries = 0; stars.length < want && tries < want * 12; tries++) {
    const sx = x0 + starRng() * (x1 - x0);
    const sy = ground - H * 1.32 + starRng() * H * 1.12;
    const size = 0.55 + starRng() * 0.55;
    if (boxes.some(([ax, ay, bx, by]) => sx > ax - 3 && sx < bx + 3 && sy > ay - 3 && sy < by)) continue;
    const twinkle = starRng() < 0.2;
    stars.push(
      `<circle class="${twinkle ? 'star tw' : 'star'}"${
        twinkle ? ` style="animation-delay:${sec(-starRng() * 9)};animation-duration:${sec(5 + starRng() * 6)}"` : ''
      } cx="${n(sx)}" cy="${n(sy)}" r="${n(size)}" opacity="${n(0.45 + starRng() * 0.55)}"/>`,
    );
  }
  out.unshift(`<g class="fade" style="animation-delay:${sec(t0)}">${stars.join('')}</g>`);

  out.push(buildings.join(''));
  out.push(`<path class="ground fade" style="animation-delay:${sec(t0)}" d="M-10 ${n(ground + 0.5)}H4000"/>`);

  // month names under the street, where each month starts
  const labels = [];
  let lastLabelX = -Infinity;
  weeks.forEach((week, i) => {
    const d = new Date(`${week.start}T00:00:00Z`);
    const prev = i ? new Date(`${weeks[i - 1].start}T00:00:00Z`) : null;
    const endOfWeek = new Date(d.getTime() + 6 * 864e5);
    const startsMonth = prev ? endOfWeek.getUTCMonth() !== new Date(prev.getTime() + 6 * 864e5).getUTCMonth() : false;
    if (!startsMonth) return;
    const lx = x0 + i * slot;
    if (lx - lastLabelX < monthGap || lx > x1 - monthFs * 1.9) return;
    lastLabelX = lx;
    labels.push(
      `<path class="tick" d="M${n(lx)} ${n(ground + 1)}v3.5"/><text class="month" x="${n(lx)}" y="${n(ground + 5 + monthFs)}">${MONTHS[endOfWeek.getUTCMonth()]}</text>`,
    );
  });
  out.push(`<g class="fade" style="font-size:${monthFs}px;animation-delay:${sec(t0 + 0.2)}">${labels.join('')}</g>`);

  return { svg: out.join(''), done: t0 + 0.25 + weeks.length * 0.028 + 0.55 };
}

// ──────────────────────────────────────────────────────────────── tabs ──

const FONT_STACK = `'Geist Mono',ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;
const fontFace = (b64) =>
  `@font-face{font-family:'Geist Mono';font-weight:100 900;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;

// An image cannot hold more than one link, so each tab is its own image in its
// own link, in a row. Widths are percentages of the row, shared by both sizes,
// so one <img width> fits desktop and phone.
//
// They are drawn as separate buttons with clear space around them, on purpose:
// browsers round each image's width differently (Safari leaves a pixel or two
// between neighbours), and a designed gap hides what a seam would show.
function shareOut(labels, pad) {
  const units = labels.map((label) => [...label].length + pad); // pad: breathing room, in characters
  const total = units.reduce((a, b) => a + b, 0);
  const shares = units.map((u) => Math.floor((u / total) * 10000) / 100);
  // the last one takes what is left, stopping a hair short of 100% so rounding
  // can never push it onto a second line
  const rest = shares.slice(0, -1).reduce((a, b) => a + b, 0);
  shares[shares.length - 1] = Number((99.98 - rest).toFixed(2));
  return shares;
}

// One button in a row. `lit` is the open tab, or the button to press first.
function button(L, label, share, { first, last, lit }, uiFont) {
  const w = Number(((share / 100) * L.W).toFixed(2));
  const h = L.tabH + L.tabGap; // the button, then the space under it
  const left = first ? 0 : L.tabGutter;
  const right = last ? 0 : L.tabGutter;
  const bw = w - left - right;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">` +
    `<style>${fontFace(uiFont)}text{font-family:${FONT_STACK};font-size:${L.tabFs}px;font-variant-ligatures:none}</style>` +
    `<rect x="${n(left + 0.5)}" y=".5" width="${n(bw - 1)}" height="${L.tabH - 1}" rx="8.5" fill="${lit ? C.bg : C.panel}" stroke="${lit ? C.dim : C.border}"/>` +
    `<text x="${n(left + bw / 2)}" y="${n(L.tabH / 2 + L.tabFs * 0.34)}" text-anchor="middle" fill="${lit ? C.white : C.mid}"${lit ? ' font-weight="500"' : ''}>${esc(label)}</text>` +
    `</svg>\n`
  );
}

// The strip that closes the page, in the manner of the terminal's status bar.
function footer(L, lines, fontB64) {
  const lh = L.statusFs * 1.75;
  const h = Math.round(lines.length * lh + 18);
  const x = L.stacked ? L.padL : 24;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${h}" viewBox="0 0 ${L.W} ${h}" role="img" aria-label="${esc(lines.join(' '))}">` +
    `<style>${fontFace(fontB64)}text{font-family:${FONT_STACK};font-size:${L.statusFs}px;font-variant-ligatures:none;fill:${C.comment}}</style>` +
    `<rect x=".5" y=".5" width="${L.W - 1}" height="${h - 1}" rx="9.5" fill="${C.panel}" stroke="${C.border}"/>` +
    lines.map((ln, i) => `<text x="${x}" y="${n(9 + i * lh + lh / 2 + L.statusFs * 0.34)}">${esc(ln)}</text>`).join('') +
    `</svg>\n`
  );
}

// ──────────────────────────────────────────────────────────── terminal ──

function terminal(L, data, fontB64) {
  const cw = L.fs * 0.6; // Geist Mono's advance; the fallbacks are within a hair of it
  const body = [];
  let y = 0;
  let line = 0;
  let t = 0.25;

  const size = L.stacked ? 'narrow' : 'wide';
  const base = (top, lh = L.lh, fs = L.fs) => top + lh / 2 + fs * 0.34;
  const cols = Math.floor((L.W - L.padL - L.padR) / cw);

  const gutter = (top, when) => {
    line += 1;
    if (L.gutterX == null) return '';
    return `<text class="num rise" style="animation-delay:${sec(when)}" x="${L.gutterX}" y="${n(base(top))}" text-anchor="end">${line}</text>`;
  };
  const rise = (when, inner) => `<g class="rise" style="animation-delay:${sec(when)}">${inner}</g>`;
  const text = (x, top, str, cls) => `<text class="${cls}" x="${n(x)}" y="${n(base(top))}">${esc(str)}</text>`;

  // A typed command: the prompt appears, then one character at a time, with a
  // cursor riding along. Every character has its own x, so the cursor lands
  // exactly on the grid whichever monospace font the viewer ends up with.
  const command = (cmd, perChar) => {
    const top = y;
    const start = t;
    const x = L.padL;
    const chars = [...cmd]
      .map((ch, i) =>
        ch === ' '
          ? ''
          : `<tspan class="key" style="animation-delay:${sec(start + 0.3 + i * perChar)}" x="${n(x + (i + 2) * cw)}">${esc(ch)}</tspan>`,
      )
      .join('');
    const typing = cmd.length * perChar;
    body.push(
      gutter(top, start),
      `<text class="prompt rise" style="animation-delay:${sec(start)}" x="${n(x)}" y="${n(base(top))}">$</text>`,
      `<text class="cmd" y="${n(base(top))}">${chars}</text>`,
      `<rect class="cursor" style="--to:${n(cmd.length * cw)}px;animation-duration:${sec(typing)},${sec(typing + 0.75)};animation-delay:${sec(start + 0.3)},${sec(start + 0.05)};animation-timing-function:steps(${cmd.length},start),linear" x="${n(x + 2 * cw)}" y="${n(top + (L.lh - L.fs * 1.2) / 2)}" width="${n(cw)}" height="${n(L.fs * 1.2)}"/>`,
    );
    y += L.lh;
    t = start + 0.3 + typing + 0.22;
  };

  // ── headline
  y += L.stacked ? 24 : 30;
  const head = PROFILE.headline[size];
  body.push(gutter(y + (L.headLh - L.lh) / 2, t));
  head.forEach((str, i) => {
    body.push(
      rise(t + i * 0.09, `<text class="head" style="font-size:${L.headFs}px" x="${L.padL}" y="${n(base(y, L.headLh, L.headFs))}">${esc(str)}</text>`),
    );
    y += L.headLh;
  });
  t += 0.6;

  // ── whoami
  y += L.stacked ? 20 : 24;
  command('whoami', 0.075);
  {
    PROFILE.whoami[size].forEach(([str, tone], k) => {
      body.push(k ? '' : gutter(y, t));
      body.push(rise(t + k * 0.08, text(L.padL, y, str, tone)));
      y += L.lh;
    });
    t += 0.45;
  }

  // ── ls ~/shipped
  y += L.stacked ? 16 : 18;
  command('ls ~/shipped', 0.06);
  {
    let first = true;
    PROFILE.shipped.forEach(([name, about, short], i) => {
      const when = t + i * 0.09;
      body.push(first ? gutter(y, t) : '');
      first = false;
      if (L.stacked) {
        const lines = wrap(short, cols - 2);
        let block = text(L.padL, y, name, 'bright');
        y += L.lh;
        for (const ln of lines) {
          block += text(L.padL + 2 * cw, y, ln, 'mid');
          y += L.lh;
        }
        y += i === PROFILE.shipped.length - 1 ? 0 : 4;
        body.push(rise(when, block));
      } else {
        body.push(rise(when, text(L.padL, y, name, 'bright') + text(L.padL + L.nameCol * cw, y, about, 'mid')));
        y += L.lh;
      }
    });
    t += PROFILE.shipped.length * 0.09 + 0.35;
  }

  // ── skyline
  y += L.stacked ? 16 : 18;
  command(PROFILE.skylineCommand, 0.042);
  {
    const bandTop = y + 8;
    const ground = bandTop + L.sky.H * 1.34;
    line += 1; // the picture takes a line number of its own, like any output
    if (L.gutterX != null) {
      body.push(
        `<text class="num rise" style="animation-delay:${sec(t)}" x="${L.gutterX}" y="${n(base(bandTop))}" text-anchor="end">${line}</text>`,
      );
    }
    const sky = skyline({
      weeks: data.contributions.weeks,
      x0: L.padL,
      x1: L.W - L.padR,
      ground,
      H: L.sky.H,
      kiccScale: L.sky.kicc,
      monthFs: L.sky.monthFs,
      monthGap: L.sky.monthGap,
      t0: t,
    });
    body.push(sky.svg);
    y = ground + 6 + L.sky.monthFs + 12;
    t = sky.done;

    const total = data.contributions.total.toLocaleString('en-US');
    PROFILE.skylineCaption[size](total).forEach((ln, k) => {
      body.push(rise(t + k * 0.08, text(L.padL, y, `# ${ln}`, 'comment')));
      y += L.lh;
    });
    t += 0.5;
  }

  // ── the waiting prompt
  y += L.stacked ? 14 : 16;
  body.push(
    gutter(y, t),
    `<text class="prompt rise" style="animation-delay:${sec(t)}" x="${L.padL}" y="${n(base(y))}">$</text>`,
    `<g class="fade" style="animation-delay:${sec(t + 0.1)}"><rect class="idle" style="animation-delay:${sec(t + 0.1)}" x="${n(L.padL + 2 * cw)}" y="${n(y + (L.lh - L.fs * 1.2) / 2)}" width="${n(cw)}" height="${n(L.fs * 1.2)}"/></g>`,
  );
  y += L.lh;

  // ── status bar
  y += L.stacked ? 20 : 24;
  const status = PROFILE.status[size];
  const sy = y + L.statusH / 2 + L.statusFs * 0.34;
  body.push(
    `<rect y="${y}" width="${L.W}" height="${L.statusH}" fill="${C.panel}"/>`,
    `<path class="rule" d="M0 ${y + 0.5}H${L.W}"/>`,
    `<g style="font-size:${L.statusFs}px"><text class="status" x="${L.stacked ? L.padL : 24}" y="${n(sy)}">${esc(status[0])} <tspan class="statusOn">${esc(status[1])}</tspan></text>` +
      (L.stacked ? '' : `<text class="status" x="${L.W - 24}" y="${n(sy)}" text-anchor="end">nairobi, kenya</text>`) +
      `</g>`,
  );
  const H = y + L.statusH;

  const css = `
${fontFace(fontB64)}
text{font-family:${FONT_STACK};font-size:${L.fs}px;font-variant-ligatures:none;fill:${C.bright}}
.head{fill:${C.white};font-weight:500}
.prompt{fill:${C.orange};font-weight:600}
.cmd{fill:${C.white};font-weight:500}
.bright{fill:${C.bright};font-weight:500}
.mid{fill:${C.mid}}
.comment{fill:${C.comment}}
.num{fill:${C.faint};font-size:${L.fs - 2}px}
.status{fill:${C.comment}}
.statusOn{fill:${C.bright}}
.month{fill:${C.dim}}
.rule{stroke:${C.border};fill:none}
.cursor,.idle{fill:${C.orange}}
.kf{fill:#0c0c0f;stroke:#383a41;stroke-width:1;stroke-linejoin:round}
.kb{stroke:#202026;stroke-width:1;fill:none}
.kl{stroke:#383a41;stroke-width:1;fill:none}
.edge{stroke:#4a4c55;stroke-width:1;fill:none}
.mast{stroke:#4a4c55;stroke-width:1;fill:none}
.ground{stroke:${C.border};stroke-width:1;fill:none}
.tick{stroke:${C.faint};stroke-width:1;fill:none}
.off{fill:#2c2c34}
.dim{fill:#585a63}
.lit{fill:${C.bright}}
.star{fill:${C.dim}}
.now{fill:${C.orange}}
.rise{animation:rise .35s ease both}
.fade{animation:fade .7s ease both}
.key{animation:fade 1ms linear both}
.grow{transform-box:view-box;animation:grow .7s cubic-bezier(.16,.84,.3,1) both}
.cursor{opacity:0;animation-name:ride,show;animation-fill-mode:both,none}
.idle{animation:blink 1.1s steps(1) infinite}
.tw{animation:twinkle 9s ease-in-out infinite}
.now{animation:lamp 2.6s ease-in-out infinite}
.glow{animation:halo 2.6s ease-in-out infinite}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ride{from{transform:translateX(0)}to{transform:translateX(var(--to))}}
@keyframes show{from,to{opacity:1}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes twinkle{0%,62%,100%{opacity:1}70%,92%{opacity:.15}}
@keyframes lamp{0%,100%{opacity:1}50%{opacity:.72}}
@keyframes halo{0%,100%{opacity:1}50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`.trim();

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${H}" viewBox="0 0 ${L.W} ${H}" role="img" aria-labelledby="t d">` +
    `<title id="t">meshack musyoka — CTO at Ziya, software engineer, nairobi, kenya</title>` +
    `<desc id="d">A terminal session. whoami: meshack musyoka, software engineer in Nairobi, Kenya, CTO at Ziya. ` +
    `ls ~/shipped: ${PROFILE.shipped.map(([name, about]) => `${name} ${about}`).join('; ')}. ` +
    `Then a night skyline with one building for each week of the past year, taller for busier weeks: ` +
    `${data.contributions.total.toLocaleString('en-US')} contributions in all.</desc>` +
    `<style>${css}</style>` +
    `<defs><clipPath id="win"><rect width="${L.W}" height="${H}" rx="12"/></clipPath>` +
    [['b0', '#25252d', '#16161b'], ['b1', '#2b2b34', '#18181d'], ['b2', '#31313b', '#1a1a20']]
      .map(([id, a, b]) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`)
      .join('') +
    `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bright}" stop-opacity="0"/><stop offset="1" stop-color="${C.bright}" stop-opacity=".06"/></linearGradient>` +
    `<radialGradient id="lamp"><stop offset="0" stop-color="${C.orange}" stop-opacity=".55"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient></defs>` +
    `<g clip-path="url(#win)"><rect width="${L.W}" height="${H}" fill="${C.bg}"/>${body.join('')}</g>` +
    `<rect x=".5" y=".5" width="${L.W - 1}" height="${H - 1}" rx="11.5" fill="none" stroke="${C.border}"/>` +
    `</svg>\n`;
  return svg;
}

// ────────────────────────────────────────────────────────────── panels ──

// A section of the profile, drawn as its own terminal window in the same hand
// as the session up top. These stay still: they sit below the fold, and motion
// nobody is looking at is wasted.
function panel(L, name, blocks, fontB64) {
  const cw = L.fs * 0.6;
  const full = Math.floor((L.W - L.padL - L.padR) / cw); // what fits
  const cols = Math.min(L.measure, full); // what reads well, for running prose
  const out = [];
  const plain = []; // the same content as words, for the image's alt text
  let y = 0;
  let line = 0;
  let prev = 'top';

  const base = (top, lh = L.lh, fs = L.fs) => top + lh / 2 + fs * 0.34;
  const num = (top) => {
    line += 1;
    if (L.gutterX != null) out.push(`<text class="num" x="${L.gutterX}" y="${n(base(top))}" text-anchor="end">${line}</text>`);
  };
  const put = (x, str, cls) => out.push(`<text class="${cls}" x="${n(x)}" y="${n(base(y))}">${esc(str)}</text>`);
  const row = (x, str, cls) => {
    put(x, str, cls);
    y += L.lh;
  };
  // the space above a block depends on what it follows
  const space = (kind) => {
    const afterCmd = prev === 'cmd';
    const gap = { head: 26, cmd: prev === 'top' ? 26 : 24, entry: afterCmd ? 8 : 18, rows: afterCmd ? 8 : 6, text: afterCmd ? 8 : 6, run: 6, note: afterCmd ? 8 : 18 }[kind];
    y += L.stacked ? Math.round(gap * 0.85) : gap;
    prev = kind;
  };

  for (const b of blocks) {
    if (b.head) {
      space('head');
      num(y + (L.headLh - L.lh) / 2);
      for (const str of b.head) {
        out.push(`<text class="head" style="font-size:${L.headFs}px" x="${L.padL}" y="${n(base(y, L.headLh, L.headFs))}">${esc(str)}</text>`);
        y += L.headLh;
      }
      plain.push(b.head.join(' '));
    } else if (b.cmd || b.run) {
      // a command the reader watches run (numbered) or is invited to run (not)
      space(b.cmd ? 'cmd' : 'run');
      if (b.cmd) num(y);
      put(L.padL, '$', 'prompt');
      for (const ln of wrap(b.cmd || b.run, full - 2)) row(L.padL + 2 * cw, ln, 'cmd');
      plain.push(`$ ${b.cmd || b.run}`);
    } else if (b.entry) {
      space('entry');
      num(y);
      const title = wrap(b.entry, full);
      const tag = b.tag ? `[${b.tag}]` : '';
      title.forEach((ln, i) => {
        const last = i === title.length - 1;
        if (last && tag && ln.length + 1 + tag.length <= full) {
          out.push(`<text class="bright" x="${L.padL}" y="${n(base(y))}">${esc(ln)}<tspan class="tag" dx="${n(cw)}">${esc(tag)}</tspan></text>`);
          y += L.lh;
        } else {
          row(L.padL, ln, 'bright');
          if (last && tag) row(L.padL, tag, 'tag');
        }
      });
      for (const ln of wrap(b.text || '', cols)) row(L.padL, ln, 'mid');
      plain.push(`${b.entry}${tag ? ` ${tag}` : ''}. ${b.text || ''}`);
    } else if (b.rows) {
      const opensOutput = prev === 'cmd';
      space('rows');
      if (opensOutput) num(y);
      const stack = b.stack && L.stacked;
      b.rows.forEach(([label, value], i) => {
        if (stack) {
          if (i) y += 4;
          row(L.padL, label, 'bright');
          for (const ln of wrap(value, full - 2)) row(L.padL + 2 * cw, ln, 'mid');
        } else {
          put(L.padL, label, 'bright');
          for (const ln of wrap(value, full - b.label)) row(L.padL + b.label * cw, ln, 'mid');
        }
        plain.push(`${label}: ${value}.`);
      });
    } else if (b.note) {
      const opensOutput = prev === 'cmd';
      space('note');
      if (opensOutput) num(y);
      for (const str of b.note) for (const ln of wrap(str, cols - 2)) row(L.padL, `# ${ln}`, 'comment');
      plain.push(b.note.join(' '));
    } else if (b.text) {
      space('text');
      for (const ln of wrap(b.text, cols)) row(L.padL, ln, 'mid');
      plain.push(b.text);
    }
  }
  const H = y + (L.stacked ? 22 : 26);
  const css = [
    fontFace(fontB64),
    `text{font-family:${FONT_STACK};font-size:${L.fs}px;font-variant-ligatures:none;fill:${C.bright}}`,
    `.head{fill:${C.white};font-weight:500}.prompt{fill:${C.orange};font-weight:600}.cmd{fill:${C.white};font-weight:500}`,
    `.bright{fill:${C.bright};font-weight:500}.mid{fill:${C.mid}}.comment,.tag{fill:${C.comment};font-weight:400}`,
    `.num{fill:${C.faint};font-size:${L.fs - 2}px}`,
  ].join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${n(H)}" viewBox="0 0 ${L.W} ${n(H)}" role="img" aria-label="${esc(name)}">` +
    `<style>${css}</style>` +
    `<clipPath id="win"><rect width="${L.W}" height="${n(H)}" rx="12"/></clipPath>` +
    `<g clip-path="url(#win)"><rect width="${L.W}" height="${n(H)}" fill="${C.bg}"/>` +
    `${out.join('')}</g>` +
    `<rect x=".5" y=".5" width="${L.W - 1}" height="${n(H - 1)}" rx="11.5" fill="none" stroke="${C.border}"/></svg>\n`;
  return { svg, alt: `${name}. ${plain.join(' ')}` };
}

const npmSorted = (npm) => {
  const order = (name) => {
    const i = PROFILE.npm.order.indexOf(name);
    return i === -1 ? PROFILE.npm.order.length : i;
  };
  return [...npm.packages].sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name));
};

// The npm window is the one section built from live data.
function npmBlocks(npm) {
  const P = PROFILE.npm;
  const packages = npmSorted(npm);
  const blocks = [
    { head: P.head(packages.length) },
    { cmd: `npm search maintainer:${PROFILE.npmUser}` },
    { note: P.intro },
  ];
  for (const p of packages) {
    blocks.push({ entry: p.name, tag: p.version, text: P.about[p.name] || p.description.toLowerCase() });
    if (P.run[p.name]) blocks.push({ run: P.run[p.name] });
  }
  blocks.push({ note: P.outro });
  return blocks;
}

// ────────────────────────────────────────────────────────────── readme ──

const attr = (s) => esc(s).replace(/"/g, '&quot;');

// Two things learned from the live page:
// - GitHub renames <a id="work"> to "user-content-work". Its own script maps
//   #work onto that, but not everywhere: on the profile page in Chrome a #work
//   link changes the address and scrolls nowhere. Linking to the full name
//   needs no script at all, so it works in every browser.
// - The anchor must be an id, not a name. GitHub leaves room above an id
//   target for its sticky "Overview / Repositories" bar; a name target lands
//   underneath that bar, which hides the tab row a visitor just jumped to.
const jump = (name) => `#user-content-${name}`;
const picture = (file, attrs) =>
  `<picture><source media="(max-width: 600px)" srcset="assets/${file}-narrow.svg"><img src="assets/${file}.svg" ${attrs}></picture>`;

// GitHub links any bare image to its own file, which would take a visitor off
// the page. So every picture sits inside a link that stays on it instead.
function readme({ tabShares, buttonShares, alts, npm }) {
  // The tab row sits above every section with that section's tab lit, as on
  // the site, so a visitor can always get anywhere, including back up.
  // No whitespace between the tabs (a space would add to the gap);
  // align="top" keeps the row exactly as tall as the buttons.
  const tabRow = (open) =>
    PROFILE.tabs
      .map((name, i) => {
        const lit = name === open;
        return `<a href="${jump(i ? name : 'top')}">${picture(`tab-${name}${lit ? '-on' : ''}`, `width="${tabShares[i]}%" align="top" alt="${name}${lit ? ' (you are here)' : ''}"`)}</a>`;
      })
      .join('');
  const screen = (file, tab, anchor = tab, target = tab) =>
    `<p><a id="${anchor}"></a>${tabRow(tab)}<br><a href="${jump(target)}">${picture(file, `width="100%" align="top" alt="${attr(alts[file])}"`)}</a></p>`;

  const buttons = PROFILE.buttons
    .map(([key, label, url], i) => `<a href="${url}">${picture(`btn-${key}`, `width="${buttonShares[i]}%" align="top" alt="${attr(label)}"`)}</a>`)
    .join('');

  // Real text, because GitHub's copy button only works on real text. One block
  // per package, its name and version as a shell comment so pasting stays safe.
  const commands = npmSorted(npm)
    .filter((p) => PROFILE.npm.run[p.name])
    .map((p) => ['```sh', `# ${p.name} ${p.version}`, PROFILE.npm.run[p.name], '```'].join('\n'))
    .join('\n\n');

  return `<!-- Written by scripts/build.mjs. Change the words in scripts/content.mjs, then run it. -->
${screen('terminal', 'meshack', 'top', 'work')}

${screen('work', 'work')}

<details>
<summary><code>$ ls ~/work | tail -11</code></summary>
<br>

<p><a href="${jump('work')}">${picture('work-more', `width="100%" alt="${attr(alts['work-more'])}"`)}</a></p>

</details>

${screen('clients', 'clients')}

${screen('npm', 'npm')}

<details>
<summary><code>$ history | grep npx</code></summary>
<br>

${commands}

</details>

${screen('stack', 'stack')}

${screen('contact', 'contact')}

<p>${buttons}<br><a href="scripts/build.mjs">${picture('footer', `width="100%" align="top" alt="${attr(PROFILE.footer.wide.join(' '))}"`)}</a></p>
`;
}

// ──────────────────────────────────────────────────────────────── main ──

await mkdir(at('data'), { recursive: true });
const [contributions, npm, font, uiFont] = await Promise.all([
  load('contributions', fetchContributions, looksWhole),
  load('npm', fetchNpm),
  readFile(at('assets', 'fonts', 'GeistMono-subset.woff2')).then((b) => b.toString('base64')),
  readFile(at('assets', 'fonts', 'GeistMono-ui.woff2')).then((b) => b.toString('base64')),
]);

async function save(name, svg) {
  const file = at('assets', name);
  if ((await readFile(file, 'utf8').catch(() => '')) !== svg) await writeFile(file, svg);
}

const tabShares = shareOut(PROFILE.tabs, 4.7);
const buttonShares = shareOut(PROFILE.buttons.map(([, label]) => label), 2.4);
const alts = {
  terminal:
    'A terminal session. $ whoami: meshack musyoka, software engineer, nairobi, kenya. CTO at Ziya. ' +
    'I build developer tools, AI platforms, and products people actually pay for. ' +
    '$ ls ~/shipped: voice, easydaraja, docmtaani, creda, and 11 more. ' +
    'Then a night skyline of Nairobi with one tower for each week of my past year on GitHub. (Opens the work section.)',
};
const windows = {
  work: ['work', PROFILE.work.blocks],
  'work-more': ['work', PROFILE.workMore.blocks],
  clients: ['clients', PROFILE.clients.blocks],
  npm: ['npm', npmBlocks(npm)],
  stack: ['stack', PROFILE.stack.blocks],
  contact: ['contact', PROFILE.contact.blocks],
};
for (const [size, L] of Object.entries(LAYOUTS)) {
  const suffix = size === 'narrow' ? '-narrow' : '';
  await save(`terminal${suffix}.svg`, terminal(L, { contributions }, font));
  for (const [i, name] of PROFILE.tabs.entries()) {
    const at = { first: i === 0, last: i === PROFILE.tabs.length - 1 };
    await save(`tab-${name}${suffix}.svg`, button(L, name, tabShares[i], { ...at, lit: false }, uiFont));
    await save(`tab-${name}-on${suffix}.svg`, button(L, name, tabShares[i], { ...at, lit: true }, uiFont));
  }
  for (const [i, [key, label]] of PROFILE.buttons.entries()) {
    const at = { first: i === 0, last: i === PROFILE.buttons.length - 1, lit: i === 0 };
    await save(`btn-${key}${suffix}.svg`, button(L, label, buttonShares[i], at, uiFont));
  }
  await save(`footer${suffix}.svg`, footer(L, PROFILE.footer[size], font));
  for (const [file, [name, blocks]] of Object.entries(windows)) {
    const drawn = panel(L, name, blocks, font);
    await save(`${file}${suffix}.svg`, drawn.svg);
    alts[file] = drawn.alt;
  }
}
const page = readme({ tabShares, buttonShares, alts, npm });
if ((await readFile(at('README.md'), 'utf8').catch(() => '')) !== page) await writeFile(at('README.md'), page);
console.log(`${contributions.total} contributions · ${contributions.weeks.length} weeks · ${npm.packages.length} npm packages`);
// Still drew a good profile from saved data, but say so loudly in CI.
if (stale && process.env.CI) process.exitCode = 1;
