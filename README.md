# Cards &amp; Invites

A small browser app for designing greeting cards and party invitations, then
exporting them as a print-ready PNG, an SVG, or a PDF via the print dialog.

No build step, no framework, no dependencies at runtime — open `index.html`
through any static server and it works.

## What it does

- **Eight starting templates** — four cards (birthday, thank you, congratulations,
  seasonal) and four invitations (garden party, dinner, baby shower, wedding).
- **Edit the words** in a plain form. Invitations get date, time, venue, address
  and RSVP fields; cards get a message and a sign-off.
- **Change the look** — eight colour sets plus per-colour overrides, eight
  decorations (frame, arch, confetti, botanical, stripes, dots, sunburst, none)
  and nine font pairings.
- **Export** a print-ready PDF or a 2000 × 2800 px PNG — both 5 × 7 inches at
  400 dpi — plus the SVG source, or print straight from the browser.
- **Share a design as a link** — the whole design is encoded in the URL, so
  nothing is stored on a server. Invitations also get a prefilled email.
- Work in progress is kept in `localStorage`, so a reload does not lose it.

## Running it

Because the app uses ES modules, browsers will not load it from a `file://`
path. Serve the folder instead:

```sh
npm start                  # http-server on :8080, opens a browser
# or, without Node:
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Publishing it

The site is served straight from the repository by GitHub Pages — there is
nothing to build, so no workflow is involved. Under
**Settings → Pages → Build and deployment**, set *Source* to **Deploy from a
branch**, pick `main` and `/ (root)`, and press **Save**. Every push to `main`
then republishes the site at `https://<user>.github.io/canva/`.

The empty `.nojekyll` file at the root tells Pages to serve the files verbatim
instead of running them through Jekyll.

## Tests

```sh
npm install
npm test
```

The suite starts a static server and drives the real app in headless Chromium:
the renderer relies on canvas text measurement and on SVG → PNG rasterisation,
so a browser is the only place it can be checked honestly.

## How it is put together

| File | Responsibility |
| --- | --- |
| `index.html` | Page shell and the editor's static controls |
| `assets/styles.css` | App styling, dark mode, and the 5 × 7 inch print sheet |
| `src/templates.js` | Template catalogue, palettes, font stacks, field definitions |
| `src/render.js` | Draws the design as an SVG string — wrapping, fitting, decorations |
| `src/store.js` | `localStorage` persistence and the share-link encoding |
| `src/export.js` | PDF / PNG / SVG download and the `mailto:` builder |
| `src/app.js` | Wires the DOM to the state and redraws on every change |

The card is rendered as **one SVG document**, and the preview, the print sheet
and the PNG export all come from that same string. Anything you see on screen is
what lands in the exported file.

### Adding a template

Append an entry to `TEMPLATES` in `src/templates.js`:

```js
{
  id: 'housewarming',            // unique; also seeds the decoration layout
  name: 'Housewarming',          // shown under the gallery thumbnail
  kind: 'invite',                // 'invite' adds date/time/venue/RSVP fields
  palette: 'plum',               // an id from PALETTES
  decor: 'dots',                 // an id from DECORS
  fonts: { heading: 'didot', body: 'optima' },
  fields: { eyebrow: '…', headline: '…', message: '…', date: '2026-12-01', /* … */ },
}
```

The gallery, the form and the thumbnail all follow from that — no other file
needs touching.

### A note on the PDF

`src/export.js` writes the PDF by hand — object table, cross-reference table
and all — rather than pulling in a PDF library, which keeps the app
dependency-free. It is one page, 360 × 504 pt (5 × 7 inches), holding a single
full-bleed image at 2000 × 2800 px, so the effective resolution is 400 dpi.

The pixels go in losslessly: raw RGB compressed with `CompressionStream('deflate')`,
which produces exactly the zlib stream a PDF `/FlateDecode` filter expects. A
typical card lands around 150 KB. On browsers without `CompressionStream` the
image is embedded uncompressed instead — the file still opens, it is just large.

### A note on fonts

Every font stack is one the operating system already has. Web fonts loaded from
a stylesheet do not survive the SVG → canvas step used for PNG export, so they
would look right on screen and wrong in the downloaded file. If you add a font,
either keep to system families or inline it into the SVG as a base64 `@font-face`.

## Licence

MIT — see [LICENSE](LICENSE).
