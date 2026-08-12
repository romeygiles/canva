// Template catalogue, palettes and font stacks.
//
// Every font stack below is web-safe on purpose: the card is rendered as an SVG
// and then rasterised through a <canvas> for PNG export. Web fonts loaded from a
// stylesheet do not survive that trip, so we stick to families the OS already has.

export const FONTS = [
  { id: 'georgia',  name: 'Georgia',    stack: 'Georgia, "Times New Roman", serif' },
  { id: 'palatino', name: 'Palatino',   stack: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif' },
  { id: 'baskerville', name: 'Baskerville', stack: '"Baskerville", "Libre Baskerville", Georgia, serif' },
  { id: 'didot',    name: 'Didot',      stack: 'Didot, "Bodoni MT", "Playfair Display", Georgia, serif' },
  { id: 'helvetica', name: 'Helvetica', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'futura',   name: 'Futura',     stack: 'Futura, "Century Gothic", "Avenir Next", "Trebuchet MS", sans-serif' },
  { id: 'optima',   name: 'Optima',     stack: 'Optima, Candara, "Gill Sans", "Segoe UI", sans-serif' },
  { id: 'courier',  name: 'Typewriter', stack: '"Courier New", Courier, monospace' },
  { id: 'script',   name: 'Script',     stack: '"Snell Roundhand", "Segoe Script", "Brush Script MT", cursive' },
];

export const DECORS = [
  { id: 'plain',    name: 'None' },
  { id: 'frame',    name: 'Double frame' },
  { id: 'arch',     name: 'Arch' },
  { id: 'confetti', name: 'Confetti' },
  { id: 'bloom',    name: 'Botanical' },
  { id: 'stripes',  name: 'Stripes' },
  { id: 'dots',     name: 'Dots' },
  { id: 'rays',     name: 'Sunburst' },
];

export const PALETTES = [
  { id: 'cream',    name: 'Cream & ink',   bg: '#faf6ef', ink: '#2f2a24', accent: '#b08048', soft: '#eadfcc' },
  { id: 'blush',    name: 'Blush',         bg: '#fdf1ef', ink: '#4a2b2b', accent: '#cf7d76', soft: '#f6ddd8' },
  { id: 'sage',     name: 'Sage',          bg: '#f0f3ec', ink: '#2f3a2c', accent: '#6f8a5f', soft: '#dbe4d2' },
  { id: 'midnight', name: 'Midnight',      bg: '#1d2333', ink: '#f2eee6', accent: '#c9a227', soft: '#2f3750' },
  { id: 'powder',   name: 'Powder blue',   bg: '#eef4f8', ink: '#263a4a', accent: '#5b8ca8', soft: '#d6e6ef' },
  { id: 'party',    name: 'Party bright',  bg: '#fffaf2', ink: '#2b2440', accent: '#e0563f', soft: '#ffe2b8' },
  { id: 'forest',   name: 'Forest',        bg: '#14251d', ink: '#eef3ea', accent: '#d9a441', soft: '#223a2c' },
  { id: 'plum',     name: 'Plum',          bg: '#f6f0f6', ink: '#3b2740', accent: '#8b5a97', soft: '#e6d6ea' },
];

// Field definitions. `kind: 'invite'` templates additionally show the event block.
export const CARD_FIELDS = [
  { key: 'eyebrow',  label: 'Small line on top', type: 'text',     max: 40 },
  { key: 'headline', label: 'Headline',          type: 'text',     max: 60 },
  { key: 'message',  label: 'Message',           type: 'textarea', max: 400 },
  { key: 'signoff',  label: 'Sign-off',          type: 'text',     max: 60 },
];

export const INVITE_FIELDS = [
  { key: 'eyebrow',  label: 'Small line on top', type: 'text',     max: 40 },
  { key: 'headline', label: 'Headline',          type: 'text',     max: 60 },
  { key: 'message',  label: 'Message',           type: 'textarea', max: 300 },
  { key: 'date',     label: 'Date',              type: 'date' },
  { key: 'time',     label: 'Time',              type: 'time' },
  { key: 'venue',    label: 'Venue',             type: 'text',     max: 60 },
  { key: 'address',  label: 'Address',           type: 'text',     max: 90 },
  { key: 'rsvp',     label: 'RSVP to',           type: 'text',     max: 80 },
  { key: 'signoff',  label: 'Sign-off',          type: 'text',     max: 60 },
];

export const MUG_FIELDS = [
  { key: 'eyebrow',  label: 'Small line on top', type: 'text',     max: 40 },
  { key: 'headline', label: 'Quote',             type: 'textarea', max: 120 },
  { key: 'message',  label: 'Second line',       type: 'text',     max: 80 },
  { key: 'signoff',  label: 'Attribution',       type: 'text',     max: 60 },
];

export function fieldsFor(kind) {
  if (kind === 'invite') return INVITE_FIELDS;
  if (kind === 'mug') return MUG_FIELDS;
  return CARD_FIELDS;
}

export const TEMPLATES = [
  {
    id: 'birthday-confetti',
    name: 'Birthday',
    kind: 'card',
    palette: 'party',
    decor: 'confetti',
    fonts: { heading: 'futura', body: 'helvetica' },
    fields: {
      eyebrow: 'Happy Birthday',
      headline: 'Many happy returns, Ada',
      message: 'Another year, another excuse for too much cake.\nHope today is exactly as loud or as quiet as you want it.',
      signoff: 'With love, Romey',
    },
  },
  {
    id: 'thank-you-botanical',
    name: 'Thank you',
    kind: 'card',
    palette: 'sage',
    decor: 'bloom',
    fonts: { heading: 'baskerville', body: 'optima' },
    fields: {
      eyebrow: 'A note of',
      headline: 'Thank you',
      message: 'For the time, the trouble and the kindness — none of it went unnoticed. It made more of a difference than you probably realise.',
      signoff: 'Gratefully yours',
    },
  },
  {
    id: 'congrats-arch',
    name: 'Congrats',
    kind: 'card',
    palette: 'cream',
    decor: 'arch',
    fonts: { heading: 'didot', body: 'georgia' },
    fields: {
      eyebrow: 'Congratulations',
      headline: 'You did the thing',
      message: 'All those early mornings finally added up to something worth framing. Enjoy every bit of it.',
      signoff: 'So proud of you',
    },
  },
  {
    id: 'season-stripes',
    name: 'Seasonal',
    kind: 'card',
    palette: 'forest',
    decor: 'stripes',
    fonts: { heading: 'palatino', body: 'optima' },
    fields: {
      eyebrow: 'Season’s greetings',
      headline: 'Warmest wishes for the new year',
      message: 'Wishing you a restful holiday, good company and a quiet January.',
      signoff: 'From all of us',
    },
  },
  {
    id: 'garden-party',
    name: 'Garden party',
    kind: 'invite',
    palette: 'blush',
    decor: 'bloom',
    fonts: { heading: 'script', body: 'optima' },
    fields: {
      eyebrow: 'You’re invited',
      headline: 'A garden party',
      message: 'Drinks in the back garden, weather permitting. Bring a jumper just in case.',
      date: '2026-09-05',
      time: '15:00',
      venue: 'The Old Rectory',
      address: 'Your address here',
      rsvp: 'romey@example.com by 29 August',
      signoff: '',
    },
  },
  {
    id: 'dinner-modern',
    name: 'Dinner',
    kind: 'invite',
    palette: 'midnight',
    decor: 'frame',
    fonts: { heading: 'didot', body: 'helvetica' },
    fields: {
      eyebrow: 'Please join us for',
      headline: 'Dinner',
      message: 'Six courses, no phones, one long table.',
      date: '2026-10-17',
      time: '19:30',
      venue: 'Number Twelve',
      address: 'Your address here',
      rsvp: 'romey@example.com',
      signoff: 'Black tie optional',
    },
  },
  {
    id: 'baby-shower',
    name: 'Baby shower',
    kind: 'invite',
    palette: 'powder',
    decor: 'dots',
    fonts: { heading: 'baskerville', body: 'optima' },
    fields: {
      eyebrow: 'A baby shower for',
      headline: 'Nora & Sam',
      message: 'Cake, terrible baby-name suggestions and one very silly game. No gifts needed — books welcome.',
      date: '2026-11-08',
      time: '14:00',
      venue: 'The Sunroom Café',
      address: 'Your address here',
      rsvp: 'text Nora on 07700 900123',
      signoff: '',
    },
  },
  {
    id: 'wedding-elegant',
    name: 'Wedding',
    kind: 'invite',
    palette: 'cream',
    decor: 'arch',
    fonts: { heading: 'didot', body: 'baskerville' },
    fields: {
      eyebrow: 'Together with their families',
      headline: 'Isla & Callum',
      message: 'request the pleasure of your company at their wedding',
      date: '2027-06-12',
      time: '13:00',
      venue: 'Crathes Castle',
      address: 'Your address here',
      rsvp: 'islaandcallum@example.com by 1 May 2027',
      signoff: 'Dinner and dancing to follow',
    },
  },
];

/* ── mugs ──
 *
 * Mug designs are quote-led, so the headline field carries the quote and the
 * other fields are optional trimmings. Keep the wording generic or your own —
 * quotations still in copyright are not yours to print and sell.
 */
export const MUG_TEMPLATES = [
  {
    id: 'mug-first-coffee',
    name: 'But first',
    kind: 'mug',
    palette: 'cream',
    decor: 'dots',
    fonts: { heading: 'futura', body: 'helvetica' },
    transparent: false,
    fields: {
      eyebrow: '',
      headline: 'But first, coffee',
      message: '',
      signoff: '',
    },
  },
  {
    id: 'mug-good-day',
    name: 'Good day',
    kind: 'mug',
    palette: 'party',
    decor: 'confetti',
    fonts: { heading: 'futura', body: 'helvetica' },
    transparent: false,
    fields: {
      eyebrow: 'Reminder',
      headline: 'Today is a good day for a good day',
      message: '',
      signoff: '',
    },
  },
  {
    id: 'mug-slow-morning',
    name: 'Slow morning',
    kind: 'mug',
    palette: 'sage',
    decor: 'bloom',
    fonts: { heading: 'script', body: 'optima' },
    transparent: false,
    fields: {
      eyebrow: '',
      headline: 'Slow mornings & strong coffee',
      message: 'no plans, no rush',
      signoff: '',
    },
  },
  {
    id: 'mug-okayest',
    name: 'Okayest',
    kind: 'mug',
    palette: 'midnight',
    decor: 'stripes',
    fonts: { heading: 'didot', body: 'helvetica' },
    transparent: false,
    fields: {
      eyebrow: 'Officially the',
      headline: 'World’s okayest colleague',
      message: '',
      signoff: 'award pending',
    },
  },
];

TEMPLATES.push(...MUG_TEMPLATES);

export const paletteById = id => PALETTES.find(p => p.id === id) || PALETTES[0];
export const templateById = id => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
export const fontStack = id => (FONTS.find(f => f.id === id) || FONTS[0]).stack;

/** Build a fresh editor state from a template. */
export function stateFromTemplate(id, surface) {
  const t = templateById(id);
  const p = paletteById(t.palette);
  return {
    templateId: t.id,
    kind: t.kind,
    surface: surface || (t.kind === 'mug' ? 'mug11' : 'card'),
    decor: t.decor,
    transparent: Boolean(t.transparent),
    fonts: { ...t.fonts },
    colors: { bg: p.bg, ink: p.ink, accent: p.accent, soft: p.soft },
    fields: { ...t.fields },
  };
}
