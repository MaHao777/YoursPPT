(function (root) {
  'use strict';
  const Y = root.YoursPPT;
  const KEY = 'yoursppt:draft:v2';
  let database;
  function openDB() {
    if (!root.indexedDB) return Promise.reject(new Error('当前浏览器不支持资料保存'));
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('yoursppt-workspace', 1);
      const timeout = setTimeout(() => reject(new Error('本地数据库暂时不可用')), 3000);
      request.onupgradeneeded = () => request.result.createObjectStore('workspace');
      request.onsuccess = () => { clearTimeout(timeout); resolve(request.result); };
      request.onerror = () => { clearTimeout(timeout); reject(request.error); };
      request.onblocked = () => { clearTimeout(timeout); reject(new Error('请关闭其它 YoursPPT 标签后重试')); };
    });
    return database;
  }
  function saveTextBackup(state, attachments) {
    try { localStorage.setItem(KEY, JSON.stringify({ state, attachments: attachments.map(({ file, ...a }) => a) })); return true; } catch { return false; }
  }
  async function saveDraft(state, attachments, options = {}) {
    let textSaved = false;
    textSaved = options.skipTextBackup ? true : saveTextBackup(state, attachments);
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('workspace', 'readwrite');
        tx.objectStore('workspace').put({ state, attachments }, 'current');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return { full: true };
    } catch {
      return { full: false, textSaved };
    }
  }
  async function loadDraft() {
    let textCopy;
    try { textCopy = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* Invalid backup is ignored. */ }
    try {
      const db = await openDB();
      const record = await new Promise((resolve, reject) => {
        const request = db.transaction('workspace').objectStore('workspace').get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      // A failed full save may leave the text backup newer than the database copy.
      if (textCopy && JSON.stringify(textCopy.state) !== JSON.stringify(record?.state)) {
        const byId = new Map((record?.attachments || []).map(a => [a.id, a]));
        textCopy.attachments = (textCopy.attachments || []).map(a => ({ ...a, file: byId.get(a.id)?.file || null }));
        return textCopy;
      }
      return record || textCopy;
    } catch { return textCopy; }
  }
  async function saveExportDirectory(handle) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', 'readwrite');
      tx.objectStore('workspace').put(handle, 'export-directory');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  async function loadExportDirectory() {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const request = db.transaction('workspace').objectStore('workspace').get('export-directory');
        request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error);
      });
    } catch { return null; }
  }
  Object.assign(Y, { saveDraft, loadDraft, saveTextBackup, saveExportDirectory, loadExportDirectory });
})(globalThis);
