// UI wiring: gallery, form, live preview and the export buttons.

import {
  TEMPLATES, PALETTES, FONTS, DECORS,
  fieldsFor, stateFromTemplate, paletteById,
} from './templates.js';
import { renderSVG, renderThumb } from './render.js';
import { downloadPDF, downloadPNG, downloadSVG, mailtoLink, slugify } from './export.js';
import * as store from './store.js';

const $ = sel => document.querySelector(sel);

const el = {
  gallery:  $('#gallery'),
  filters:  $('.filters'),
  fields:   $('#fields'),
  palettes: $('#palettes'),
  decor:    $('#decor'),
  heading:  $('#font-heading'),
  bodyFont: $('#font-body'),
  stage:    $('#stage'),
  mail:     $('#btn-mail'),
  toast:    $('#toast'),
};

let state = store.readFromHash() || store.load() || stateFromTemplate(TEMPLATES[0].id);
let filter = 'all';

/* ───────────────────────── toast ───────────────────────── */

let toastTimer;
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-up');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('is-up'), 2400);
}

/* ───────────────────────── static controls ───────────────────────── */

function fillSelect(select, items, selected) {
  select.innerHTML = items
    .map(i => `<option value="${i.id}"${i.id === selected ? ' selected' : ''}>${i.name}</option>`)
    .join('');
}

function buildPalettes() {
  el.palettes.innerHTML = PALETTES.map(p => `
    <button type="button" class="swatch" data-palette="${p.id}" title="${p.name}" aria-label="${p.name}" aria-pressed="false">
      <i style="background:${p.bg}"></i><i style="background:${p.accent}"></i>
      <i style="background:${p.soft}"></i><i style="background:${p.ink}"></i>
    </button>`).join('');
}

function buildGallery() {
  const shown = TEMPLATES.filter(t => filter === 'all' || t.kind === filter);
  el.gallery.innerHTML = shown.map(t => `
    <button type="button" class="tpl" data-template="${t.id}" aria-pressed="${t.id === state.templateId}">
      ${renderThumb(stateFromTemplate(t.id))}
      <b>${t.name}</b>
    </button>`).join('');
}

/* ───────────────────────── the words form ───────────────────────── */

function buildFields() {
  const defs = fieldsFor(state.kind);

  el.fields.innerHTML = defs.map(def => {
    const value = state.fields[def.key] ?? '';
    const counter = def.max ? `<span class="counter" data-for="${def.key}"></span>` : '';

    const control = def.type === 'textarea'
      ? `<textarea data-field="${def.key}" rows="4"></textarea>`
      : `<input type="${def.type}" data-field="${def.key}">`;

    return `<label class="field">
      <span>${def.label}</span>
      ${control}
      ${counter}
    </label>`;
  }).join('');

  // Assign values as properties rather than markup so quotes and newlines survive.
  for (const def of defs) {
    const input = el.fields.querySelector(`[data-field="${def.key}"]`);
    input.value = state.fields[def.key] ?? '';
    if (def.max) input.setAttribute('maxlength', def.max);
    updateCounter(def);
  }
}

function updateCounter(def) {
  if (!def.max) return;
  const out = el.fields.querySelector(`.counter[data-for="${def.key}"]`);
  if (!out) return;
  const used = (state.fields[def.key] || '').length;
  out.textContent = `${used} / ${def.max}`;
  out.classList.toggle('is-over', used >= def.max);
}

/* ───────────────────────── render loop ───────────────────────── */

function syncControls() {
  el.decor.value = state.decor;
  el.heading.value = state.fonts.heading;
  el.bodyFont.value = state.fonts.body;

  for (const input of document.querySelectorAll('[data-color]')) {
    input.value = state.colors[input.dataset.color];
  }

  for (const button of el.gallery.querySelectorAll('[data-template]')) {
    button.setAttribute('aria-pressed', String(button.dataset.template === state.templateId));
  }

  for (const button of el.palettes.querySelectorAll('[data-palette]')) {
    const p = paletteById(button.dataset.palette);
    const match = p.bg === state.colors.bg && p.ink === state.colors.ink
      && p.accent === state.colors.accent && p.soft === state.colors.soft;
    button.setAttribute('aria-pressed', String(match));
  }
}

