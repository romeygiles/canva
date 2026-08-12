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
await check('every template has a thumbnail', () => page.locator('.tpl svg').count().then(n => n === 8));
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

await check('nothing logged an error', () => consoleErrors.length === 0);
if (consoleErrors.length) console.log(consoleErrors.map(e => `       ${e}`).join('\n'));

await browser.close();
server.close();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
