// Turning the rendered SVG into files the user can keep.

// Export sizes come from the surface (see src/surfaces.js) so a card exports at
// 2x its artboard while a mug exports 1:1 onto the print template's pixel grid.

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

/** Draw the SVG onto a canvas at export resolution. */
async function rasterise(svg, out) {
  const canvas = document.createElement('canvas');
  canvas.width = out.w;
  canvas.height = out.h;

  const image = new Image();
  // A data URL keeps the canvas untainted, so toBlob() and getImageData() are allowed.
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('The design could not be rasterised.'));
  });

  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function downloadPNG(svg, name, out) {
  const canvas = await rasterise(svg, out);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The PNG could not be created.');
  download(blob, `${name}.png`);
}

export async function downloadPDF(svg, name, out, page) {
  const canvas = await rasterise(svg, out);
  download(new Blob([await buildPDF(canvas, name, page)], { type: 'application/pdf' }), `${name}.pdf`);
}

/* ───────────────────────── pdf ─────────────────────────
 *
 * A single-page PDF holding one full-bleed image, written by hand so the app
 * stays dependency-free. The page is measured in points (72 to the inch) and the
 * image is the full-resolution raster, so a 5 x 7 page carrying 2000 x 2800
 * pixels comes out at 400 dpi.
 *
 * The pixels go in losslessly: raw RGB compressed with zlib via CompressionStream,
 * which is exactly what a /FlateDecode stream expects.
 */

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** PDF text strings are Latin-1; drop anything else rather than mangle it. */
function pdfString(text) {
  return String(text).replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, '\\$&');
}

async function buildPDF(canvas, title, page) {
  const PAGE_W = page.w;
  const PAGE_H = page.h;
  const { width, height } = canvas;
  const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data;

  // The artboard always paints an opaque background, so alpha can be dropped.
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4) {
    rgb[j++] = rgba[i];
    rgb[j++] = rgba[i + 1];
    rgb[j++] = rgba[i + 2];
  }

  const compressed = await deflate(rgb);
  const pixels = compressed || rgb;
  const filter = compressed ? ' /Filter /FlateDecode' : '';

  const encoder = new TextEncoder();
  const chunks = [];
  let cursor = 0;

  const push = part => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    cursor += bytes.length;
  };

  const offsets = [];
  const object = (n, dict, stream) => {
    offsets[n] = cursor;
    push(`${n} 0 obj\n${dict}\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // marks the file as binary

  const content = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`;

  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}]`
    + ' /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
  object(4, `<< /Length ${encoder.encode(content).length} >>`, content);
  object(5, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height}`
    + ` /ColorSpace /DeviceRGB /BitsPerComponent 8${filter} /Length ${pixels.length} >>`, pixels);
  object(6, `<< /Title (${pdfString(title)}) /Producer (Cards and Invites) >>`);

  const startxref = cursor;
  const entry = (offset, gen, kind) =>
    `${String(offset).padStart(10, '0')} ${String(gen).padStart(5, '0')} ${kind} \n`;

  let xref = `xref\n0 7\n${entry(0, 65535, 'f')}`;
  for (let n = 1; n <= 6; n++) xref += entry(offsets[n], 0, 'n');
  push(xref);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${startxref}\n%%EOF\n`);

  const pdf = new Uint8Array(cursor);
  let at = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, at);
    at += chunk.length;
  }
  return pdf;
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
