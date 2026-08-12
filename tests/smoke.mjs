// End-to-end smoke test. Serves the project on a throwaway port and drives it
// with a real browser, because the renderer depends on canvas text measurement
// and on SVG -> PNG rasterisation, neither of which exist outside a browser.
//
//   npm install && npm test

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(req.url.split('?')[0]));
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      const ext = file.slice(file.lastIndexOf('.'));
      res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/* ── the tests ── */

let passed = 0;
let failed = 0;

async function check(label, fn) {
  let ok = false;
  let detail = '';
  try {
    ok = Boolean(await fn());
  } catch (error) {
    detail = ` (${error.message.split('\n')[0]})`;
  }
  if (ok) { passed++; console.log(`  ok   ${label}`); }
  else { failed++; console.log(`  FAIL ${label}${detail}`); }
}

const { server, port } = await serve();
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));

await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));

console.log('\ncards & invites — smoke test\n');

await check('the preview renders text', () => page.locator('#stage svg text').count().then(n => n > 3));
await check('every template has a thumbnail', () => page.locator('.tpl svg').count().then(n => n === 12));
await check('a card template hides the event fields', () => page.locator('[data-field="date"]').count().then(n => n === 0));

await page.click('[data-template="wedding-elegant"]');
await check('an invite template shows the event fields', () => page.locator('[data-field="date"]').count().then(n => n === 1));
await check('the date is written out in full', () =>
  page.locator('#stage svg').innerHTML().then(h => /12 JUNE 2027/i.test(h)));
await check('invites offer the email button', () => page.locator('#btn-mail').isVisible());

await page.fill('[data-field="headline"]', 'Isla & Callum — "at last"');
await check('markup characters are escaped', () =>
  page.locator('#stage svg').innerHTML().then(h => h.includes('&amp;') && h.includes('&quot;')));

await page.fill('[data-field="headline"]', 'A really quite extraordinarily long headline for testing');
await check('long headlines shrink to fit the width', async () => {
  const boxes = await page.locator('#stage svg text').evaluateAll(nodes =>
    nodes.map(n => n.getBBox()).map(b => ({ left: b.x, right: b.x + b.width })));
  return boxes.length > 0 && boxes.every(b => b.left >= -1 && b.right <= 1001);
});
await check('the text column stays on the artboard', async () => {
  const boxes = await page.locator('#stage svg text').evaluateAll(nodes =>
    nodes.map(n => n.getBBox()).map(b => ({ top: b.y, bottom: b.y + b.height })));
  return boxes.every(b => b.top >= 0 && b.bottom <= 1400);
});

await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
await page.click('[data-palette="midnight"]');
await check('a palette repaints the card', () =>
  page.locator('#stage svg rect').first().getAttribute('fill').then(v => v === '#1d2333'));

await check('every decoration renders without error', async () => {
  const decors = await page.locator('#decor option').evaluateAll(o => o.map(x => x.value));
  for (const decor of decors) {
    await page.selectOption('#decor', decor);
    const count = await page.locator('#stage svg text').count();
    if (count < 3) return false;
  }
  return decors.length === 8;
});

await check('clip ids are unique across every svg on the page', () => page.evaluate(() => {
  const ids = [...document.querySelectorAll('svg [id]')].map(n => n.id);
  return ids.length === new Set(ids).size;
}));

await page.click('#btn-share');
const shared = await page.evaluate(() => location.href);
await check('sharing writes the design into the url', () => shared.includes('#d='));
const restored = await browser.newPage();
await restored.goto(shared, { waitUntil: 'networkidle' });
await check('a shared url restores the wording', () =>
  restored.inputValue('[data-field="headline"]')
    .then(v => v === 'A really quite extraordinarily long headline for testing'));
await restored.close();

await check('the design rasterises to a png', () => page.evaluate(async () => {
  const { renderSVG } = await import('./src/render.js');
  const { stateFromTemplate } = await import('./src/templates.js');
  const svg = renderSVG(stateFromTemplate('wedding-elegant'));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 560;
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').length > 5000;
}));

// The PDF is assembled by hand, so the byte offsets in its cross-reference
// table are the part most likely to be wrong — and a wrong table still opens in
// forgiving viewers while failing in strict ones. Check it properly.
const pdf = await page.evaluate(async () => {
  const { renderSVG } = await import('./src/render.js');
  const { stateFromTemplate } = await import('./src/templates.js');
  const { downloadPDF } = await import('./src/export.js');

  // Intercept the blob on its way to the download link rather than writing a file.
  const captured = [];
  const realCreate = URL.createObjectURL;
  URL.createObjectURL = blob => { captured.push(blob); return realCreate.call(URL, blob); };
  try {
    await downloadPDF(renderSVG(stateFromTemplate('wedding-elegant')), 'test',
      { w: 2000, h: 2800 }, { w: 360, h: 504 });
  } finally {
    URL.createObjectURL = realCreate;
  }

  const blob = captured[0];
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const latin1 = new TextDecoder('latin1').decode(bytes);

  // Every offset in the table must land exactly on its own "N 0 obj" header.
  // Anchored on the newline, because "startxref" also ends in "xref".
  const table = latin1.slice(latin1.lastIndexOf('\nxref\n'));
  const rows = [...table.matchAll(/^(\d{10}) (\d{5}) n $/gm)].map(m => Number(m[1]));
  const offsetsLandOnObjects = rows.length === 6
    && rows.every((offset, i) => latin1.startsWith(`${i + 1} 0 obj`, offset));

  const startxref = Number(latin1.match(/startxref\n(\d+)\n%%EOF/)?.[1]);

  return {
    type: blob.type,
    size: bytes.length,
    header: latin1.slice(0, 9),
    endsCleanly: latin1.trimEnd().endsWith('%%EOF'),
    offsetsLandOnObjects,
    startxrefLandsOnTable: latin1.startsWith('xref', startxref),
    dict: latin1.slice(0, 1024),
  };
});

