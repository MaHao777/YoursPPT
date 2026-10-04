#!/usr/bin/env node
'use strict';
const { createBridge } = require('../server/bridge.cjs');
const port = Number(process.env.YOURSPPT_PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('YOURSPPT_PORT 必须是 1–65535 的端口号。'); process.exitCode = 1;
} else {
  const bridge = createBridge();
  bridge.server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已使用，请更换 YOURSPPT_PORT 或使用已启动的服务。` : error.message); process.exitCode = 1; });
  bridge.server.listen(port, '127.0.0.1', () => {
    console.log(`YoursPPT 已启动：http://127.0.0.1:${port}`);
    console.log('在最后一步选择本机 Agent 生成 PPTX / HTML。按 Ctrl+C 停止服务。');
  });
  let stopping = false;
  const stop = () => { if (stopping) return; stopping = true; void bridge.close().catch(error => { console.error(error.message); process.exitCode = 1; }); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
