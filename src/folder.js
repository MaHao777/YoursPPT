(function (root) {
  'use strict';
  const Y = root.YoursPPT;
  function canSaveFolder() {
    try { new root.DecompressionStream('deflate-raw'); return typeof root.showDirectoryPicker === 'function'; } catch { return false; }
  }
  // A new uniquely named child is created; existing files/folders are never overwritten.
  async function savePackageFolder(entries, parent, options = {}) {
    if (!Array.isArray(entries) || !entries.length) throw new Error('工作包内容为空');
    const rootName = entries[0].name.split('/')[0];
    if (!rootName || entries.some(e => typeof e.name !== 'string' || !e.name.startsWith(rootName + '/') || e.name.split('/').some(p => p === '.' || p === '..' || p.includes('\\')))) throw new Error('工作包路径不安全');
    let name = rootName, number = 2;
    for (;;) {
      try { await parent.getDirectoryHandle(name); name = `${rootName}-${number++}`; }
      catch (error) {
        if (error.name === 'TypeMismatchError') { name = `${rootName}-${number++}`; continue; }
        if (error.name === 'NotFoundError') break;
        throw error;
      }
    }
    const directory = await parent.getDirectoryHandle(name, { create: true });
    const marker = await directory.getFileHandle('INCOMPLETE.txt', { create: true });
    const markerStream = await marker.createWritable();
    await markerStream.write('此文件夹尚未完成导出。请勿交给 Agent。完成导出后此标记会自动移除；失败时请重新导出到新文件夹。');
    await markerStream.close();
    const directories = new Map([['', directory]]);
    async function getDirectory(path) {
      if (directories.has(path)) return directories.get(path);
      const segments = path.split('/'), last = segments.pop();
      const handle = await (await getDirectory(segments.join('/'))).getDirectoryHandle(last, { create: true });
      directories.set(path, handle); return handle;
    }
    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i], relative = entry.name.slice(rootName.length + 1);
        if (relative && !relative.endsWith('/')) {
          const segments = relative.split('/'), filename = segments.pop();
          const file = await (await getDirectory(segments.join('/'))).getFileHandle(filename, { create: true });
          const writable = await file.createWritable();
          try {
            if (entry.compressedData) {
              const blob = new Blob([entry.compressedData]);
              const stream = entry.method === 8 ? blob.stream().pipeThrough(new DecompressionStream('deflate-raw')) : blob.stream();
              await stream.pipeTo(writable);
            } else { await writable.write(entry.data); await writable.close(); }
          } catch (error) { await writable.abort().catch(() => {}); throw error; }
        } else if (relative) await getDirectory(relative.slice(0, -1));
        if (options.onProgress && (i % 20 === 0 || i === entries.length - 1)) options.onProgress({ completed: i + 1, total: entries.length, name });
      }
      await directory.removeEntry('INCOMPLETE.txt'); return name;
    } catch (error) {
      throw new Error(`文件夹「${name}」未保存完整，已保留 INCOMPLETE.txt 标记。请重新导出或改用 ZIP。${error.message}`);
    }
  }
  async function saveExportFile(blob, filename, parent) {
    if (filename !== Y.safePath(filename) || filename.includes('/')) throw new Error('导出文件名无效');
    const dot = filename.lastIndexOf('.'), base = dot > 0 ? filename.slice(0, dot) : filename, ext = dot > 0 ? filename.slice(dot) : '';
    let name = filename, number = 2;
    for (;;) {
      try { await parent.getFileHandle(name); name = `${base}-${number++}${ext}`; }
      catch (error) {
        if (error.name === 'TypeMismatchError') { name = `${base}-${number++}${ext}`; continue; }
        if (error.name === 'NotFoundError') break;
        throw error;
      }
    }
    const handle = await parent.getFileHandle(name, { create: true }), writable = await handle.createWritable();
    try { await writable.write(blob); await writable.close(); }
    catch (error) { await writable.abort().catch(() => {}); throw error; }
    return name;
  }
  Object.assign(Y, { canSaveFolder, savePackageFolder, saveExportFile });
})(globalThis);
