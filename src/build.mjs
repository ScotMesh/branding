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


// The three networks ScotMesh runs. Tints share lightness and chroma (oklch 0.74 / 0.13) and differ only in hue;
// `deep` is the same hue at 0.50 lightness, for text on light backgrounds.
export const NETWORKS = {
  meshcore: { name: 'MeshCore', slug: 'meshcore', tint: '#56B4F5', deep: '#0069A6', tagline: 'Long-range LoRa messaging across Scotland' },
  meshtastic: { name: 'Meshtastic', slug: 'meshtastic', tint: '#65C281', deep: '#05773B', tagline: 'LoRa mesh nodes across Scotland' },
  reticulum: { name: 'Reticulum', slug: 'reticulum', tint: '#B199F4', deep: '#6A51A4', tagline: 'Encrypted networking over any bearer' },
};

// ---------- the mark ----------
// The saltire drawn as a mesh: four corner nodes linked through a centre node,
// with fainter neighbours around the edge. Drawn on a 100-unit grid.
// Network versions sit on Night, with the network tint in the centre node and the outer mesh.
function markGeometry({ fg, field, faint, small, net }) {
  const k = small ? 25 : 24;
  const corners = [[k, k], [100 - k, k], [100 - k, 100 - k], [k, 100 - k]];
  const nodeR = small ? 11.5 : 9.5;
  const linkW = small ? 12 : 9;
  // small network marks need a bigger coloured centre to stay identifiable at 16px
  const ringR = net ? (small ? 15 : 12.5) : 11, ringW = net && small ? 5 : small ? 8 : 6;
  const meshColour = net ? net.tint : fg;
  let g = '';
  if (faint) {
    const edge = [[50, 9], [91, 50], [50, 91], [9, 50]];
    let lines = '';
    for (let i = 0; i < 4; i++) {
      const [ex, ey] = edge[i], [px, py] = corners[i], [qx, qy] = corners[(i + 1) % 4];
      lines += `M${px} ${py}L${ex} ${ey}L${qx} ${qy}`;
    }
    g += `<path d="${lines}" fill="none" stroke="${meshColour}" stroke-opacity="${net ? 0.55 : 0.32}" stroke-width="2.2"/>`;
    g += `<g fill="${meshColour}" fill-opacity="${net ? 0.85 : 0.45}">${edge.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('')}</g>`;
  }
  // links stop under the centre ring so the ring reads on a transparent ground too
  const spokes = corners.map(([x, y]) => {
    const dx = 50 - x, dy = 50 - y, dist = Math.hypot(dx, dy), t = 1 - (ringR + linkW / 2) / dist;
    return `M${x} ${y}L${r1(x + dx * t)} ${r1(y + dy * t)}`;
  }).join('');
  g += `<path d="${spokes}" fill="none" stroke="${fg}" stroke-width="${linkW}" stroke-linecap="round"/>`;
  g += `<g fill="${fg}">${corners.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${nodeR}"/>`).join('')}</g>`;
  g += `<circle cx="50" cy="50" r="${ringR}" fill="${net ? net.tint : field ?? 'none'}" stroke="${fg}" stroke-width="${ringW}"/>`;
  return (field ? `<rect width="100" height="100" fill="${field}"/>` : '') + g;
}
const mark = (opts = {}) => markGeometry({
  fg: '#FFFFFF', field: opts.net ? COLOURS.night : COLOURS.saltire, faint: true, small: false, ...opts,
});
const nested = (inner, x = 0, y = 0, size = 100) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100">${inner}</svg>`;