function draw() {
  el.stage.innerHTML = renderSVG(state);

  if (state.kind === 'invite') {
    el.mail.hidden = false;
    el.mail.href = mailtoLink(state, store.shareLink(state));
  } else {
    el.mail.hidden = true;
  }

  store.save(state);
}

function update(mutate) {
  mutate(state);
  syncControls();
  draw();
}

function selectTemplate(id) {
  state = stateFromTemplate(id);
  buildFields();
  syncControls();
  draw();
}

/* ───────────────────────── events ───────────────────────── */

el.filters.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  filter = button.dataset.filter;
  for (const chip of el.filters.children) chip.classList.toggle('is-on', chip === button);
  buildGallery();
  syncControls();
});

el.gallery.addEventListener('click', event => {
  const button = event.target.closest('[data-template]');
  if (button) selectTemplate(button.dataset.template);
});

el.palettes.addEventListener('click', event => {
  const button = event.target.closest('[data-palette]');
  if (!button) return;
  const p = paletteById(button.dataset.palette);
  update(s => { s.colors = { bg: p.bg, ink: p.ink, accent: p.accent, soft: p.soft }; });
});

el.fields.addEventListener('input', event => {
  const key = event.target.dataset.field;
  if (!key) return;
  update(s => { s.fields[key] = event.target.value; });
  updateCounter(fieldsFor(state.kind).find(d => d.key === key) || {});
});

for (const input of document.querySelectorAll('[data-color]')) {
  input.addEventListener('input', () => {
    update(s => { s.colors[input.dataset.color] = input.value; });
  });
}

el.decor.addEventListener('change', () => update(s => { s.decor = el.decor.value; }));
el.heading.addEventListener('change', () => update(s => { s.fonts.heading = el.heading.value; }));
el.bodyFont.addEventListener('change', () => update(s => { s.fonts.body = el.bodyFont.value; }));

$('#btn-share').addEventListener('click', async () => {
  const link = store.shareLink(state);
  history.replaceState(null, '', link);
  try {
    await navigator.clipboard.writeText(link);
    toast('Share link copied to the clipboard.');
  } catch {
    toast('Share link is now in the address bar.');
  }
});

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Start again from the original template wording?')) return;
  store.clear();
  history.replaceState(null, '', location.pathname + location.search);
  selectTemplate(state.templateId);
  toast('Reset to the template defaults.');
});

// Rasterising and compressing a 2000 x 2800 page takes a moment, so the button
// says so rather than looking dead.
function wireExport(selector, run) {
  const button = $(selector);
  button.addEventListener('click', async () => {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Working…';
    try {
      await run(renderSVG(state), slugify(state.fields.headline, state.kind));
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

wireExport('#btn-pdf', downloadPDF);
wireExport('#btn-png', downloadPNG);
wireExport('#btn-svg', downloadSVG);

$('#btn-print').addEventListener('click', () => window.print());

/* ───────────────────────── boot ───────────────────────── */

// A saved or shared payload can be older than the current template list, so fill
// in anything missing rather than rendering a half-empty card.
function normalise(candidate) {
  const known = TEMPLATES.find(t => t.id === candidate.templateId);
  if (!known) return stateFromTemplate(TEMPLATES[0].id);
  const base = stateFromTemplate(known.id);
  return {
    templateId: known.id,
    kind: known.kind,
    decor: DECORS.some(d => d.id === candidate.decor) ? candidate.decor : base.decor,
    fonts: {
      heading: FONTS.some(f => f.id === candidate.fonts?.heading) ? candidate.fonts.heading : base.fonts.heading,
      body: FONTS.some(f => f.id === candidate.fonts?.body) ? candidate.fonts.body : base.fonts.body,
    },
    colors: { ...base.colors, ...candidate.colors },
    fields: { ...base.fields, ...candidate.fields },
  };
}

state = normalise(state);

fillSelect(el.decor, DECORS, state.decor);
fillSelect(el.heading, FONTS, state.fonts.heading);
fillSelect(el.bodyFont, FONTS, state.fonts.body);
buildPalettes();
buildGallery();
buildFields();
syncControls();
draw();
