// Renders the editor state into a standalone SVG string.
//
// The card is drawn as SVG rather than HTML so that the preview, the print
// output and the PNG export are all produced from exactly the same code path.

import { fontStack } from './templates.js';

export const CARD_W = 1000;
export const CARD_H = 1400;

const MARGIN = 96;
const CONTENT_W = CARD_W - MARGIN * 2;

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
function fit(text, { max, min, maxLines, style, width = CONTENT_W }) {
  let lines = [text];
  let size = min;
  for (size = max; size >= min; size -= 2) {
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
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">
    <path d="M0 0 C 70 -18, 140 -14, 200 4" fill="none" stroke="${c.stem}" stroke-width="4" stroke-linecap="round"/>
    ${leaves.join('')}
  </g>`;
}

// Several SVGs share the page (the stage plus every gallery thumbnail), so any
// referenced id has to be unique across the whole document.
let idCounter = 0;

function decoration(decor, c, seed) {
  const rand = mulberry32(seed);
  const uid = (idCounter++).toString(36);
  const back = [];

  switch (decor) {
    case 'frame':
      back.push(
        `<rect x="44" y="44" width="${CARD_W - 88}" height="${CARD_H - 88}" fill="none" stroke="${c.accent}" stroke-width="3"/>`,
        `<rect x="60" y="60" width="${CARD_W - 120}" height="${CARD_H - 120}" fill="none" stroke="${c.accent}" stroke-width="1" opacity=".65"/>`
      );
      break;

    case 'arch': {
      const x = 70, y = 70, w = CARD_W - 140, h = CARD_H - 140, r = w / 2;
      const d = `M${x} ${y + h} L${x} ${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} L${x + w} ${y + h} Z`;
      back.push(
        `<path d="${d}" fill="${c.soft}"/>`,
        `<path d="${d}" fill="none" stroke="${c.accent}" stroke-width="2" opacity=".7"/>`
      );
      break;
    }

    case 'confetti': {
      const inks = [c.accent, c.soft, c.accent, c.ink];
      for (let i = 0; i < 120; i++) {
        const x = rand() * CARD_W;
        const y = rand() * CARD_H;
        // Keep the middle of the card clear so the words stay readable.
        const inMargin = x < 190 || x > CARD_W - 190 || y < 300 || y > CARD_H - 280;
        if (!inMargin) continue;
        const fill = inks[i % inks.length];
        const op = fill === c.ink ? 0.18 : 0.85;
        if (i % 3 === 0) {
          back.push(`<circle cx="${round(x)}" cy="${round(y)}" r="${round(4 + rand() * 6)}" fill="${fill}" opacity="${op}"/>`);
        } else {
          const w = 8 + rand() * 8, h = 16 + rand() * 18;
          back.push(
            `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="3" fill="${fill}" opacity="${op}" transform="rotate(${round(rand() * 360)} ${round(x)} ${round(y)})"/>`
          );
        }
      }
      break;
    }

    case 'bloom':
      back.push(
        sprig(70, 190, -14, 1, { stem: c.accent, leaf: c.soft }),
        sprig(CARD_W - 70, 250, 194, 0.8, { stem: c.accent, leaf: c.soft }),
        sprig(CARD_W - 70, CARD_H - 190, 166, 1, { stem: c.accent, leaf: c.soft }),
        sprig(70, CARD_H - 250, 14, 0.8, { stem: c.accent, leaf: c.soft })
      );
      break;

    case 'stripes': {
      // The skew is applied to an inner group so the clip rect stays axis-aligned,
      // and the bars start off-canvas by the amount the skew drags them sideways.
      const band = (name, y, h) => {
        const id = `stripe-${uid}-${name}`;
        const drag = h * 0.35 + 60;
        const bars = [];
        for (let x = -drag; x < CARD_W + drag; x += 46) {
          bars.push(`<rect x="${round(x)}" y="-20" width="18" height="${h + 40}" fill="${c.accent}"/>`);
        }
        return `<clipPath id="${id}"><rect x="0" y="${y}" width="${CARD_W}" height="${h}"/></clipPath>
                <g clip-path="url(#${id})"><g transform="translate(0 ${y}) skewX(-18)" opacity=".9">${bars.join('')}</g></g>`;
      };
      back.push(
        `<rect x="0" y="0" width="${CARD_W}" height="240" fill="${c.soft}"/>`,
        band('top', 0, 240),
        `<rect x="0" y="${CARD_H - 160}" width="${CARD_W}" height="160" fill="${c.soft}"/>`,
        band('bottom', CARD_H - 160, 160)
      );
      break;
    }

    case 'dots':
      for (let y = 80; y < CARD_H; y += 62) {
        for (let x = 80; x < CARD_W; x += 62) {
          const r = (x / 62 + y / 62) % 2 ? 5 : 3;
          back.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c.soft}"/>`);
        }
      }
      break;

    case 'rays': {
      const cx = CARD_W / 2, cy = -120, len = 2200;
      for (let a = -78; a <= 78; a += 12) {
        const rad = (a * Math.PI) / 180;
        const spread = (5.5 * Math.PI) / 180;
        const p1 = [cx + Math.sin(rad - spread) * len, cy + Math.cos(rad - spread) * len];
        const p2 = [cx + Math.sin(rad + spread) * len, cy + Math.cos(rad + spread) * len];
        back.push(`<path d="M${cx} ${cy} L${round(p1[0])} ${round(p1[1])} L${round(p2[0])} ${round(p2[1])} Z" fill="${c.soft}" opacity=".8"/>`);
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
  const lines = opts.lines || wrap(text, opts.width || CONTENT_W, style);
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

function ruleBlock(color, gap, width = 110) {
  return { type: 'rule', color, gap, width, height: 2 };
}

function buildBlocks(state) {
  const f = state.fields;
  const c = state.colors;
  const heading = fontStack(state.fonts.heading);
  const body = fontStack(state.fonts.body);
  const blocks = [];

  if (f.eyebrow?.trim()) {
    blocks.push(textBlock(f.eyebrow.trim().toUpperCase(),
      { size: 24, family: body, weight: 600, spacing: 4.5, fill: c.accent },
      { lineHeight: 1.4 }));
  }

  if (f.headline?.trim()) {
    const style = { family: heading, weight: 400, fill: c.ink, spacing: 0 };
    const { size, lines } = fit(f.headline.trim(), { max: 104, min: 40, maxLines: 3, style });
    blocks.push(textBlock('', { ...style, size }, { lines, lineHeight: 1.14, gap: 26 }));
  }

  blocks.push(ruleBlock(c.accent, 34));

  if (f.message?.trim()) {
    const size = state.kind === 'invite' ? 25 : 27;
    blocks.push(textBlock(f.message.trim(),
      { size, family: body, weight: 400, fill: c.ink },
      { lineHeight: 1.62, gap: 34, opacity: 0.86, width: CONTENT_W - 40 }));
  }

  if (state.kind === 'invite') {
    const when = [formatDate(f.date), formatTime(f.time)].filter(Boolean);
    if (when.length) {
      blocks.push(textBlock(when.join('  •  ').toUpperCase(),
        { size: 25, family: body, weight: 600, spacing: 3, fill: c.ink },
        { lineHeight: 1.45, gap: 44 }));
    }

    if (f.venue?.trim()) {
      const style = { family: heading, weight: 400, fill: c.ink, spacing: 0 };
      const { size, lines } = fit(f.venue.trim(), { max: 44, min: 26, maxLines: 2, style });
      blocks.push(textBlock('', { ...style, size }, { lines, lineHeight: 1.25, gap: 22 }));
    }

    if (f.address?.trim()) {
      blocks.push(textBlock(f.address.trim(),
        { size: 22, family: body, weight: 400, fill: c.ink },
        { lineHeight: 1.5, gap: 10, opacity: 0.72, width: CONTENT_W - 80 }));
    }

    if (f.rsvp?.trim()) {
      blocks.push(ruleBlock(c.accent, 40, 60));
      blocks.push(textBlock(`RSVP  ${f.rsvp.trim()}`,
        { size: 21, family: body, weight: 500, spacing: 1.2, fill: c.ink },
        { lineHeight: 1.5, gap: 26, opacity: 0.8, width: CONTENT_W - 60 }));
    }
  }

  if (f.signoff?.trim()) {
    blocks.push(textBlock(f.signoff.trim(),
      { size: 23, family: body, weight: 400, italic: true, fill: c.ink },
      { lineHeight: 1.45, gap: 46, opacity: 0.75 }));
  }

  return blocks;
}

/* ───────────────────────── public API ───────────────────────── */

/** @returns {string} a complete, standalone SVG document. */
export function renderSVG(state) {
  const c = state.colors;
  const blocks = buildBlocks(state);

  const total = blocks.reduce((sum, b) => sum + b.gap + b.height, 0);
  let y = Math.max(MARGIN + 40, (CARD_H - total) / 2);
  const cx = CARD_W / 2;

  const body = [];
  for (const block of blocks) {
    y += block.gap;

    if (block.type === 'rule') {
      const half = block.width / 2;
      body.push(`<line x1="${cx - half}" y1="${round(y)}" x2="${cx + half}" y2="${round(y)}" stroke="${block.color}" stroke-width="2"/>`);
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
      `font-size="${style.size}"`,
      `font-weight="${style.weight}"`,
      style.italic ? `font-style="italic"` : '',
      style.spacing ? `letter-spacing="${style.spacing}"` : '',
      `fill="${style.fill}"`,
      block.opacity !== 1 ? `opacity="${block.opacity}"` : '',
    ].filter(Boolean).join(' ');

    block.lines.forEach((line, i) => {
      const baseline = y + style.size * lineHeight * i + style.size * 0.82;
      if (line) body.push(`<text ${attrs} y="${round(baseline)}">${esc(line)}</text>`);
    });

    y += block.height;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" role="img" aria-label="${esc(state.fields.headline || 'Card preview')}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${c.bg}"/>
  <g>
    ${decoration(state.decor, c, hashOf(state.templateId + state.decor))}
  </g>
  <g>
    ${body.join('\n    ')}
  </g>
</svg>`;
}

/** Tiny non-interactive preview used by the template gallery. */
export function renderThumb(state) {
  const c = state.colors;
  const heading = fontStack(state.fonts.heading);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
    <rect width="100" height="140" fill="${c.bg}"/>
    <g transform="scale(0.1)">${decoration(state.decor, c, hashOf(state.templateId + state.decor))}</g>
    <text x="50" y="66" text-anchor="middle" font-family="${esc(heading)}" font-size="15" fill="${c.ink}">Aa</text>
    <line x1="34" y1="80" x2="66" y2="80" stroke="${c.accent}" stroke-width="1.5"/>
    <rect x="30" y="90" width="40" height="3" rx="1.5" fill="${c.ink}" opacity=".28"/>
    <rect x="36" y="98" width="28" height="3" rx="1.5" fill="${c.ink}" opacity=".28"/>
  </svg>`;
}
