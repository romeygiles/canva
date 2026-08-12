// Renders the editor state into a standalone SVG string.
//
// The design is drawn as SVG rather than HTML so that the preview, the print
// output and the PNG export are all produced from exactly the same code path.
// Everything is expressed in the surface's own coordinate system, so the same
// layout code serves a 5 x 7 card and a mug wrap.

import { fontStack } from './templates.js';
import { surfaceById } from './surfaces.js';

/* ───────────────────────── text measuring ───────────────────────── */

const gauge = document.createElement('canvas').getContext('2d');

function fontShorthand({ size, family, weight = 400, italic = false }) {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
}

function measure(text, style) {
  gauge.font = fontShorthand(style);
  const spacing = style.spacing || 0;
  return gauge.measureText(text).width + spacing * Math.max(0, text.length - 1);
}

/** Greedy word wrap that also honours explicit newlines. */
function wrap(text, maxWidth, style) {
  const out = [];
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }

    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${line} ${words[i]}`;
      if (measure(candidate, style) <= maxWidth) {
        line = candidate;
      } else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}

/** Shrink the type until the text fits the column in `maxLines` or fewer. */
function fit(text, { max, min, maxLines, style, width }) {
  let lines = [text];
  for (let size = max; size >= min; size -= Math.max(1, Math.round(max / 50))) {
    lines = wrap(text, width, { ...style, size });
    const tooTall = lines.length > maxLines;
    const tooWide = lines.some(l => measure(l, { ...style, size }) > width);
    if (!tooTall && !tooWide) return { size, lines };
  }
  return { size: min, lines };
}

/* ───────────────────────── markup helpers ───────────────────────── */

const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const round = n => Math.round(n * 100) / 100;

/* ───────────────────────── decoration ───────────────────────── */

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sprig(x, y, angle, scale, c) {
  const leaves = [];
  for (let i = 1; i <= 7; i++) {
    const along = i * 26;
    const side = i % 2 ? 1 : -1;
    leaves.push(
      `<ellipse cx="${along}" cy="${side * 15}" rx="21" ry="10" fill="${c.leaf}" opacity="${0.85 - i * 0.06}" transform="rotate(${side * 26} ${along} 0)"/>`
    );
  }
  return `<g transform="translate(${round(x)} ${round(y)}) rotate(${angle}) scale(${round(scale)})">
    <path d="M0 0 C 70 -18, 140 -14, 200 4" fill="none" stroke="${c.stem}" stroke-width="4" stroke-linecap="round"/>
    ${leaves.join('')}
  </g>`;
}

// Several SVGs share the page (the stage plus every gallery thumbnail), so any
// referenced id has to be unique across the whole document.
let idCounter = 0;

function decoration(decor, c, seed, S) {
  const rand = mulberry32(seed);
  const uid = (idCounter++).toString(36);
  const back = [];

  // Decoration geometry is authored against the 1400-unit card and scaled from there.
  const k = S.h / 1400;
  const W = S.w;
  const H = S.h;

  switch (decor) {
    case 'frame':
      back.push(
        `<rect x="${round(44 * k)}" y="${round(44 * k)}" width="${round(W - 88 * k)}" height="${round(H - 88 * k)}" fill="none" stroke="${c.accent}" stroke-width="${round(3 * k)}"/>`,
        `<rect x="${round(60 * k)}" y="${round(60 * k)}" width="${round(W - 120 * k)}" height="${round(H - 120 * k)}" fill="none" stroke="${c.accent}" stroke-width="${round(1 * k)}" opacity=".65"/>`
      );
      break;

    case 'arch': {
      const x = 70 * k, y = 70 * k, w = W - 140 * k, h = H - 140 * k, r = w / 2;
      const d = `M${round(x)} ${round(y + h)} L${round(x)} ${round(y + r)} A${round(r)} ${round(r)} 0 0 1 ${round(x + w)} ${round(y + r)} L${round(x + w)} ${round(y + h)} Z`;
      back.push(
        `<path d="${d}" fill="${c.soft}"/>`,
        `<path d="${d}" fill="none" stroke="${c.accent}" stroke-width="${round(2 * k)}" opacity=".7"/>`
      );
      break;
    }

    case 'confetti': {
      const inks = [c.accent, c.soft, c.accent, c.ink];
      const count = Math.round(120 * (W / 1000));
      for (let i = 0; i < count; i++) {
        const x = rand() * W;
        const y = rand() * H;
        // Keep the middle clear so the words stay readable.
        const inMargin = x < S.safe.x * 0.8 || x > W - S.safe.x * 0.8
          || y < S.safe.y * 1.6 || y > H - S.safe.y * 1.6;
        if (!inMargin) continue;
        const fill = inks[i % inks.length];
        const op = fill === c.ink ? 0.18 : 0.85;
        if (i % 3 === 0) {
          back.push(`<circle cx="${round(x)}" cy="${round(y)}" r="${round((4 + rand() * 6) * k)}" fill="${fill}" opacity="${op}"/>`);
        } else {
          const w = (8 + rand() * 8) * k, h = (16 + rand() * 18) * k;
          back.push(
            `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${round(3 * k)}" fill="${fill}" opacity="${op}" transform="rotate(${round(rand() * 360)} ${round(x)} ${round(y)})"/>`
          );
        }
      }
      break;
    }

    case 'bloom': {
      // Start the sprigs clear of the handle, or most of the leaves end up on the
      // part of the wrap nobody ever sees.
      const inset = Math.max(70 * k, S.handle + 30);
      back.push(
        sprig(inset, 190 * k, -14, k, { stem: c.accent, leaf: c.soft }),
        sprig(W - inset, 250 * k, 194, 0.8 * k, { stem: c.accent, leaf: c.soft }),
        sprig(W - inset, H - 190 * k, 166, k, { stem: c.accent, leaf: c.soft }),
        sprig(inset, H - 250 * k, 14, 0.8 * k, { stem: c.accent, leaf: c.soft })
      );
      break;
    }

    case 'stripes': {
      // The skew is applied to an inner group so the clip rect stays axis-aligned,
      // and the bars start off-canvas by the amount the skew drags them sideways.
      const band = (name, y, h) => {
        const id = `stripe-${uid}-${name}`;
        const drag = h * 0.35 + 60 * k;
        const bars = [];
        for (let x = -drag; x < W + drag; x += 46 * k) {
          bars.push(`<rect x="${round(x)}" y="${round(-20 * k)}" width="${round(18 * k)}" height="${round(h + 40 * k)}" fill="${c.accent}"/>`);
        }
        return `<clipPath id="${id}"><rect x="0" y="${round(y)}" width="${W}" height="${round(h)}"/></clipPath>
                <g clip-path="url(#${id})"><g transform="translate(0 ${round(y)}) skewX(-18)" opacity=".9">${bars.join('')}</g></g>`;
      };
      // A mug is short and wide, so a card-proportioned band would eat the text.
      const top = H * (S.kind === 'mug' ? 0.10 : 0.171);
      const bottom = H * (S.kind === 'mug' ? 0.075 : 0.114);
      back.push(
        `<rect x="0" y="0" width="${W}" height="${round(top)}" fill="${c.soft}"/>`,
        band('top', 0, top),
        `<rect x="0" y="${round(H - bottom)}" width="${W}" height="${round(bottom)}" fill="${c.soft}"/>`,
        band('bottom', H - bottom, bottom)
      );
      break;
    }

    case 'dots': {
      const step = 62 * k;
      for (let y = step * 1.3; y < H; y += step) {
        for (let x = step * 1.3; x < W; x += step) {
          const r = (Math.round(x / step) + Math.round(y / step)) % 2 ? 5 * k : 3 * k;
          back.push(`<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}" fill="${c.soft}"/>`);
        }
      }
      break;
    }

    case 'rays': {
      const cx = W / 2, cy = -120 * k, len = Math.max(W, H) * 2.2;
      for (let a = -78; a <= 78; a += 12) {
        const rad = (a * Math.PI) / 180;
        const spread = (5.5 * Math.PI) / 180;
        const p1 = [cx + Math.sin(rad - spread) * len, cy + Math.cos(rad - spread) * len];
        const p2 = [cx + Math.sin(rad + spread) * len, cy + Math.cos(rad + spread) * len];
        back.push(`<path d="M${round(cx)} ${round(cy)} L${round(p1[0])} ${round(p1[1])} L${round(p2[0])} ${round(p2[1])} Z" fill="${c.soft}" opacity=".8"/>`);
      }
      break;
    }

    default:
      break;
  }

  return back.join('\n    ');
}

