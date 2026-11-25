/* Conservative DOM adapter: never infer query identity from row order. */
(function(root) {
  'use strict';
  const selector = '[aria-label="Query editor row"] textarea, .query-row textarea, textarea[data-testid="query-editor"]';
  function choose(candidates, ctx) {
    const expected = ctx.dialect === 'shiplog' ? ctx.query.value ?? ctx.filter : ctx.raw;
    const matches = candidates.filter(item => item.value === expected && !item.rich && !item.disabled);
    return matches.length === 1 ? matches[0] : null;
  }
  function find(doc, ctx) {
    const candidates = [...doc.querySelectorAll(selector)].map(el => ({
      el, value:el.value, rich:!!el.closest('.monaco-editor,.CodeMirror'), disabled:el.disabled || el.readOnly
    }));
    return choose(candidates,ctx)?.el || null;
  }
  function nativeValue(ctx, expression) {
    if (ctx.dialect !== 'shiplog') return expression;
    if (!expression.startsWith(ctx.selector)) return null;
    return expression.slice(ctx.selector.length).trim();
  }
  function write(el, value) {
    if (value === null || !el?.isConnected || el.disabled || el.readOnly) return false;
    if (el.value === value) return true;
    const win = el.ownerDocument.defaultView;
    Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype,'value').set.call(el,value);
    el.dispatchEvent(new win.Event('input',{bubbles:true}));
    el.dispatchEvent(new win.Event('change',{bubbles:true}));
    return el.value === value;
  }
  const api = {choose,find,nativeValue,write};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EasyGrafanaInline = api;
})(globalThis);
