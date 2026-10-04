(function (root) {
  'use strict';
  const Y = root.YoursPPT = root.YoursPPT || {};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Render locally. Images stay as descriptive text so drafts never fetch remote assets.
  const renderer = root.marked && new root.marked.Renderer();
  if (renderer) {
    renderer.html = token => escape(token.text);
    renderer.image = token => `<span class="markdown-image">[图片：${escape(token.text || token.href)}]</span>`;
  }
  Y.renderMarkdown = function (value) {
    const raw = String(value || '');
    if (!raw.trim()) return '<p class="field-hint">填写内容后，这里会显示 Markdown 预览。</p>';
    if (!root.marked || !root.DOMPurify) return `<pre>${escape(raw)}</pre>`;
    const html = root.marked.parse(raw, { renderer, gfm: true, breaks: true });
    return root.DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'span', 'input'], ALLOWED_ATTR: ['href', 'title', 'class', 'start', 'type', 'checked', 'disabled'], ALLOW_DATA_ATTR: false });
  };
})(globalThis);
