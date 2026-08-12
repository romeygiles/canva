# Cards, Invites &amp; Mugs

A small browser app for designing greeting cards, party invitations and mug
wraps, then exporting them ready for printing or for a print-on-demand service.

No build step, no framework, no dependencies at runtime — open `index.html`
through any static server and it works.

## What it does

- **Fourteen starting templates** — four cards (birthday, thank you,
  congratulations, seasonal), four invitations (garden party, dinner, baby
  shower, wedding) and six mug styles.
- **A quote library** of two dozen lines, grouped by theme, that can be dropped
  onto any mug style in one click.
- **Edit the words** in a plain form. Invitations get date, time, venue, address
  and RSVP fields; cards get a message and a sign-off; mugs get a quote and an
  attribution.
- **Change the look** — eight colour sets plus per-colour overrides, eight
  decorations (frame, arch, confetti, botanical, stripes, dots, sunburst, none)
  and nine font pairings.
- **Export** a print-ready PDF or a 2000 × 2800 px PNG for cards — both 5 × 7
  inches at 400 dpi — or a mug wrap PNG sized to the print template, plus the
  SVG source in every case.
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
then republishes the site at `https://<user>.github.io/<repo>/`.

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
| `src/quotes.js` | The quote library, grouped by theme |
| `src/surfaces.js` | Artboard sizes, safe areas and mug handle zones |
| `src/render.js` | Draws the design as an SVG string — wrapping, fitting, decorations |
| `src/store.js` | `localStorage` persistence and the share-link encoding |
| `src/export.js` | PDF / PNG / SVG download and the `mailto:` builder |
| `src/app.js` | Wires the DOM to the state and redraws on every change |

The design is rendered as **one SVG document**, and the preview, the print sheet
and the PNG export all come from that same string. Anything you see on screen is
what lands in the exported file.

### Adding a template

Append an entry to `TEMPLATES` in `src/templates.js`:

```js
{
  id: 'housewarming',            // unique; also seeds the decoration layout
  name: 'Housewarming',          // shown under the gallery thumbnail
  kind: 'invite',                // 'invite' adds date/time/venue/RSVP; 'mug' switches artboard
  palette: 'plum',               // an id from PALETTES
  decor: 'dots',                 // an id from DECORS
  fonts: { heading: 'didot', body: 'optima' },
  fields: { eyebrow: '…', headline: '…', message: '…', date: '2026-12-01', /* … */ },
}
```

The gallery, the form and the thumbnail all follow from that — no other file
needs touching.

## Styles and quotes are separate

A mug template is a **look** — palette, fonts, decoration. A quote is **words**.
They live apart on purpose, in `src/templates.js` and `src/quotes.js`, and any
quote can be dropped onto any style. Six styles and twenty-four lines is already
144 designs without writing anything new.

To add lines, append to a group in `src/quotes.js`:

```js
{ headline: 'The main line' },
{ eyebrow: 'Small line above', headline: 'The main line' },
{ headline: 'The setup', message: 'the punchline underneath' },
```

Anything a quote leaves out is cleared when it is applied, so a one-liner never
strands the previous quote's punchline underneath it.

## Mugs and print-on-demand

Mug designs are laid out on a flat wrap — the rectangle that gets printed and
then curved around the mug.

**Check the dimensions before you sell anything.** The sizes in
`src/surfaces.js` are the common Printify figures, but the real numbers vary by
print provider. Download the template for the provider you actually picked and
compare. If it differs, change the numbers in that one file; nothing else needs
touching.

Three things the editor does for you:

- **Handle guides.** The shaded strips at each end mark the part of the wrap the
  handle covers. Text is laid out inside a safe box that already excludes them,
  so you cannot accidentally type into a region nobody will see.
- **A dashed safe box** showing where the text is allowed to sit.
- **Transparent background.** Most mug printing is sublimation, where white is
  simply *no ink* — unprinted areas show the bare ceramic. Tick the box and the
  background is dropped from the export. The chequerboard behind the preview is
  the editor telling you the area is transparent.

Guides are an editing aid and are **never** included in an export — there is a
test that fails if a guide ever reaches an exported file.

What this does **not** do yet is bleed. The exports are exactly the print-area
size with no overhang, which is right for digital printables and for print
providers that expect a flat template, but not for a commercial printer that
trims physical cards.

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