// ---------- mesh scenes (banners) ----------
function meshScene({ W, H, seed, saltire, textZone, text, net }) {
  const R = rng(seed);
  const u = H / 500;
  const glow = net ? net.tint : COLOURS.saltire;
  const centre = net ? net.tint : COLOURS.saltire;
  const packet = net ? net.tint : COLOURS.signal;
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
    `<path d="${xLines}" fill="none" stroke="${glow}" stroke-opacity="${net ? 0.28 : 0.45}" stroke-width="${r1(22 * u)}" stroke-linecap="round"/>` +
    `<path d="${xLines}" fill="none" stroke="#FFFFFF" stroke-width="${r1(6 * u)}" stroke-linecap="round"/>` +
    `<g fill="#FFFFFF">${xNodes.map(([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(10 * u)}"/>`).join('')}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="${r1(15 * u)}" fill="${centre}" stroke="#FFFFFF" stroke-width="${r1(7 * u)}"/>` +
    `<circle cx="${r1(pkt[0])}" cy="${r1(pkt[1])}" r="${r1(16 * u)}" fill="${packet}" fill-opacity="0.25"/>` +
    `<circle cx="${r1(pkt[0])}" cy="${r1(pkt[1])}" r="${r1(7 * u)}" fill="${packet}"/>` +
    (text ?? '');
}

// Wordmark (plus network name), tagline and protocol line stacked and vertically centred on `midY`.
function textBlock({ x, midY, size, tagline = true, protocols = true, net }) {
  const tagText = net ? net.tagline : TAGLINE;
  const wordGap = size * 0.2, lineGap = size * 0.16, netGap = size * 0.1;
  const tagSize = size * 0.325, protoSize = size * 0.2, netSize = size * 0.56;
  const probe = outline(FONT.mono, 'scotmesh', 0, 0, size, -0.03);
  const wordH = probe.bottom - probe.top;
  const netText = net ? `/${net.slug}` : '';
  const netProbe = net && outline(FONT.mono, netText, 0, 0, netSize, -0.02);
  const netH = net ? netProbe.bottom - netProbe.top : 0;
  const tagProbe = outline(FONT.condensed, tagText, 0, 0, tagSize);
  const tagH = tagProbe.bottom - tagProbe.top;
  const protoProbe = outline(FONT.monoRegular, PROTOCOLS, 0, 0, protoSize);
  const protoH = protoProbe.bottom - protoProbe.top;
  const showProto = protocols && !net;
  const total = wordH + (net ? netGap + netH : 0) + (tagline ? wordGap + tagH : 0) + (showProto ? lineGap + protoH : 0);
  let top = midY - total / 2;
  let out = '';
  const word = outline(FONT.mono, 'scotmesh', x - size * 0.04, top - probe.top, size, -0.03);
  out += `<path d="${word.d}" fill="#FFFFFF"/>`;
  top += wordH;
  let width = word.width;
  if (net) {
    top += netGap;
    const n = outline(FONT.mono, netText, x - netSize * 0.02, top - netProbe.top, netSize, -0.02);
    out += `<path d="${n.d}" fill="${net.tint}"/>`;
    width = Math.max(width, n.width);
    top += netH;
  }
  top += wordGap;
  if (tagline) {
    const t = outline(FONT.condensed, tagText, x, top - tagProbe.top, tagSize);
    out += `<path d="${t.d}" fill="${TAGLINE_TINT}"/>`;
    width = Math.max(width, t.width);
    top += tagH + lineGap;
  }
  if (showProto) {
    const p = outline(FONT.monoRegular, PROTOCOLS, x, top - protoProbe.top, protoSize);
    out += `<path d="${p.d}" fill="${PROTOCOL_TINT}"/>`;
  }
  return { svg: out, width };
}

// ---------- build ----------
const built = [];
function asset(rel, w, h, title, inner, pngs = []) {
  write(rel, svgDoc(w, h, title, inner));
  built.push(rel);
  for (const [pngRel, pw, ph] of pngs) { png(rel, pngRel, pw, ph); built.push(pngRel); }
}
function pngOnly(svgRel, pngRel, w, h) { png(svgRel, pngRel, w, h); built.push(pngRel); }
function ico(dir, sources) {
  execFileSync('magick', [...sources, 'favicon.ico'], { cwd: path.join(ROOT, dir) });
  built.push(`${dir}/favicon.ico`);
}
function banner(rel, W, H, title, { saltire, text, seed, net, png: withPng = true }) {
  let block = null, zone = null;
  if (text) {
    block = textBlock({ ...text, net });
    zone = { x0: 0, x1: text.x + block.width + 60, y0: 0, y1: H };
  }
  const svgRel = rel.replace(/\.png$/, '.svg');
  asset(svgRel, W, H, title, meshScene({ W, H, seed, saltire, textZone: zone, text: block?.svg, net }), withPng ? [[rel, W, H]] : []);
}

// Lockup: mark tile, then "scotmesh" (and "/network") set to the tile's height.
// `short` drops the network name, for tight spaces like an app's nav bar (about 5.6:1).
function lockup(rel, { net, fill, netFill, short = false, pngScale = 4 }) {
  const size = 108, T = 120, gap = 36;
  const probe = outline(FONT.mono, 'scotmesh', 0, 0, size, -0.03);
  const baseline = T / 2 - (probe.top + probe.bottom) / 2;
  const word = outline(FONT.mono, 'scotmesh', T + gap - size * 0.04, baseline, size, -0.03);
  let inner = nested(mark({ net }), 0, 0, T) + `<path d="${word.d}" fill="${fill}"/>`;
  let right = T + gap + word.width - size * 0.08;
  if (net && !short) {
    const n = outline(FONT.mono, `/${net.slug}`, right + size * 0.02, baseline, size, -0.03);
    inner += `<path d="${n.d}" fill="${netFill}"/>`;
    right += n.width - size * 0.02;
  }
  const w = Math.ceil(right);
  asset(rel, w, T, net ? `ScotMesh ${net.name}` : 'ScotMesh', inner, [[rel.replace(/\.svg$/, '.png'), w * pngScale, T * pngScale]]);
}

// Stacked network lockup: the network mark, then "scotmesh" over "/network". About 4:1, for nav bars and site headers.
function lockupStacked(rel, { net, fill, netFill, pngScale = 4 }) {
  const T = 120, gap = 28, s1 = 62, s2 = 50, lineGap = 12;
  const p1 = outline(FONT.mono, 'scotmesh', 0, 0, s1, -0.03);
  const p2 = outline(FONT.mono, `/${net.slug}`, 0, 0, s2, -0.02);
  const h1 = p1.bottom - p1.top, h2 = p2.bottom - p2.top;
  const top = (T - (h1 + lineGap + h2)) / 2;
  const x = T + gap;
  const w1 = outline(FONT.mono, 'scotmesh', x - s1 * 0.04, top - p1.top, s1, -0.03);
  const w2 = outline(FONT.mono, `/${net.slug}`, x - s2 * 0.02, top + h1 + lineGap - p2.top, s2, -0.02);
  const w = Math.ceil(x + Math.max(w1.width - s1 * 0.08, w2.width - s2 * 0.04));
  const inner = nested(mark({ net }), 0, 0, T) + `<path d="${w1.d}" fill="${fill}"/><path d="${w2.d}" fill="${netFill}"/>`;
  asset(rel, w, T, `ScotMesh ${net.name}`, inner, [[rel.replace(/\.svg$/, '.png'), w * pngScale, T * pngScale]]);
}

// A mark on a transparent square with padding, for stickers.
const padded = (inner, pad) => nested(inner, pad, pad, 100 - pad * 2);

// ===== ScotMesh =====

// Logo
asset('logo/scotmesh-mark.svg', 100, 100, 'ScotMesh', nested(mark()), [
  ['logo/scotmesh-mark-1024.png', 1024, 1024], ['logo/scotmesh-mark-512.png', 512, 512], ['logo/scotmesh-mark-256.png', 256, 256],
]);
asset('logo/scotmesh-mark-small.svg', 100, 100, 'ScotMesh', nested(mark({ faint: false, small: true })), [
  ['logo/scotmesh-mark-small-64.png', 64, 64],
]);
asset('logo/scotmesh-glyph-blue.svg', 100, 100, 'ScotMesh', mark({ field: null, fg: COLOURS.saltire }), [['logo/scotmesh-glyph-blue-512.png', 512, 512]]);
asset('logo/scotmesh-glyph-white.svg', 100, 100, 'ScotMesh', mark({ field: null, fg: '#FFFFFF' }), [['logo/scotmesh-glyph-white-512.png', 512, 512]]);

// Wordmarks and lockups
for (const [bg, fill] of [['dark', '#FFFFFF'], ['light', COLOURS.night]]) {
  const size = 108;
  const probe = outline(FONT.mono, 'scotmesh', 0, 0, size, -0.03);
  const word = outline(FONT.mono, 'scotmesh', -size * 0.04, -probe.top, size, -0.03);
  const ww = Math.ceil(word.width - size * 0.08), wh = Math.ceil(probe.bottom - probe.top);
  asset(`wordmark/scotmesh-wordmark-on-${bg}.svg`, ww, wh, 'scotmesh', `<path d="${word.d}" fill="${fill}"/>`,
    [[`wordmark/scotmesh-wordmark-on-${bg}.png`, ww * 4, wh * 4]]);
  lockup(`wordmark/scotmesh-lockup-on-${bg}.svg`, { fill });
}

// Web: favicons, app icons, manifest, header art, link previews
asset('web/favicon.svg', 100, 100, 'ScotMesh', nested(mark({ faint: false, small: true })), [
  ['web/favicon-16.png', 16, 16], ['web/favicon-32.png', 32, 32], ['web/favicon-48.png', 48, 48],
]);
ico('web', ['favicon-16.png', 'favicon-32.png', 'favicon-48.png']);
pngOnly('logo/scotmesh-mark.svg', 'web/apple-touch-icon.png', 180, 180);
pngOnly('logo/scotmesh-mark.svg', 'web/icon-192.png', 192, 192);
pngOnly('logo/scotmesh-mark.svg', 'web/icon-512.png', 512, 512);
// maskable icons get cropped to a circle of 80% diameter, so the glyph shrinks onto a full field
asset('web/icon-maskable.svg', 100, 100, 'ScotMesh', `<rect width="100" height="100" fill="${COLOURS.saltire}"/>` + nested(mark(), 12, 12, 76), [['web/icon-maskable-512.png', 512, 512]]);
write('web/site.webmanifest', JSON.stringify({
  name: 'ScotMesh', short_name: 'ScotMesh', theme_color: COLOURS.night, background_color: COLOURS.night, display: 'standalone',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');
built.push('web/site.webmanifest');
banner('web/og-image.png', 1200, 630, 'ScotMesh', { seed: 14, saltire: { cx: 925, cy: 315, ext: 205 }, text: { x: 76, midY: 315, size: 100 } });
write('web/header-mesh.svg', svgDoc(1500, 500, 'ScotMesh mesh', meshScene({
  W: 1500, H: 500, seed: 9, saltire: { cx: 1190, cy: 250, ext: 190 }, textZone: { x0: 0, x1: 820, y0: 0, y1: 500 },
})));
built.push('web/header-mesh.svg');

// GitHub
pngOnly('logo/scotmesh-mark.svg', 'github/org-avatar.png', 1024, 1024);
banner('github/social-preview.png', 1280, 640, 'ScotMesh', { seed: 12, saltire: { cx: 985, cy: 320, ext: 220 }, text: { x: 84, midY: 320, size: 104 } });
banner('social/readme-header.png', 1600, 400, 'ScotMesh', { seed: 5, saltire: { cx: 1320, cy: 200, ext: 160 }, text: { x: 72, midY: 200, size: 92 } });

// Social platforms. Built once for ScotMesh and once per network, so each network's own
// groups, servers and channels get a full set. `base` is '' or 'networks/<slug>/'.
function socialPlatforms(base, net) {
  const markSvg = net ? `${base}mark.svg` : 'logo/scotmesh-mark.svg';
  const smallSvg = net ? `${base}mark-small.svg` : 'logo/scotmesh-mark-small.svg';
  const name = net ? `ScotMesh ${net.name}` : 'ScotMesh';
  const o = (extra) => ({ net, ...extra });

  // Discord
  pngOnly(markSvg, `${base}discord/server-icon.png`, 512, 512);
  banner(`${base}discord/banner.png`, 960, 540, `${name} Discord banner`, o({ seed: 21, saltire: { cx: 480, cy: 270, ext: 190 } }));
  banner(`${base}discord/invite-splash.png`, 1920, 1080, `${name} Discord invite background`, o({ seed: 33, saltire: { cx: 1500, cy: 540, ext: 360 } }));
  banner(`${base}discord/discovery-splash.png`, 1920, 1080, `${name} Discord discovery splash`, o({ seed: 34, saltire: { cx: 960, cy: 540, ext: 330 } }));
  banner(`${base}discord/event-cover.png`, 800, 320, `${name} event`, o({ seed: 41, saltire: { cx: 640, cy: 160, ext: 110 }, text: { x: 44, midY: 160, size: 60, protocols: false } }));
  asset(`${base}discord/sticker.svg`, 100, 100, name, padded(mark({ net }), 4), [[`${base}discord/sticker.png`, 320, 320]]);
  pngOnly(smallSvg, `${base}discord/emoji.png`, 128, 128);

  // Facebook: group covers crop the sides on mobile, so everything important sits in the middle 1200px
  pngOnly(markSvg, `${base}facebook/profile.png`, 720, 720);
  banner(`${base}facebook/group-cover.png`, 1640, 856, name, o({ seed: 51, saltire: { cx: 1180, cy: 428, ext: 230 }, text: { x: 250, midY: 428, size: 112 } }));
  banner(`${base}facebook/event-cover.png`, 1920, 1005, `${name} event`, o({ seed: 52, saltire: { cx: 1400, cy: 502, ext: 300 }, text: { x: 200, midY: 502, size: 140 } }));

  // YouTube: the banner's safe area on every device is the centre 1546×423
  pngOnly(markSvg, `${base}youtube/profile.png`, 800, 800);
  banner(`${base}youtube/banner.png`, 2560, 1440, name, o({ seed: 61, saltire: { cx: 1830, cy: 720, ext: 170 }, text: { x: 560, midY: 720, size: net ? 96 : 110 } }));

  // X, Mastodon, Bluesky
  pngOnly(markSvg, `${base}x-mastodon/avatar.png`, 400, 400);
  banner(`${base}x-mastodon/header.png`, 1500, 500, `${name} header`, o({ seed: 7, saltire: { cx: 1130, cy: 250, ext: 232 }, text: { x: 70, midY: net ? 235 : 225, size: 100 } }));
  pngOnly(markSvg, `${base}bluesky/avatar.png`, 1000, 1000);
  banner(`${base}bluesky/banner.png`, 3000, 1000, `${name} header`, o({ seed: 71, saltire: { cx: 2260, cy: 500, ext: 464 }, text: { x: 140, midY: net ? 470 : 450, size: 200 } }));

  // Chat groups (WhatsApp, Telegram, Signal): square icon, cropped to a circle by all three
  pngOnly(markSvg, `${base}groups/icon.png`, 640, 640);
}
socialPlatforms('');

// ===== Networks =====
for (const net of Object.values(NETWORKS)) {
  const d = `networks/${net.slug}`;
  const t = `ScotMesh ${net.name}`;
  asset(`${d}/mark.svg`, 100, 100, t, nested(mark({ net })), [[`${d}/mark-1024.png`, 1024, 1024], [`${d}/mark-512.png`, 512, 512]]);
  asset(`${d}/mark-small.svg`, 100, 100, t, nested(mark({ net, faint: false, small: true })), [
    [`${d}/favicon-16.png`, 16, 16], [`${d}/favicon-32.png`, 32, 32], [`${d}/favicon-48.png`, 48, 48],
    [`${d}/discord-role-icon.png`, 64, 64], [`${d}/discord-emoji.png`, 128, 128],
  ]);
  ico(d, ['favicon-16.png', 'favicon-32.png', 'favicon-48.png']);
  pngOnly(`${d}/mark.svg`, `${d}/apple-touch-icon.png`, 180, 180);
  lockup(`${d}/lockup-on-dark.svg`, { net, fill: '#FFFFFF', netFill: net.tint });
  lockup(`${d}/lockup-on-light.svg`, { net, fill: COLOURS.night, netFill: net.deep });
  lockup(`${d}/lockup-short-on-dark.svg`, { net, fill: '#FFFFFF', short: true });
  lockupStacked(`${d}/lockup-stacked-on-dark.svg`, { net, fill: '#FFFFFF', netFill: net.tint });
  lockupStacked(`${d}/lockup-stacked-on-light.svg`, { net, fill: COLOURS.night, netFill: net.deep });
  lockup(`${d}/lockup-short-on-light.svg`, { net, fill: COLOURS.night, short: true });
  banner(`${d}/readme-header.png`, 1600, 400, t, { net, seed: 5, saltire: { cx: 1320, cy: 200, ext: 160 }, text: { x: 72, midY: 200, size: 88 } });
  banner(`${d}/og-image.png`, 1200, 630, t, { net, seed: 14, saltire: { cx: 925, cy: 315, ext: 205 }, text: { x: 76, midY: 315, size: 100 } });
  banner(`${d}/github-social-preview.png`, 1280, 640, t, { net, seed: 12, saltire: { cx: 985, cy: 320, ext: 220 }, text: { x: 84, midY: 320, size: 104 } });
  banner(`${d}/header.png`, 1500, 500, t, { net, seed: 7, saltire: { cx: 1130, cy: 250, ext: 232 }, text: { x: 70, midY: 235, size: 100 } });
  write(`${d}/header-mesh.svg`, svgDoc(1500, 500, t, meshScene({
    net, W: 1500, H: 500, seed: 9, saltire: { cx: 1190, cy: 250, ext: 190 }, textZone: { x0: 0, x1: 820, y0: 0, y1: 500 },
  })));
  built.push(`${d}/header-mesh.svg`);
  socialPlatforms(`${d}/`, net);
}

console.log(`${built.length} files`);
