// State persistence: localStorage for "pick up where I left off", and a
// base64url payload in the URL hash so a design can be shared as a link.

const KEY = 'cards-and-invites:v1';

/* ── unicode-safe base64url ── */

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(text.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ── shape check ── */

function isUsable(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.templateId === 'string' &&
    value.fields && typeof value.fields === 'object' &&
    value.colors && typeof value.colors === 'object' &&
    value.fonts && typeof value.fonts === 'object'
  );
}

/* ── public API ── */

export function readFromHash() {
  const hash = location.hash.replace(/^#d=/, '');
  if (!hash || hash === location.hash) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(hash));
    return isUsable(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function shareLink(state) {
  const url = new URL(location.href);
  url.hash = `d=${toBase64Url(JSON.stringify(state))}`;
  return url.toString();
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private browsing or a full quota — the editor still works. */
  }
}

export function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    return isUsable(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
