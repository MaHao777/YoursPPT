(function (root) {
  'use strict';
  const Y = root.YoursPPT;
  const selector = '.home, .stage-body, .slide-list, .editor-panel, .style-choices, .preview-area, .cm-scroller, .modal, .folder-results, .source-options, .agent-log';
  const surfaces = new Map();
  let frame = 0;
  function update(element) {
    const vertical = element.clientHeight > 0 && element.scrollHeight > element.clientHeight + 2;
    element.classList.toggle('scroll-fade-top', vertical && element.scrollTop > 2);
    element.classList.toggle('scroll-fade-bottom', vertical && element.scrollTop + element.clientHeight < element.scrollHeight - 2);
  }
  function schedule() {
    if (!frame) frame = root.requestAnimationFrame(() => { frame = 0; refreshScrollSurfaces(); });
  }
  const resize = new ResizeObserver(schedule);
  function refreshScrollSurfaces() {
    for (const [element, record] of surfaces) if (!element.isConnected) {
      clearTimeout(record.timer); element.removeEventListener('scroll', record.onScroll); resize.unobserve(element); surfaces.delete(element);
    }
    document.querySelectorAll(selector).forEach(element => {
      if (!surfaces.has(element)) {
        const record = { timer: null, onScroll: null };
        record.onScroll = () => {
          update(element); element.classList.add('is-scrolling'); clearTimeout(record.timer);
          record.timer = setTimeout(() => element.classList.remove('is-scrolling'), 650);
        };
        surfaces.set(element, record); element.classList.add('scroll-surface');
        element.addEventListener('scroll', record.onScroll, { passive: true }); resize.observe(element);
      }
      update(element);
    });
  }
  // Text editing, expanded details, modal contents and Agent logs can all change
  // overflow without resizing the outer pane. Observe content, not our classes.
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener('toggle', schedule, true);
  Y.refreshScrollSurfaces = refreshScrollSurfaces;
})(globalThis);
