(function(root) {
  'use strict';
  function clean(items) {
    return (Array.isArray(items) ? items : []).filter(x => x && typeof x.text === 'string' &&
      x.text.trim() && x.text.length <= 2000 && Number.isSafeInteger(x.count) && x.count > 0 &&
      Number.isFinite(x.last)).map(x => ({text:x.text,count:x.count,last:x.last}));
  }
  const rank = (a,b) => b.last-a.last || b.count-a.count || a.text.localeCompare(b.text);
  function record(items,text,now = Date.now()) {
    const list = clean(items);
    text = typeof text === 'string' ? text.trim() : '';
    if (!text || text.length > 2000) return list;
    const found = list.find(x => x.text === text);
    if (found) { found.count = Math.min(found.count+1,Number.MAX_SAFE_INTEGER); found.last = now; }
    else list.push({text,count:1,last:now});
    return list.sort(rank).slice(0,100);
  }
  function suggest(items,needle = '') {
    return clean(items).filter(x => x.text.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase())).sort(rank).slice(0,12);
  }
  const key = (origin,dialect) => 'easygrafana.history.' + JSON.stringify([origin,dialect]);
  const syntax = [
    {text:'关键词', description:'语法 · 包含一个词；多个词用空格分隔', sample:'关键词'},
    {text:'"完整 短语"', description:'语法 · 包含空格时，用双引号包裹为一个词', sample:'完整 短语'},
    {text:'NOT 关键词', description:'语法 · 排除一个词', sample:'关键词'},
    {text:'NOT (词一 词二)', description:'语法 · 同时排除多个词', sample:'词一 词二'},
    {text:'(词一 OR 词二)', description:'语法 · 匹配任意一个词；与其他条件组合时保留括号', sample:'词一 OR 词二'}
  ];
  function insertSyntax(value, item) {
    // Append rather than replacing a user's existing query or splitting a phrase.
    const prefix = value.trimEnd();
    const start = prefix.length + (prefix ? 1 : 0);
    const text = prefix + (prefix ? ' ' : '') + item.text;
    const selectionStart = start + item.text.indexOf(item.sample);
    return {text, selectionStart, selectionEnd:selectionStart + item.sample.length};
  }
  const api = {record,suggest,key,syntax,insertSyntax};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EasyGrafanaHistory = api;
})(globalThis);
