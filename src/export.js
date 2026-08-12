// Turning the rendered SVG into files the user can keep.

import { CARD_W, CARD_H } from './render.js';

/** 300 dpi at 5×7 inches = 1500×2100; we go a touch higher at 2× the artboard. */
const SCALE = 2;

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next frame so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text, fallback = 'card') {
  const slug = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

export function downloadSVG(svg, name) {
  download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`);
}

export async function downloadPNG(svg, name) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * SCALE;
  canvas.height = CARD_H * SCALE;

  const ctx = canvas.getContext('2d');
  const image = new Image();
  // A data URL keeps the canvas untainted, so toBlob() is allowed.
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('The design could not be rasterised.'));
  });

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The PNG could not be created.');
  download(blob, `${name}.png`);
}

/** A prefilled email for invites, so the link can go out without leaving the page. */
export function mailtoLink(state, link) {
  const f = state.fields;
  const subject = f.headline?.trim() || 'An invitation';
  const lines = [
    f.eyebrow?.trim(),
    f.headline?.trim(),
    '',
    f.message?.trim(),
    '',
    [f.date, f.time].filter(Boolean).length ? `When: ${[f.date, f.time].filter(Boolean).join(' at ')}` : '',
    f.venue?.trim() ? `Where: ${[f.venue, f.address].filter(Boolean).join(', ')}` : '',
    f.rsvp?.trim() ? `RSVP: ${f.rsvp.trim()}` : '',
    '',
    `View the invitation: ${link}`,
  ].filter(part => part !== undefined && part !== null);

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
