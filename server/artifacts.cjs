'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { inflateRawSync } = require('node:zlib');
require('../src/zip.js');

// Dependency-free well-formedness check for the small XML parts used by OOXML.
// DTDs and external entities are deliberately unsupported.
function validXmlRoot(bytes, localName, namespace) {
  try {
    const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(xml)) return false;
    const stack = []; let cursor = 0, rootSeen = false;
    const validText = value => !value.replace(/&(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);/gu, '').includes('&');
    while (cursor < xml.length) {
      if (xml[cursor] !== '<') {
        let end = xml.indexOf('<', cursor); if (end < 0) end = xml.length;
        const text = xml.slice(cursor, end);
        if ((!stack.length && text.trim()) || !validText(text) || text.includes(']]>')) return false;
        cursor = end; continue;
      }
      if (xml.startsWith('<!--', cursor)) {
        const end = xml.indexOf('-->', cursor + 4);
        if (end < 0 || xml.slice(cursor + 4, end).includes('--')) return false;
        cursor = end + 3; continue;
      }
      if (xml.startsWith('<?', cursor)) {
        const end = xml.indexOf('?>', cursor + 2); if (end < 0) return false;
        cursor = end + 2; continue;
      }
      if (xml.startsWith('<![CDATA[', cursor)) {
        const end = xml.indexOf(']]>', cursor + 9); if (!stack.length || end < 0) return false;
        cursor = end + 3; continue;
      }
      if (xml.startsWith('<!', cursor)) return false;
      let end = cursor + 1, quote = '';
      for (; end < xml.length; end++) {
        const char = xml[end];
        if (quote) { if (char === quote) quote = ''; }
        else if (char === '"' || char === "'") quote = char;
        else if (char === '>') break;
      }
      if (end >= xml.length) return false;
      let tag = xml.slice(cursor + 1, end); cursor = end + 1;
      if (tag.startsWith('/')) {
        if (!stack.length || tag.slice(1).trim() !== stack.pop().name) return false;
        continue;
      }
      const selfClosing = tag.endsWith('/'); if (selfClosing) tag = tag.slice(0, -1);
      const match = /^([A-Za-z_][\w.:-]*)([\s\S]*)$/u.exec(tag); if (!match) return false;
      const name = match[1], attributes = new Map(); let rest = match[2];
      const ns = new Map(stack.length ? stack[stack.length - 1].ns : [['xml', 'http://www.w3.org/XML/1998/namespace']]);
      while (rest.trim()) {
        const attr = /^\s+([A-Za-z_][\w.:-]*)\s*=\s*(["'])([\s\S]*?)\2/u.exec(rest);
        if (!attr || attributes.has(attr[1]) || attr[3].includes('<') || !validText(attr[3])) return false;
        attributes.set(attr[1], attr[3]); rest = rest.slice(attr[0].length);
        if (attr[1] === 'xmlns') ns.set('', attr[3]);
        else if (attr[1].startsWith('xmlns:')) ns.set(attr[1].slice(6), attr[3]);
      }
      const parts = name.split(':'); if (parts.length > 2 || parts.some(part => !part)) return false;
      const prefix = parts.length === 2 ? parts[0] : '', local = parts[parts.length - 1];
      if (prefix && !ns.has(prefix)) return false;
      if (!stack.length) {
        if (rootSeen || local !== localName || ns.get(prefix) !== namespace) return false;
        rootSeen = true;
      }
      for (const attr of attributes.keys()) {
        if (attr.includes(':') && attr.split(':')[0] !== 'xmlns' && !ns.has(attr.split(':')[0])) return false;
      }
      if (!selfClosing) stack.push({ name, ns });
    }
    return rootSeen && stack.length === 0;
  } catch { return false; }
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function relativePath(value) {
  if (typeof value !== 'string' || !value || /[\\\x00-\x1f\x7f:*?"<>|]/u.test(value) ||
      value.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/u.test(part))) {
    throw new Error('文件路径不安全');
  }
  return value;
}
async function safeFile(root, relative) {
  relativePath(relative);
  const base = await fs.realpath(root), target = path.resolve(root, relative);
  if (!inside(base, target)) throw new Error('文件路径不安全');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('不提供符号链接文件');
  }
  if (!inside(base, await fs.realpath(target))) throw new Error('文件超出结果目录');
  if (!(await fs.stat(target)).isFile()) throw new Error('不是可下载文件');
  return target;
}
async function listArtifacts(root) {
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('结果目录不能是符号链接');
  const result = [];
  let total = 0;
  async function walk(directory, prefix, depth) {
    if (depth > 20) throw new Error('结果目录层级过深');
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = relativePath(prefix + entry.name), file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('结果包含符号链接，无法交付：' + relative);
      if (entry.isDirectory()) { await walk(file, relative + '/', depth + 1); continue; }
      if (!entry.isFile()) throw new Error('结果包含不支持的文件类型');
      const stat = await fs.stat(file);
      total += stat.size;
      if (stat.size > 300 * 1024 ** 2 || total > 600 * 1024 ** 2 || result.length >= 2500) throw new Error('生成结果超过下载限制');
      result.push({ name: entry.name, path: relative, size: stat.size });
    }
  }
  await walk(root, '', 0);
  return result;
}

