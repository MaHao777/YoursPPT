'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
require('../src/model.js'); require('../src/folder.js');
const Y = globalThis.YoursPPT;
// Native picker handles are replaced only at the filesystem boundary.
function directory(fail = false) {
  const entries = new Map();
  return { entries,
    async getDirectoryHandle(name, options = {}) {
      if (!entries.has(name)) {
        if (!options.create) throw Object.assign(new Error('Missing'), { name: 'NotFoundError' });
        entries.set(name, directory(fail));
      }
      const value = entries.get(name);
      if (!value.entries) throw Object.assign(new Error('File'), { name: 'TypeMismatchError' });
      return value;
    },
    async getFileHandle(name) {
      const file = { data: null, async createWritable() {
        return Object.assign(new WritableStream({
          write(chunk) { if (fail && name !== 'INCOMPLETE.txt') throw new Error('Disk full'); file.data = Buffer.concat([file.data || Buffer.alloc(0), Buffer.from(chunk)]); }
        }), {
          async write(data) { if (fail && name !== 'INCOMPLETE.txt') throw new Error('Disk full'); file.data = Buffer.from(typeof data === 'string' ? data : await new Blob([data]).arrayBuffer()); },
          async close() {}, async abort() {}
        });
      } };
      entries.set(name, file); return file;
    },
    async removeEntry(name) { entries.delete(name); }
  };
}
test('folder export writes all real bytes, inflates raw assets and never overwrites a previous folder', async () => {
  const parent = directory(); parent.entries.set('汇报', directory());
  const raw = Buffer.from('完整原始 Skill 内容');
  const entries = [{ name: '汇报/', data: new Uint8Array() }, { name: '汇报/brief.md', data: '完整 brief' },
    { name: '汇报/references/', data: new Uint8Array() }, { name: '汇报/references/中文.bin', data: Uint8Array.from([0, 255]) },
    { name: '汇报/style/SKILL.md', method: 8, compressedData: zlib.deflateRawSync(raw) }];
  const result = await Y.savePackageFolder(entries, parent);
  assert.equal(result, '汇报-2'); const output = parent.entries.get(result);
  assert.equal(output.entries.has('INCOMPLETE.txt'), false);
  assert.equal(output.entries.get('brief.md').data.toString(), '完整 brief');
  assert.deepEqual(output.entries.get('references').entries.get('中文.bin').data, Buffer.from([0, 255]));
  assert.deepEqual(output.entries.get('style').entries.get('SKILL.md').data, raw);
  assert.equal(parent.entries.get('汇报').entries.size, 0);
});
test('interrupted folder exports retain a visible incomplete marker and report the new folder', async () => {
  const parent = directory(true);
  await assert.rejects(Y.savePackageFolder([{ name: '汇报/' }, { name: '汇报/brief.md', data: '内容' }], parent), /未保存完整/);
  assert(parent.entries.get('汇报').entries.has('INCOMPLETE.txt'));
});
