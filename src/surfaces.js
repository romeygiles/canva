// The physical things a design can end up on.
//
// `w` and `h` are the artboard's own coordinate system; `out` is the pixel size
// of the exported PNG. Print surfaces draw at 1000 units and export at 2x, while
// mug surfaces work at 1:1 so the export lands exactly on the print template.
//
// `safe` is the box the text is laid out inside. For mugs it already excludes
// the handle, so nothing can be typed into a region the handle will hide.
//
// `type` scales every font size, because a quote on a mug wants far heavier type
// than the same words on a greeting card.
//
// MUG DIMENSIONS ARE NOT UNIVERSAL. Printify sizes vary by print provider, so
// download the template for the provider you actually picked and check these
// against it. Changing a number here is the only edit needed.

export const SURFACES = [
  {
    id: 'card',
    name: 'Card 5 × 7 in',
    kind: 'print',
    w: 1000, h: 1400,
    out: { w: 2000, h: 2800 },
    safe: { x: 96, y: 96 },
    handle: 0,
    type: 1,
    dpi: 400,
    note: '5 × 7 inches',
  },
  {
    id: 'mug11',
    name: 'Mug 11 oz',
    kind: 'mug',
    w: 2475, h: 1155,
    out: { w: 2475, h: 1155 },
    safe: { x: 330, y: 120 },
    handle: 170,
    type: 1.9,
    dpi: 300,
    note: '11 oz wrap',
  },
  {
    id: 'mug15',
    name: 'Mug 15 oz',
    kind: 'mug',
    w: 2775, h: 1320,
    out: { w: 2775, h: 1320 },
    safe: { x: 360, y: 135 },
    handle: 190,
    type: 2.1,
    dpi: 300,
    note: '15 oz wrap',
  },
];

export const surfaceById = id => SURFACES.find(s => s.id === id) || SURFACES[0];

/** The sizes a given design can be exported at — mugs come in two. */
export const sizesFor = kind => SURFACES.filter(s => s.kind === kind);
