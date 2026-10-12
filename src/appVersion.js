// Keeps every open page on the newest published version of the site.
//
// A page left open keeps running the version it was opened with. When a newer version is
// published, the page notices (when the student comes back to it, and every few minutes) and
// refreshes itself with a short message. Registration details are kept as a draft on the device,
// so nothing typed is lost. A refresh never interrupts a quiz in progress or an open dialog.
// Right before a registration is sent, the page checks once more (see ensureLatestBeforeSubmit).
import { APP_ENV, expectedEnvForThisAddress } from './config/firebaseConfig';

const NOTICE_KEY = 'gfy_update_notice';
const CHECK_EVERY_MS = 5 * 60 * 1000;

// The main script of the version this page is running, e.g. /assets/index-AbC123.js
function loadedEntry() {
  const s = document.querySelector('script[type="module"][src*="/assets/index-"]');
  try { return s ? new URL(s.src).pathname : ''; } catch (e) { return ''; }
}

/** True when a newer version of the site has been published since this page was opened. */
export async function isOutdated() {
  const mine = loadedEntry();
  if (!mine) return false; // local development
  try {
    const res = await fetch(`/?version-check=${Date.now()}`, { cache: 'no-store' });
    const latest = ((await res.text()).match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    return Boolean(latest) && latest !== mine;
  } catch (e) {
    return false; // offline: nothing to compare with
  }
}

/** True when this page is connected to the database its address should use. */
export const connectedToTheRightDatabase = () => APP_ENV === expectedEnvForThisAddress();

function showMessage(text) {
  try {
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(42,36,33,.45);font-family:Poppins,sans-serif';
    const card = document.createElement('div');
    card.style.cssText = 'max-width:360px;background:#FFFCF7;border-radius:24px;padding:22px 20px;text-align:center;color:#2A2421;font-size:15px;line-height:1.5;box-shadow:0 10px 30px rgba(0,0,0,.15)';
    card.textContent = text;
    box.appendChild(card);
    document.body.appendChild(box);
  } catch (e) { /* the refresh still happens */ }
}

/**
 * Refresh to the newest version, with a message now and (for 'submit') another after the refresh.
 * Returns false when it did not refresh (it already did a moment ago: never loop).
 */
export function refreshToLatest(reason = 'auto') {
  try {
    const last = Number(sessionStorage.getItem('gfy_update_refreshed_at') || 0);
    if (Date.now() - last < 60 * 1000) return false;
    sessionStorage.setItem('gfy_update_refreshed_at', String(Date.now()));
    sessionStorage.setItem(NOTICE_KEY, reason);
  } catch (e) { /* ignore */ }
  showMessage(reason === 'submit'
    ? 'Sorry for the inconvenience. The site was just updated, so your registration was not sent. Your details are saved. The page will refresh now; please check them and submit again.'
    : 'A newer version of the site is ready. Refreshing now… Anything you typed in the registration form is saved.');
  setTimeout(() => window.location.reload(), reason === 'submit' ? 3500 : 1500);
  return true;
}

/** Read (once) why the page was refreshed: 'submit' | 'auto' | ''. */
export function takeUpdateNotice() {
  try {
    const v = sessionStorage.getItem(NOTICE_KEY) || '';
    sessionStorage.removeItem(NOTICE_KEY);
    return v;
  } catch (e) {
    return '';
  }
}

/**
 * Right before a registration is sent: if this page is out of date (or somehow connected to the
 * wrong database), nothing is sent, the details stay saved, and the page refreshes.
 * Returns true when it is safe to send.
 */
export async function ensureLatestBeforeSubmit() {
  const wrongDatabase = !connectedToTheRightDatabase();
  if (!wrongDatabase && !(await isOutdated())) return 'send';
  if (refreshToLatest('submit')) return 'refreshing';
  // Refreshed a moment ago already: an older version on the right database may still send;
  // the wrong database never.
  return wrongDatabase ? 'blocked' : 'send';
}

// Not while answering a quiz (answers are not saved yet) or while a dialog is open
const busy = () => /\/play(\/|$)/.test(window.location.hash || '') || Boolean(document.querySelector('[role="dialog"]'));

let started = false;
export function watchForUpdates() {
  if (started || !loadedEntry()) return;
  started = true;
  if (!connectedToTheRightDatabase()) {
    refreshToLatest('auto');
    return;
  }
  const check = async () => {
    if (busy() || !(await isOutdated()) || busy()) return;
    refreshToLatest('auto');
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  setInterval(() => { if (document.visibilityState === 'visible') check(); }, CHECK_EVERY_MS);
}
