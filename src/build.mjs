// Builds every ScotMesh brand asset from source geometry.
// SVGs have text converted to outlines (no font dependency); PNGs are rendered with rsvg-convert.
// Usage: npm install && npm run build   (needs rsvg-convert and ImageMagick `magick` on PATH)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const COLOURS = {
  saltire: '#005EB8', // Pantone 300, the saltire blue
  night: '#0A1424',
  signal: '#F2B33D',
  mist: '#E6EDF7',
};
const MESH_LINK = '#23406A';
const MESH_NODE = '#4B72A6';
const TAGLINE_TINT = '#C9D6E8';
const PROTOCOL_TINT = '#7FA7D9';

const TAGLINE = 'Off-grid radio mesh across Scotland';
const PROTOCOLS = 'MeshCore · Meshtastic · Reticulum';

// ---------- fonts -> outlines ----------
function loadFont(file) {
  const b = fs.readFileSync(path.join(ROOT, 'src/fonts', file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const FONT = {
  mono: loadFont('IBMPlexMono-SemiBold.ttf'),
  monoRegular: loadFont('IBMPlexMono-Regular.ttf'),
  condensed: loadFont('IBMPlexSansCondensed-Regular.ttf'),
};

// Lays out `str` with its baseline at y; returns outline path data and bounds.
function outline(font, str, x, y, size, tracking = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  let cx = x, d = '';
  let y1 = Infinity, y2 = -Infinity;
  glyphs.forEach((g, i) => {
    const p = g.getPath(cx, y, size);
    const bb = p.getBoundingBox();
    if (bb.y1 < y1) y1 = bb.y1;
    if (bb.y2 > y2) y2 = bb.y2;
    d += p.toPathData(2);
    if (i < glyphs.length - 1) cx += g.advanceWidth * scale + tracking * size + font.getKerningValue(g, glyphs[i + 1]) * scale;
    else cx += g.advanceWidth * scale;
  });
  return { d, width: cx - x, top: y1, bottom: y2 };
}

// ---------- helpers ----------
const r1 = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const svgDoc = (w, h, title, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${inner}</svg>\n`;

function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}
function png(svgRel, pngRel, w, h) {
  const out = path.join(ROOT, pngRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('rsvg-convert', ['-w', String(w), '-h', String(h), '-o', out, path.join(ROOT, svgRel)]);
}

// ---------- the mark ----------
// The saltire drawn as a mesh: four corner nodes linked through a centre node,
// with fainter neighbours around the edge. Drawn on a 100-unit grid.
function markGeometry({ fg, field, faint, small }) {
  const k = small ? 25 : 24;
  const corners = [[k, k], [100 - k, k], [100 - k, 100 - k], [k, 100 - k]];
  const nodeR = small ? 11.5 : 9.5;
  const linkW = small ? 12 : 9;
  const ringR = 11, ringW = small ? 8 : 6;
  let g = '';
  if (faint) {
    const edge = [[50, 9], [91, 50], [50, 91], [9, 50]];
    let lines = '';
    for (let i = 0; i < 4; i++) {
      const [ex, ey] = edge[i], [px, py] = corners[i], [qx, qy] = corners[(i + 1) % 4];
      lines += `M${px} ${py}L${ex} ${ey}L${qx} ${qy}`;
    }
    g += `<path d="${lines}" fill="none" stroke="${fg}" stroke-opacity="0.32" stroke-width="2.2"/>`;
    g += `<g fill="${fg}" fill-opacity="0.45">${edge.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('')}</g>`;
  }
  // links stop under the centre ring so the ring reads on a transparent ground too
  const spokes = corners.map(([x, y]) => {
    const dx = 50 - x, dy = 50 - y, dist = Math.hypot(dx, dy), t = 1 - (ringR + linkW / 2) / dist;
    return `M${x} ${y}L${r1(x + dx * t)} ${r1(y + dy * t)}`;
  }).join('');
  g += `<path d="${spokes}" fill="none" stroke="${fg}" stroke-width="${linkW}" stroke-linecap="round"/>`;
  g += `<g fill="${fg}">${corners.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${nodeR}"/>`).join('')}</g>`;
  g += `<circle cx="50" cy="50" r="${ringR}" fill="${field ?? 'none'}" stroke="${fg}" stroke-width="${ringW}"/>`;
  return (field ? `<rect width="100" height="100" fill="${field}"/>` : '') + g;
}
const mark = (opts) => markGeometry({ fg: '#FFFFFF', field: COLOURS.saltire, faint: true, small: false, ...opts });

// ---------- mesh scenes (banners) ----------
function meshScene({ W, H, seed, saltire, textZone, text }) {
  const R = rng(seed);
  const u = H / 500;
  const { cx, cy, ext } = saltire;
  const ends = [[cx - ext, cy - ext], [cx + ext, cy + ext], [cx + ext, cy - ext], [cx - ext, cy + ext]];
  const segDist = (px, py, [ax, ay], [bx, by]) => {
    const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
  };
  const minGap = 62 * u, target = Math.round((W * H) / (1500 * 500) * 95 / (u * u));
  const nodes = [];
  for (let tries = 0; tries < target * 60 && nodes.length < target; tries++) {
    const x = R() * (W + 40 * u) - 20 * u, y = R() * (H + 40 * u) - 20 * u;
    if (textZone && x > textZone.x0 && x < textZone.x1 && y > textZone.y0 && y < textZone.y1 && R() > 0.35) continue;
    if (nodes.some((n) => Math.hypot(n[0] - x, n[1] - y) < minGap)) continue;
    if (segDist(x, y, ends[0], ends[1]) < 46 * u || segDist(x, y, ends[2], ends[3]) < 46 * u) continue;
    nodes.push([x, y]);
  }
  const xNodes = [];
  for (const [p, q] of [[ends[0], ends[1]], [ends[2], ends[3]]])
    for (const t of [0, 0.25, 0.75, 1]) xNodes.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
  const all = nodes.concat(xNodes, [[cx, cy]]);
  const seen = new Set();
  let links = '';
  all.forEach((n, i) => {
    all.map((m, j) => [Math.hypot(m[0] - n[0], m[1] - n[1]), j])
      .filter(([d, j]) => j !== i && d < 175 * u)
      .sort((a, b) => a[0] - b[0]).slice(0, 3)
      .forEach(([, j]) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        links += `M${r1(n[0])} ${r1(n[1])}L${r1(all[j][0])} ${r1(all[j][1])}`;
      });
  });
  const xLines = `M${r1(ends[0][0])} ${r1(ends[0][1])}L${r1(ends[1][0])} ${r1(ends[1][1])}M${r1(ends[2][0])} ${r1(ends[2][1])}L${r1(ends[3][0])} ${r1(ends[3][1])}`;
  const pkt = [ends[2][0] + 0.62 * (ends[3][0] - ends[2][0]), ends[2][1] + 0.62 * (ends[3][1] - ends[2][1])];
  return `<rect width="${W}" height="${H}" fill="${COLOURS.night}"/>` +
    `<path d="${links}" fill="none" stroke="${MESH_LINK}" stroke-width="${r1(1.6 * u)}"/>` +
    `<g fill="${MESH_NODE}">${nodes.map(([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(3.6 * u)}"/>`).join('')}</g>` +
    `<path d="${xLines}" fill="none" stroke="${COLOURS.saltire}" stroke-opacity="0.45" stroke-width="${r1(22 * u)}" stroke-linecap="round"/>` +
    `<path d="${xLines}" fill="none" stroke="#FFFFFF" stroke-width="${r1(6 * u)}" stroke-linecap="round"/>` +
    `<g fill="#FFFFFF">${xNodes.map(([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(10 * u)}"/>`).join('')}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="${r1(15 * u)}" fill="${COLOURS.saltire}" stroke="#FFFFFF" stroke-width="${r1(7 * u)}"/>` +
    `<circle cx="${r1(pkt[0])}" cy="${r1(pkt[1])}" r="${r1(16 * u)}" fill="${COLOURS.signal}" fill-opacity="0.25"/>` +
    `<circle cx="${r1(pkt[0])}" cy="${r1(pkt[1])}" r="${r1(7 * u)}" fill="${COLOURS.signal}"/>` +
    (text ?? '');
}

// Wordmark, tagline and protocol line stacked and vertically centred on `midY`.
function textBlock({ x, midY, size, tagline = true, protocols = true }) {
  const wordGap = size * 0.2, lineGap = size * 0.16;
  const tagSize = size * 0.325, protoSize = size * 0.2;
  const probe = outline(FONT.mono, 'scotmesh', 0, 0, size, -0.03);
  const wordH = probe.bottom - probe.top;
  const tagProbe = outline(FONT.condensed, TAGLINE, 0, 0, tagSize);
  const tagH = tagProbe.bottom - tagProbe.top;
  const protoProbe = outline(FONT.monoRegular, PROTOCOLS, 0, 0, protoSize);
  const protoH = protoProbe.bottom - protoProbe.top;
  const total = wordH + (tagline ? wordGap + tagH : 0) + (protocols ? lineGap + protoH : 0);
  let top = midY - total / 2;
  let out = '';
  const word = outline(FONT.mono, 'scotmesh', x - size * 0.04, top - probe.top, size, -0.03);
  out += `<path d="${word.d}" fill="#FFFFFF"/>`;
  top += wordH + wordGap;
  if (tagline) {
    const t = outline(FONT.condensed, TAGLINE, x, top - tagProbe.top, tagSize);
    out += `<path d="${t.d}" fill="${TAGLINE_TINT}"/>`;
    top += tagH + lineGap;
  }
  if (protocols) {
    const p = outline(FONT.monoRegular, PROTOCOLS, x, top - protoProbe.top, protoSize);
    out += `<path d="${p.d}" fill="${PROTOCOL_TINT}"/>`;
  }
  return { svg: out, width: word.width };
}

// ---------- build ----------
const built = [];
function asset(rel, w, h, title, inner, pngs = []) {
  write(rel, svgDoc(w, h, title, inner));
  built.push(rel);
  for (const [pngRel, pw, ph] of pngs) { png(rel, pngRel, pw, ph); built.push(pngRel); }
}

// Logo
const markSvg = (opts) => `<svg x="0" y="0" width="100" height="100" viewBox="0 0 100 100">${mark(opts)}</svg>`;
asset('logo/scotmesh-mark.svg', 100, 100, 'ScotMesh', markSvg(), [
  ['logo/scotmesh-mark-1024.png', 1024, 1024], ['logo/scotmesh-mark-512.png', 512, 512], ['logo/scotmesh-mark-256.png', 256, 256],
]);
asset('logo/scotmesh-mark-small.svg', 100, 100, 'ScotMesh', markSvg({ faint: false, small: true }), [
  ['logo/scotmesh-mark-small-64.png', 64, 64], ['logo/favicon-48.png', 48, 48], ['logo/favicon-32.png', 32, 32], ['logo/favicon-16.png', 16, 16],
]);
asset('logo/scotmesh-glyph-blue.svg', 100, 100, 'ScotMesh', mark({ field: null, fg: COLOURS.saltire }), [['logo/scotmesh-glyph-blue-512.png', 512, 512]]);
asset('logo/scotmesh-glyph-white.svg', 100, 100, 'ScotMesh', mark({ field: null, fg: '#FFFFFF' }), [['logo/scotmesh-glyph-white-512.png', 512, 512]]);
execFileSync('magick', ['logo/favicon-16.png', 'logo/favicon-32.png', 'logo/favicon-48.png', 'logo/favicon.ico'], { cwd: ROOT });
built.push('logo/favicon.ico');

// Platform avatars (same mark, named for where they go)
png('logo/scotmesh-mark.svg', 'avatars/github-org-avatar.png', 1024, 1024);
png('logo/scotmesh-mark.svg', 'avatars/discord-server-icon.png', 512, 512);
built.push('avatars/github-org-avatar.png', 'avatars/discord-server-icon.png');

// Wordmarks and lockups
for (const [bg, fill] of [['dark', '#FFFFFF'], ['light', COLOURS.night]]) {
  const size = 108;
  const probe = outline(FONT.mono, 'scotmesh', 0, 0, size, -0.03);
  const word = outline(FONT.mono, 'scotmesh', -size * 0.04, -probe.top, size, -0.03);
  const ww = Math.ceil(word.width - size * 0.08), wh = Math.ceil(probe.bottom - probe.top);
  asset(`wordmark/scotmesh-wordmark-on-${bg}.svg`, ww, wh, 'scotmesh', `<path d="${word.d}" fill="${fill}"/>`,
    [[`wordmark/scotmesh-wordmark-on-${bg}.png`, ww * 4, wh * 4]]);

  const T = 120, gap = 36;
  const baseline = T / 2 - (probe.top + probe.bottom) / 2;
  const lw = outline(FONT.mono, 'scotmesh', T + gap - size * 0.04, baseline, size, -0.03);
  const lockW = Math.ceil(T + gap + lw.width - size * 0.08);
  asset(`wordmark/scotmesh-lockup-on-${bg}.svg`, lockW, T, 'ScotMesh',
    `<svg width="${T}" height="${T}" viewBox="0 0 100 100">${mark()}</svg><path d="${lw.d}" fill="${fill}"/>`,
    [[`wordmark/scotmesh-lockup-on-${bg}.png`, lockW * 4, T * 4]]);
}

// Banners
function banner(rel, W, H, title, { saltire, text, seed }) {
  let block = null, zone = null;
  if (text) {
    block = textBlock(text);
    zone = { x0: 0, x1: text.x + block.width + 60, y0: 0, y1: H };
  }
  asset(rel.replace(/\.png$/, '.svg'), W, H, title, meshScene({ W, H, seed, saltire, textZone: zone, text: block?.svg }), [[rel, W, H]]);
}
banner('social/header-1500x500.png', 1500, 500, 'ScotMesh header', {
  seed: 7, saltire: { cx: 1130, cy: 250, ext: 232 }, text: { x: 70, midY: 225, size: 100 },
});
banner('social/github-social-preview.png', 1280, 640, 'ScotMesh', {
  seed: 12, saltire: { cx: 985, cy: 320, ext: 220 }, text: { x: 84, midY: 320, size: 104 },
});
banner('social/readme-header.png', 1600, 400, 'ScotMesh', {
  seed: 5, saltire: { cx: 1320, cy: 200, ext: 160 }, text: { x: 72, midY: 200, size: 92 },
});
banner('social/discord-banner.png', 960, 540, 'ScotMesh Discord banner', {
  seed: 21, saltire: { cx: 480, cy: 270, ext: 190 },
});
banner('social/discord-invite-splash.png', 1920, 1080, 'ScotMesh Discord invite background', {
  seed: 33, saltire: { cx: 1500, cy: 540, ext: 360 },
});

console.log(built.map((f) => `  ${f}`).join('\n'));
