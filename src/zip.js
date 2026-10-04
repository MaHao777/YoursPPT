(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};
  const encoder = new TextEncoder();
  const MAX32 = 0xfffffffe; // 0xffffffff and 0xffff are ZIP64 sentinels.
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    table[n] = c >>> 0;
  }
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function integer(value, max, field) {
    if (!Number.isSafeInteger(value) || value < 0 || value > max) {
      throw new RangeError('ZIP32 ' + field + ' out of bounds');
    }
    return value;
  }
  function safePath(name) {
    if (typeof name !== 'string' || !name || name.includes('\\') || name.startsWith('/') ||
        /[\x00-\x1f\x7f:*?"<>|]/u.test(name) || /[\ud800-\udfff]/u.test(name)) {
      throw new Error('Unsafe ZIP path: ' + name);
    }
    const parts = (name.endsWith('/') ? name.slice(0, -1) : name).split('/');
    if (parts.some(p => !p || p === '.' || p === '..' || /[. ]$/u.test(p) ||
        /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(p))) {
      throw new Error('Unsafe ZIP path: ' + name);
    }
    const bytes = encoder.encode(name);
    integer(bytes.length, 0xffff, 'UTF-8 filename length');
    return bytes;
  }
  function dosDate(value) {
    const date = value == null ? new Date(1980, 0, 1) : new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getFullYear() < 1980 || date.getFullYear() > 2107) {
      throw new RangeError('ZIP DOS date must be between 1980 and 2107');
    }
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >>> 1),
      date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }
  function bytesOf(data) {
    if (data instanceof Uint8Array) return data;
    if (typeof data === 'string') return encoder.encode(data);
    if (data == null) return undefined;
    throw new TypeError('ZIP data must be Uint8Array, string or Blob');
  }
  function assemble(entries) {
    integer(entries.length, 0xfffe, 'entry count');
    const locals = [], central = [], names = new Map();
    let offset = 0, centralSize = 0;
    for (const entry of entries) {
      const name = safePath(entry.name);
      const directory = entry.name.endsWith('/');
      const key = entry.name.normalize('NFC').toLowerCase().replace(/\/$/u, '');
      if (names.has(key)) throw new Error('Duplicate ZIP name: ' + entry.name);
      names.set(key, directory);
      const raw = bytesOf(entry.data);
      const compressed = entry.compressedData;
      if (compressed !== undefined && !(compressed instanceof Uint8Array)) {
        throw new TypeError('compressedData must be Uint8Array');
      }
      const method = entry.method == null ? (compressed === undefined ? 0 : 8) : entry.method;
      if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP method: ' + method);
      if (method === 8 && compressed === undefined) throw new Error('DEFLATE requires compressedData');
      if (raw === undefined && compressed === undefined && !directory) throw new Error('Missing ZIP data');
      const payload = compressed === undefined ? (raw || new Uint8Array()) : compressed;
      const size = integer(entry.uncompressedSize == null ?
        (raw === undefined ? (method === 0 ? payload.length : NaN) : raw.length) :
        entry.uncompressedSize, MAX32, 'uncompressed size');
      integer(payload.length, MAX32, 'compressed size');
      if (raw && size !== raw.length) throw new Error('Uncompressed size mismatch: ' + entry.name);
      if (method === 0 && size !== payload.length) throw new Error('Stored size mismatch: ' + entry.name);
      const calculated = raw ? crc32(raw) : (method === 0 ? crc32(payload) : undefined);
      const crc = entry.crc == null ? calculated : integer(entry.crc, 0xffffffff, 'CRC');
      if (crc === undefined) throw new Error('Precompressed entry requires crc: ' + entry.name);
      if (calculated !== undefined && calculated !== crc) throw new Error('CRC mismatch: ' + entry.name);
      if (method === 0 && crc32(payload) !== crc) throw new Error('Stored CRC mismatch: ' + entry.name);
      if (directory && (size || payload.length || crc || method)) throw new Error('Directory must be empty and stored');
      const stamp = dosDate(entry.date);
      const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); // UTF-8; no data descriptors.
      lv.setUint16(8, method, true);
      lv.setUint16(10, stamp.time, true); lv.setUint16(12, stamp.date, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, payload.length, true); lv.setUint32(22, size, true);
      lv.setUint16(26, name.length, true); local.set(name, 30);
      const cd = new Uint8Array(46 + name.length), cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true); cv.setUint16(10, method, true);
      cv.setUint16(12, stamp.time, true); cv.setUint16(14, stamp.date, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, payload.length, true); cv.setUint32(24, size, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(38, directory ? 0x10 : 0x20, true);
      cv.setUint32(42, integer(offset, MAX32, 'local header offset'), true); cd.set(name, 46);
      locals.push(local, payload); central.push(cd);
      offset = integer(offset + local.length + payload.length, MAX32, 'local directory offset');
      centralSize = integer(centralSize + cd.length, MAX32, 'central directory size');
    }
    // Disallow file/directory conflicts even when the directory was implicit.
    for (const key of names.keys()) {
      let parent = key;
      while (parent.includes('/')) {
        parent = parent.slice(0, parent.lastIndexOf('/'));
        if (names.get(parent) === false) throw new Error('ZIP file/directory conflict: ' + parent);
      }
    }
    integer(offset + centralSize + 22, MAX32, 'archive size');
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob([...locals, ...central, end], { type: 'application/zip' });
  }
  /** Strings/bytes return Blob synchronously; Blob input requires asynchronous reading.
   * Await createZip(entries) uniformly to support all three input types.
   * DEFLATE bytes are trusted caller-supplied raw DEFLATE with size + CRC.
   */
  Y.createZip = function (entries) {
    if (!Array.isArray(entries)) throw new TypeError('ZIP entries must be an array');
    integer(entries.length, 0xfffe, 'entry count');
    if (entries.some(e => e && e.data instanceof Blob)) {
      return (async function () {
        const ready = [];
        for (const e of entries) {
          ready.push(e.data instanceof Blob ? { ...e, data: new Uint8Array(await e.data.arrayBuffer()) } : e);
        }
        return assemble(ready);
      }());
    }
    return assemble(entries);
  };
  Y.zipCRC32 = crc32;
  if (typeof module !== 'undefined' && module.exports) module.exports = Y;
}(typeof window !== 'undefined' ? window : globalThis));
