# 浏览器离线资源

`guizang.js` 与 `ppt-master.js` 为机械生成资源，包含原始文件逐项压缩数据、CRC、大小与目录记录。通过 classic script 按需加载，可用于 `file://` 打开的页面，不需要服务器、fetch、CDN 或解压库。

不要手工编辑生成文件；在更新 `vendor/` 后运行 `node scripts/build-skill-assets.cjs`。导出将压缩字节原样写入 ZIP，直接保存文件夹时用浏览器原生 DecompressionStream 解压。测试逐项比对上游字节。

许可证与来源文件包含在资源内，随包原样恢复。完整 PPT Master 资源较大，首页不会加载它。