// Inspect the ZIP directory and required OOXML parts rather than accepting a renamed text file.
function isPptx(bytes) {
  try {
    let end = bytes.length - 22;
    const minimum = Math.max(0, end - 65535);
    while (end >= minimum && bytes.readUInt32LE(end) !== 0x06054b50) end--;
    if (end < minimum || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length) return false;
    if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) return false;
    const count = bytes.readUInt16LE(end + 10), entries = new Map();
    let cursor = bytes.readUInt32LE(end + 16);
    if (!count || cursor + bytes.readUInt32LE(end + 12) !== end) return false;
    for (let i = 0; i < count; i++) {
      if (bytes.readUInt32LE(cursor) !== 0x02014b50) return false;
      const length = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32);
      const name = bytes.subarray(cursor + 46, cursor + 46 + length).toString('utf8');
      if (entries.has(name)) return false;
      entries.set(name, { method: bytes.readUInt16LE(cursor + 10), crc: bytes.readUInt32LE(cursor + 16), size: bytes.readUInt32LE(cursor + 24), compressed: bytes.readUInt32LE(cursor + 20), offset: bytes.readUInt32LE(cursor + 42) });
      cursor += 46 + length + extra + comment;
      if (cursor > end) return false;
    }
    if (cursor !== end) return false;
    const required = ['[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels'];
    const slide = [...entries.keys()].find(name => /^ppt\/slides\/slide\d+\.xml$/u.test(name));
    if (!slide) return false;
    required.push(slide);
    const packageNS = 'http://schemas.openxmlformats.org/package/2006/';
    const presentationNS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
    const roots = [['Types', packageNS + 'content-types'], ['Relationships', packageNS + 'relationships'], ['presentation', presentationNS], ['Relationships', packageNS + 'relationships'], ['sld', presentationNS]];
    for (const name of required) {
      const entry = entries.get(name);
      if (!entry || !entry.size || entry.size > 16 * 1024 ** 2 || ![0, 8].includes(entry.method) || bytes.readUInt32LE(entry.offset) !== 0x04034b50) return false;
      const start = entry.offset + 30 + bytes.readUInt16LE(entry.offset + 26) + bytes.readUInt16LE(entry.offset + 28);
      if (start + entry.compressed > bytes.readUInt32LE(end + 16)) return false;
      if (bytes.subarray(entry.offset + 30, entry.offset + 30 + bytes.readUInt16LE(entry.offset + 26)).toString('utf8') !== name) return false;
      const data = bytes.subarray(start, start + entry.compressed);
      const xml = entry.method === 8 ? inflateRawSync(data, { maxOutputLength: 16 * 1024 ** 2 }) : data;
      if (xml.length !== entry.size || globalThis.YoursPPT.zipCRC32(xml) !== entry.crc || !validXmlRoot(xml, ...roots[required.indexOf(name)])) return false;
    }
    return true;
  } catch { return false; }
}
async function verifyDelivery(root, files, delivery) {
  const extension = delivery === 'pptx' ? '.pptx' : '.html';
  const valid = [];
  for (const file of files.filter(file => path.extname(file.path).toLowerCase() === extension && file.size > 0)) {
    const bytes = await fs.readFile(await safeFile(root, file.path));
    if (delivery === 'pptx' ? isPptx(bytes) : /<html(?:\s|>)/iu.test(bytes.toString('utf8')) && /<body(?:\s|>)/iu.test(bytes.toString('utf8'))) valid.push(file);
  }
  if (!valid.length) throw new Error('Agent 已结束，但未生成有效的 ' + delivery.toUpperCase() + ' 文件。请查看日志并重试。');
  return valid;
}
module.exports = { inside, relativePath, safeFile, listArtifacts, verifyDelivery, isPptx };
