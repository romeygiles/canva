// A library of ready-made lines, grouped by theme.
//
// Kept separate from the templates on purpose: a template is a *look*, a quote
// is *words*. Any quote can be dropped onto any look, so a handful of styles and
// a couple of dozen lines is already a few hundred sellable designs.
//
// Each entry carries field values rather than a bare string, so a quote can set
// a small line above or a punchline underneath as well as the main text.

export const QUOTE_GROUPS = [
  {
    id: 'heat',
    name: 'Hot flashes',
    quotes: [
      { headline: 'Powered by 90% coffee, 10% spontaneous combustion.' },
      { headline: 'Warning: may spontaneously become the sun.' },
      { headline: 'I’m not hot, I’m having a moment.' },
      { headline: 'Currently running my own internal climate crisis.' },
      { headline: 'Fan girl', message: '(literally, I carry one everywhere now)' },
    ],
  },
  {
    id: 'fog',
    name: 'Brain fog',
    quotes: [
      { headline: 'I didn’t forget. My hormones just filed it under “later.”' },
      { headline: 'Sorry, I’m on airplane mode.', message: 'Brain fog edition.' },
      { headline: 'I used to have a photographic memory. Now it’s more of a Polaroid — and it’s still developing.' },
      { headline: 'Wait, what was I saying?', message: 'exactly' },
    ],
  },
  {
    id: 'rage',
    name: 'Mood swings',
    quotes: [
      { headline: 'Zero to rage in 0.2 seconds.', message: 'Ask me how.' },
      { headline: 'My patience left with my estrogen.' },
      { eyebrow: 'Caution', headline: 'Hormonal weather system, conditions changing rapidly.' },
    ],
  },
  {
    id: 'reclaim',
    name: 'Reclaiming it',
    quotes: [
      { headline: 'Wise. Warm. Slightly on fire.' },
      { headline: 'Not going through menopause. Growing through it.' },
      { headline: 'Hot flash, don’t care.' },
      { headline: 'Estrogen left the chat. I stayed.' },
      { headline: 'Still hot. Just occasionally on fire.' },
    ],
  },
  {
    id: 'clinical',
    name: 'Deadpan',
    quotes: [
      { eyebrow: 'Perimenopause', headline: 'Because your 40s needed a plot twist.' },
      { headline: 'FSH levels: unpredictable.', message: 'Sense of humor: intact.' },
      { headline: 'Currently self-diagnosing via 3am Google searches.' },
      { headline: 'My hormones and I are in couples therapy.' },
    ],
  },
  {
    id: 'solidarity',
    name: 'Solidarity',
    quotes: [
      { headline: 'She believed she could, then had a hot flash and sat down for a bit.' },
      { headline: 'Behind every strong woman is a really good desk fan.' },
      { eyebrow: 'Perimenopause', headline: 'The unpaid internship nobody warned you about.' },
    ],
  },
];

/** Every quote, flattened, each tagged with the group it came from. */
export const ALL_QUOTES = QUOTE_GROUPS.flatMap(g =>
  g.quotes.map(q => ({ ...q, group: g.id })));

/**
 * The fields a quote sets. Anything it does not specify is cleared, so applying
 * a one-liner never leaves the previous quote's punchline stranded underneath.
 */
export function fieldsFromQuote(quote) {
  return {
    eyebrow: quote.eyebrow || '',
    headline: quote.headline || '',
    message: quote.message || '',
    signoff: quote.signoff || '',
  };
}