/* ───────────────────────── value formatting ───────────────────────── */

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}.${String(m || 0).padStart(2, '0')} ${suffix}`;
}

/* ───────────────────────── layout ───────────────────────── */

function textBlock(text, style, opts = {}) {
  const lines = opts.lines || wrap(text, opts.width, style);
  const lineHeight = opts.lineHeight || 1.4;
  return {
    type: 'text',
    lines,
    style,
    lineHeight,
    gap: opts.gap || 0,
    height: lines.length * style.size * lineHeight,
    opacity: opts.opacity ?? 1,
  };
}

function ruleBlock(color, gap, width, weight) {
  return { type: 'rule', color, gap, width, weight, height: weight };
}

function buildBlocks(state, S) {
  const f = state.fields;
  const c = state.colors;
  const heading = fontStack(state.fonts.heading);
  const body = fontStack(state.fonts.body);
  const t = S.type;
  const column = S.w - S.safe.x * 2;
  const blocks = [];

  if (f.eyebrow?.trim()) {
    blocks.push(textBlock(f.eyebrow.trim().toUpperCase(),
      { size: 24 * t, family: body, weight: 600, spacing: 4.5 * t, fill: c.accent },
      { lineHeight: 1.4, width: column }));
  }

  if (f.headline?.trim()) {
    const style = { family: heading, weight: 400, fill: c.ink, spacing: 0 };
    const { size, lines } = fit(f.headline.trim(),
      { max: 104 * t, min: 40 * t, maxLines: S.kind === 'mug' ? 4 : 3, style, width: column });
    blocks.push(textBlock('', { ...style, size }, { lines, lineHeight: 1.14, gap: 26 * t }));
  }

  blocks.push(ruleBlock(c.accent, 34 * t, 110 * t, 2 * t));

  if (f.message?.trim()) {
    const size = (state.kind === 'invite' ? 25 : 27) * t;
    blocks.push(textBlock(f.message.trim(),
      { size, family: body, weight: 400, fill: c.ink },
      { lineHeight: 1.62, gap: 34 * t, opacity: 0.86, width: column - 40 * t }));
  }

  if (state.kind === 'invite') {
    const when = [formatDate(f.date), formatTime(f.time)].filter(Boolean);
    if (when.length) {
      blocks.push(textBlock(when.join('  •  ').toUpperCase(),
        { size: 25 * t, family: body, weight: 600, spacing: 3 * t, fill: c.ink },
        { lineHeight: 1.45, gap: 44 * t, width: column }));
    }

    if (f.venue?.trim()) {
      const style = { family: heading, weight: 400, fill: c.ink, spacing: 0 };
      const { size, lines } = fit(f.venue.trim(), { max: 44 * t, min: 26 * t, maxLines: 2, style, width: column });
      blocks.push(textBlock('', { ...style, size }, { lines, lineHeight: 1.25, gap: 22 * t }));
    }

    if (f.address?.trim()) {
      blocks.push(textBlock(f.address.trim(),
        { size: 22 * t, family: body, weight: 400, fill: c.ink },
        { lineHeight: 1.5, gap: 10 * t, opacity: 0.72, width: column - 80 * t }));
    }

    if (f.rsvp?.trim()) {
      blocks.push(ruleBlock(c.accent, 40 * t, 60 * t, 2 * t));
      blocks.push(textBlock(`RSVP  ${f.rsvp.trim()}`,
        { size: 21 * t, family: body, weight: 500, spacing: 1.2 * t, fill: c.ink },
        { lineHeight: 1.5, gap: 26 * t, opacity: 0.8, width: column - 60 * t }));
    }
  }

  if (f.signoff?.trim()) {
    blocks.push(textBlock(f.signoff.trim(),
      { size: 23 * t, family: body, weight: 400, italic: true, fill: c.ink },
      { lineHeight: 1.45, gap: 46 * t, opacity: 0.75, width: column }));
  }

  // A rule divides two things. With nothing below it — a bare quote on a mug, an
  // invitation with no RSVP — it is just a dash hanging off the bottom.
  while (blocks.length && blocks[blocks.length - 1].type === 'rule') blocks.pop();

  return blocks;
}

/* ───────────────────────── guides ───────────────────────── */

/**
 * Editor-only overlay: the safe box the text sits inside, and the strips a mug
 * handle covers. Drawn from the same numbers the layout uses, and never included
 * in an export.
 */
function guides(S) {
  const dash = Math.max(6, S.h / 90);
  const parts = [
    `<rect x="${S.safe.x}" y="${S.safe.y}" width="${S.w - S.safe.x * 2}" height="${S.h - S.safe.y * 2}"`
    + ` fill="none" stroke="#e5007d" stroke-width="${Math.max(1.5, S.h / 500)}" stroke-dasharray="${dash} ${dash}" opacity=".55"/>`,
  ];

  if (S.handle) {
    for (const x of [0, S.w - S.handle]) {
      parts.push(`<rect x="${x}" y="0" width="${S.handle}" height="${S.h}" fill="#e5007d" opacity=".1"/>`);
      parts.push(`<line x1="${x + (x ? 0 : S.handle)}" y1="0" x2="${x + (x ? 0 : S.handle)}" y2="${S.h}" stroke="#e5007d" stroke-width="${Math.max(1.5, S.h / 500)}" opacity=".45"/>`);
    }
  }

  return parts.join('\n    ');
}

/* ───────────────────────── public API ───────────────────────── */

/**
 * @param {object} state  the editor state
 * @param {object} [opts] `guides: true` adds the editor overlay — never for export
 * @returns {string} a complete, standalone SVG document
 */
export function renderSVG(state, opts = {}) {
  const S = surfaceById(state.surface);
  const c = state.colors;
  const blocks = buildBlocks(state, S);

  const total = blocks.reduce((sum, b) => sum + b.gap + b.height, 0);
  let y = Math.max(S.safe.y, (S.h - total) / 2);
  const cx = S.w / 2;

  const body = [];
  for (const block of blocks) {
    y += block.gap;

    if (block.type === 'rule') {
      const half = block.width / 2;
      body.push(`<line x1="${round(cx - half)}" y1="${round(y)}" x2="${round(cx + half)}" y2="${round(y)}" stroke="${block.color}" stroke-width="${round(block.weight)}"/>`);
      y += block.height;
      continue;
    }

    const { style, lineHeight } = block;
    // text-anchor="middle" counts the trailing letter-space, so nudge back by half.
    const anchorX = cx + (style.spacing || 0) / 2;
    const attrs = [
      `x="${round(anchorX)}"`,
      `text-anchor="middle"`,
      `font-family="${esc(style.family)}"`,
      `font-size="${round(style.size)}"`,
      `font-weight="${style.weight}"`,
      style.italic ? `font-style="italic"` : '',
      style.spacing ? `letter-spacing="${round(style.spacing)}"` : '',
      `fill="${style.fill}"`,
      block.opacity !== 1 ? `opacity="${block.opacity}"` : '',
    ].filter(Boolean).join(' ');

    block.lines.forEach((line, i) => {
      const baseline = y + style.size * lineHeight * i + style.size * 0.82;
      if (line) body.push(`<text ${attrs} y="${round(baseline)}">${esc(line)}</text>`);
    });

    y += block.height;
  }

  // A transparent background is what mug printing usually wants: on a sublimated
  // mug, unprinted areas are simply the ceramic showing through.
  const background = state.transparent
    ? ''
    : `<rect width="${S.w}" height="${S.h}" fill="${c.bg}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S.w}" height="${S.h}" viewBox="0 0 ${S.w} ${S.h}" role="img" aria-label="${esc(state.fields.headline || 'Design preview')}">
  ${background}
  <g>
    ${decoration(state.decor, c, hashOf(state.templateId + state.decor), S)}
  </g>
  <g>
    ${body.join('\n    ')}
  </g>
  ${opts.guides ? `<g data-guides="1">\n    ${guides(S)}\n  </g>` : ''}
</svg>`;
}

/** Tiny non-interactive preview used by the template gallery. */
export function renderThumb(state) {
  const S = surfaceById(state.surface);
  const c = state.colors;
  const heading = fontStack(state.fonts.heading);
  const ratio = 100 / S.w;
  const h = round(S.h * ratio);
  const mid = h / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${h}" aria-hidden="true">
    <rect width="100" height="${h}" fill="${c.bg}"/>
    <g transform="scale(${round(ratio)})">${decoration(state.decor, c, hashOf(state.templateId + state.decor), S)}</g>
    <text x="50" y="${round(mid - h * 0.02)}" text-anchor="middle" font-family="${esc(heading)}" font-size="${round(h * 0.11)}" fill="${c.ink}">Aa</text>
    <line x1="34" y1="${round(mid + h * 0.08)}" x2="66" y2="${round(mid + h * 0.08)}" stroke="${c.accent}" stroke-width="1.5"/>
    <rect x="30" y="${round(mid + h * 0.15)}" width="40" height="3" rx="1.5" fill="${c.ink}" opacity=".28"/>
    <rect x="36" y="${round(mid + h * 0.21)}" width="28" height="3" rx="1.5" fill="${c.ink}" opacity=".28"/>
  </svg>`;
}
