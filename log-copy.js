(function(root) {
  'use strict';
  // Grafana's Emotion styles retain these labels in both older Explore and logs panels.
  const MESSAGE = '[class*="logs-row__message"], [data-testid="log-row-message"]';
  function collect(doc) {
    const entries = [...doc.querySelectorAll(MESSAGE)].filter(el =>
      el.getClientRects().length && !el.closest('[aria-hidden="true"], [hidden]') &&
      !el.parentElement?.closest(MESSAGE));
    const lines = entries.map(el => {
      const copy = el.cloneNode(true);
      // Exclude row actions and expanded context/field tables from the message cell.
      copy.querySelectorAll('button, [role="button"], svg, table, [role="tooltip"]').forEach(node => node.remove());
      return (copy.textContent || '').replace(/\r\n?/g,'\n').trim();
    }).filter(Boolean);
    return {text:lines.join('\n'),count:lines.length};
  }
  async function copy(doc = document) {
    const result = collect(doc);
    if (!result.count) throw new Error('未找到可复制的日志正文；请先加载日志。此页面结构也可能尚未适配。');
    if (result.text.length > 10000000) throw new Error('页面日志超过复制大小限制，请缩小时间范围后重试。');
    try { await doc.defaultView.navigator.clipboard.writeText(result.text); }
    catch {
      const previous = doc.activeElement;
      const area = doc.createElement('textarea'); area.value = result.text;
      area.setAttribute('aria-label','待复制的页面日志');
      area.style.cssText = 'position:fixed;left:-9999px;top:0;';
      doc.body.append(area); area.select();
      let ok = false;
      try { ok = doc.execCommand('copy'); }
      finally { area.remove(); previous?.focus?.({preventScroll:true}); }
      if (!ok) throw new Error('浏览器未允许复制，请允许剪贴板访问后重试。');
    }
    return result.count;
  }
  const api = {collect,copy};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EasyGrafanaLogCopy = api;
})(globalThis);