await check('the pdf is a real pdf', () => pdf.header === '%PDF-1.4\n' && pdf.type === 'application/pdf');
await check('the pdf ends with %%EOF', () => pdf.endsCleanly);
await check('every xref offset lands on its object', () => pdf.offsetsLandOnObjects);
await check('startxref points at the xref table', () => pdf.startxrefLandsOnTable);
await check('the page is 5x7 inches', () => pdf.dict.includes('/MediaBox [0 0 360 504]'));
await check('the image is full resolution rgb', () =>
  pdf.dict.includes('/Width 2000') && pdf.dict.includes('/Height 2800') && pdf.dict.includes('/DeviceRGB'));
await check('the image is losslessly compressed', () => pdf.dict.includes('/FlateDecode'));
await check('compression actually shrank the pixels', () => pdf.size < 2000 * 2800 * 3 * 0.5);

/* ── mugs ── */

await page.click('[data-template="mug-first-coffee"]');
await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));

await check('a mug uses the wide artboard', () =>
  page.locator('#stage svg').getAttribute('viewBox').then(v => v === '0 0 2475 1155'));
// innerText reports the rendered text, and the labels are uppercased in CSS.
await check('the mug quote field is labelled as a quote', () =>
  page.locator('#fields .field span').allInnerTexts()
    .then(t => t.some(s => s.toLowerCase() === 'quote')));
await check('the product panel appears for mugs', () => page.locator('#group-product').isVisible());
await check('mugs offer both sizes', () => page.locator('#surface option').count().then(n => n === 2));
await check('mugs hide the pdf and print buttons', async () =>
  !(await page.locator('#btn-pdf').isVisible()) && !(await page.locator('#btn-print').isVisible()));
await check('the arch decoration is withheld from mugs', () =>
  page.locator('#decor option').evaluateAll(o => !o.some(x => x.value === 'arch')));

await check('switching to 15 oz resizes the artboard', async () => {
  await page.selectOption('#surface', 'mug15');
  const box = await page.locator('#stage svg').getAttribute('viewBox');
  await page.selectOption('#surface', 'mug11');
  return box === '0 0 2775 1320';
});

await check('guides are drawn in the editor', () => page.locator('#stage svg [data-guides]').count().then(n => n === 1));

// The single most costly bug this app could ship: a pink guide printed onto a mug.
await check('guides never reach an export', () => page.evaluate(async () => {
  const { renderSVG } = await import('./src/render.js');
  const { stateFromTemplate } = await import('./src/templates.js');
  const design = stateFromTemplate('mug-first-coffee');
  return !renderSVG(design).includes('data-guides')
    && !renderSVG(design).includes('e5007d')
    && renderSVG(design, { guides: true }).includes('data-guides');
}));

await check('text keeps clear of the handle zone', async () => {
  const boxes = await page.locator('#stage svg text').evaluateAll(nodes =>
    nodes.map(n => n.getBBox()).map(b => ({ left: b.x, right: b.x + b.width })));
  // safe.x for an 11 oz mug is 330, which already excludes the 170px handle strip.
  return boxes.length > 0 && boxes.every(b => b.left >= 330 && b.right <= 2475 - 330);
});

await check('a transparent mug drops the background', async () => {
  await page.check('#transparent');
  const html = await page.locator('#stage svg').innerHTML();
  const opaque = await page.uncheck('#transparent').then(() => page.locator('#stage svg').innerHTML());
  return !/<rect width="2475" height="1155"/.test(html) && /<rect width="2475" height="1155"/.test(opaque);
});

await check('a mug exports at the print template size', () => page.evaluate(async () => {
  const { renderSVG } = await import('./src/render.js');
  const { stateFromTemplate } = await import('./src/templates.js');
  const { surfaceById } = await import('./src/surfaces.js');
  const S = surfaceById('mug11');
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(stateFromTemplate('mug-first-coffee')))}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = S.out.w;
  canvas.height = S.out.h;
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.width === 2475 && canvas.height === 1155 && canvas.toDataURL('image/png').length > 5000;
}));

await check('cards still use the portrait artboard', async () => {
  await page.click('[data-template="birthday-confetti"]');
  const box = await page.locator('#stage svg').getAttribute('viewBox');
  return box === '0 0 1000 1400';
});
await check('the pdf button returns for cards', () => page.locator('#btn-pdf').isVisible());
await check('cards do not offer the invite email button', () =>
  page.locator('#btn-mail').isVisible().then(v => v === false));

await check('nothing logged an error', () => consoleErrors.length === 0);
if (consoleErrors.length) console.log(consoleErrors.map(e => `       ${e}`).join('\n'));

await browser.close();
server.close();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
