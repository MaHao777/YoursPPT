(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};
  const KEY = 'yoursppt:preferences:v1';
  const normalize = value => ({ theme: value?.theme === 'dark' ? 'dark' : 'light', language: value?.language === 'en' ? 'en' : 'zh-CN' });
  let preferences;
  try { preferences = normalize(JSON.parse(root.localStorage.getItem(KEY))); } catch { preferences = normalize(); }
  function apply() {
    if (!root.document) return;
    root.document.documentElement.dataset.theme = preferences.theme;
    root.document.documentElement.lang = preferences.language;
    const meta = root.document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = preferences.theme === 'dark' ? '#191c21' : '#f6f5f1';
  }
  function setPreferences(change, persist = true) {
    preferences = normalize({ ...preferences, ...change });
    let saved = true;
    if (persist) try { root.localStorage.setItem(KEY, JSON.stringify(preferences)); } catch { saved = false; }
    apply();
    root.document?.dispatchEvent(new CustomEvent('preferenceschange', { detail: { ...preferences, saved } }));
    return saved;
  }
  Object.assign(Y, { getPreferences: () => ({ ...preferences }), setPreferences, normalizePreferences: normalize });
  apply();
  root.addEventListener?.('storage', event => {
    if (event.key === KEY || event.key === null) {
      try { setPreferences(normalize(JSON.parse(event.newValue)), false); } catch { setPreferences(normalize(), false); }
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizePreferences: normalize };
})(globalThis);
