(function (root) {
  'use strict';
  const Y = root.YoursPPT;
  const LIMIT = 300 * 1048576, TEXT_LIMIT = 10 * 1048576;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  function draftRecord(state, attachments) {
    return { version: 3, state, attachments: attachments.map(({ file, ...a }) => ({ ...a, path: a.path || a.exportPath, missing: !file })) };
  }
  async function buildDraftArchive(state, attachments) {
    const paths = Y.attachmentPaths(attachments);
    const entries = [{ name: 'draft.json', data: JSON.stringify(draftRecord(state, paths), null, 2) }];
    for (const item of paths) if (item.file) entries.push({ name: item.exportPath, data: item.file });
    return { blob: await Y.createZip(entries), filename: `${Y.safePath(state.meta.title || 'YoursPPT').replaceAll('/', '-')}-草稿.zip` };
  }
  function validateRecord(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('草稿内容格式不正确。');
    const input = data.state || data;
    if (!input.meta || !Array.isArray(input.slides) || !input.slides.length || input.slides.length > 200) throw new Error('草稿需要基本信息和 1–200 页内容。');
    if (!Array.isArray(data.attachments || [])) throw new Error('素材清单格式不正确。');
    const ids = new Set(); let total = 0;
    const attachments = (data.attachments || []).map(a => {
      if (!a || typeof a.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(a.id) || ids.has(a.id)) throw new Error('素材标识无效或重复。');
      ids.add(a.id);
      if (!Number.isSafeInteger(a.size) || a.size < 0 || a.size > 100 * 1048576 || (total += a.size) > LIMIT) throw new Error('素材大小超过限制。');
      return { id: a.id, name: String(a.name || '未命名文件').slice(0, 255), relativePath: Y.safePath(a.relativePath || a.name), size: a.size,
        type: String(a.type || ''), lastModified: Number(a.lastModified) || 0, path: a.path, missing: a.missing, file: null };
    });
    return { state: Y.normalizeDraft(input), attachments };
  }
  // Read only the draft and its referenced files. Skill payloads in work packages
  // are never inflated or executed. Our draft/package writer stores these entries.
  async function readDraftFile(file) {
    if (file.size > LIMIT + 100 * 1048576) throw new Error('草稿文件过大。');
    const signature = new DataView(await file.slice(0, 4).arrayBuffer());
    if (signature.byteLength < 4 || signature.getUint32(0, true) !== 0x04034b50) {
      if (file.size > TEXT_LIMIT) throw new Error('JSON 草稿不能超过 10 MB。');
      return validateRecord(JSON.parse(await file.text()));
    }
    const tailStart = Math.max(0, file.size - 65557), tail = new DataView(await file.slice(tailStart).arrayBuffer());
    let end = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50 && i + 22 + tail.getUint16(i + 20, true) === tail.byteLength) { end = i; break; }
    if (end < 0) throw new Error('ZIP 草稿不完整。');
    const count = tail.getUint16(end + 10, true), length = tail.getUint32(end + 12, true), offset = tail.getUint32(end + 16, true);
    if (tail.getUint16(end + 4, true) || tail.getUint16(end + 6, true) || count !== tail.getUint16(end + 8, true) || count === 65535 || length > TEXT_LIMIT || offset + length !== tailStart + end) throw new Error('不支持的 ZIP 草稿结构。');
    const bytes = new Uint8Array(await file.slice(offset, offset + length).arrayBuffer()), view = new DataView(bytes.buffer), entries = new Map();
    let at = 0;
    for (let i = 0; i < count; i++) {
      if (at + 46 > length || view.getUint32(at, true) !== 0x02014b50) throw new Error('ZIP 目录损坏。');
      const nameLength = view.getUint16(at + 28, true), next = at + 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
      if (next > length) throw new Error('ZIP 目录损坏。');
      const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
      if (entries.has(name)) throw new Error('ZIP 存在重复路径。');
      entries.set(name, { flags: view.getUint16(at + 8, true), method: view.getUint16(at + 10, true), crc: view.getUint32(at + 16, true),
        compressed: view.getUint32(at + 20, true), size: view.getUint32(at + 24, true), offset: view.getUint32(at + 42, true) });
      at = next;
    }
    if (at !== length) throw new Error('ZIP 目录大小不匹配。');
    async function read(name, max) {
      const e = entries.get(name);
      if (!e || e.size > max || e.method !== 0 || e.compressed !== e.size || (e.flags & 1) || e.offset + 30 > offset) throw new Error(`草稿文件缺失或格式不支持：${name}`);
      const local = new DataView(await file.slice(e.offset, e.offset + 30).arrayBuffer());
      if (local.getUint32(0, true) !== 0x04034b50 || local.getUint16(8, true) !== 0 || local.getUint16(6, true) !== e.flags || local.getUint32(14, true) !== e.crc || local.getUint32(18, true) !== e.size || local.getUint32(22, true) !== e.size) throw new Error('ZIP 文件头损坏。');
      const nameSize = local.getUint16(26, true), start = e.offset + 30 + nameSize + local.getUint16(28, true);
      if (start + e.size > offset || decoder.decode(new Uint8Array(await file.slice(e.offset + 30, e.offset + 30 + nameSize).arrayBuffer())) !== name) throw new Error('ZIP 文件路径或大小损坏。');
      const raw = new Uint8Array(await file.slice(start, start + e.size).arrayBuffer());
      if (Y.zipCRC32(raw) !== e.crc) throw new Error(`草稿校验失败：${name}`);
      return raw;
    }
    const names = [...entries.keys()].filter(name => /^(?:[^/]+\/)?draft\.json$/.test(name));
    if (names.length !== 1) throw new Error('请选择包含 draft.json 的 YoursPPT 草稿或工作包。');
    const record = validateRecord(JSON.parse(decoder.decode(await read(names[0], TEXT_LIMIT)))), prefix = names[0].slice(0, -10);
    for (const a of record.attachments) {
      if (a.missing) continue;
      if (typeof a.path !== 'string' || !a.path.startsWith('references/') || a.path.includes('\\') || a.path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('草稿素材路径无效。');
      const raw = await read(prefix + a.path, 100 * 1048576);
      if (raw.length !== a.size) throw new Error('草稿素材大小不匹配。');
      a.file = new Blob([raw], { type: a.type });
    }
    return record;
  }
  Object.assign(Y, { draftRecord, buildDraftArchive, readDraftFile });
})(globalThis);
