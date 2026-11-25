/* Shared by the extension and the dependency-free Node tests. */
(function (root) {
  'use strict';
  function parseTerms(input, dialect = 'shiplog') {
    if (typeof input !== 'string') throw new Error('请输入关键词。');
    if (!['shiplog', 'loki'].includes(dialect)) throw new Error('不支持当前数据源的查询语法。');
    const forbidden = dialect === 'loki' ? /[\r\n\u0000]/u : /[\r\n|;`$<>\u0000]/u;
    if (forbidden.test(input)) throw new Error('请只输入关键词，不要输入管道、换行或命令符号。');
    const filters = [];
    let i = 0;
    const space = () => { while (i < input.length && /\s/u.test(input[i])) i++; };
    const isOr = () => /^OR(?=\s|[（()）]|$)/iu.test(input.slice(i));
    const isNot = () => /^NOT(?=\s|[（(]|$)/iu.test(input.slice(i));
    function readWord() {
      let word = '';
      if (input[i] === '"') {
        const start = i++;
        let closed = false;
        while (i < input.length) {
          if (input[i] === '\\') { i += 2; continue; }
          if (input[i++] === '"') { closed = true; break; }
        }
        if (!closed) throw new Error('短语缺少结束双引号。');
        try { word = JSON.parse(input.slice(start,i)); }
        catch { throw new Error('引号内的转义无效。'); }
        if (i < input.length && !/[\s)）]/u.test(input[i])) throw new Error('短语之间请用空格分隔。');
      } else {
        const start = i;
        while (i < input.length && !/[\s()（）]/u.test(input[i])) i++;
        word = input.slice(start,i);
        if (word.includes('"')) throw new Error('请用双引号包住完整短语。');
      }
      return word;
    }
    function validate(word) {
      if (!word.trim()) throw new Error('关键词不能为空；NOT 后需要填写排除词。');
      if (dialect === 'shiplog' && word.startsWith('-')) throw new Error('关键词不能以减号开头，以免被识别为 grep 参数。');
      if (forbidden.test(word)) throw new Error('关键词包含不支持的控制字符或命令符号。');
      return word;
    }
    function append(word,exclude) { filters.push({word:validate(word),exclude}); }
    function alternative() {
      if (i >= input.length || /[()（）-]/u.test(input[i]) || isNot() || isOr()) throw new Error('OR 两侧需要填写检索词，短语请加双引号。');
      return validate(readWord());
    }
    function orGroup(close = '') {
      const alternatives = [alternative()];
      space();
      while (isOr()) {
        i += 2; space(); alternatives.push(alternative()); space();
      }
      if (alternatives.length < 2) throw new Error('括号组请使用 OR 连接至少两个检索词。');
      if (close) {
        if (input[i] !== close) throw new Error('OR 括号必须配对，组内仅支持单词或短语。');
        i++;
        if (i < input.length && !/\s/u.test(input[i])) throw new Error('括号后请用空格分隔。');
      } else if (i < input.length) throw new Error('OR 和其他条件混用时请加括号，例如 trace (11 OR 22)。');
      filters.push({alternatives,exclude:false});

    }
    while (i < input.length) {
      space();
      if (i === input.length) break;
      if (isOr()) throw new Error('OR 左侧需要填写检索词。');
      if (input[i] === '(' || input[i] === '（') {
        const close = input[i++] === '(' ? ')' : '）'; space(); orGroup(close);
      } else if (isNot()) {
        i += 3; space();
        if (input[i] === '(' || input[i] === '（') {
          const close = input[i++] === '(' ? ')' : '）';
          let count = 0;
          while (true) {
            space();
            if (input[i] === close) {
              i++;
              if (!count) throw new Error('NOT 括号内至少填写一个排除词。');
              if (i < input.length && !/\s/u.test(input[i])) throw new Error('括号后请用空格分隔。');
              break;
            }
            if (i >= input.length) throw new Error('NOT 括号未闭合。');
            if (/[()（）-]/u.test(input[i]) || isNot() || isOr()) throw new Error('NOT 分组只需填写排除词，不支持嵌套或重复排除符号。');
            append(readWord(),true); count++;
          }
        } else {
          if (i >= input.length || input[i] === '-' || isNot() || isOr()) throw new Error('NOT 后需要填写排除词或括号分组。');
          append(readWord(),true);
        }
      } else {
        if (input[i] === '-') throw new Error('不再支持减号排除，请改用 NOT 单词或 NOT (多个词)。');
        const start = i;
        const word = readWord(); space();
        if (isOr()) {
          if (filters.length) throw new Error('OR 和其他条件混用时请加括号，例如 trace (11 OR 22)。');
          i = start; orGroup();
        } else append(word,false);
      }
    }
    return filters;
  }
  const escapeRegex = word => [...word].map(ch => '\\.^$|?*+()[]{}'.includes(ch) ? '\\' + ch : ch).join('');
  function compileTerm(term,dialect) {
    if (term.alternatives) {
      const pattern = '(' + term.alternatives.map(escapeRegex).join('|') + ')';
      return (dialect === 'loki' ? '|~ ' : 'grep -E ') + JSON.stringify(pattern);
    }
    const {word,exclude} = term;
    const encoded = /^[a-zA-Z0-9_./:@=,+%]+$/u.test(word) ? word : JSON.stringify(word);
    return dialect === 'loki' ? `${exclude ? '!=' : '|='} ${JSON.stringify(word)}` : `grep ${exclude ? '-v ' : ''}${encoded}`;
  }
  function compile(input,dialect = 'shiplog') {
    return parseTerms(input,dialect).map(term => compileTerm(term,dialect)).join(dialect === 'loki' ? ' ' : ' | ');
  }
  function decodeAlternatives(pattern) {
    if (!pattern.startsWith('(') || !pattern.endsWith(')')) return null;
    const parts = []; let part = '', escaped = false;
    for (const ch of pattern.slice(1,-1)) {
      if (ch === '|' && !escaped) { parts.push(part); part=''; continue; }
      part += ch;
      if (escaped) escaped=false; else if (ch === '\\') escaped=true;
    }
    parts.push(part);
    const words = parts.map(part => part.replace(/\\(.)/gu,'$1'));
    return words.length > 1 && words.every((word,index) => word.trim() && escapeRegex(word) === parts[index]) ? words : null;
  }
  function simpleWord(word) {
    return /^[a-zA-Z0-9_./:@=,+%]+$/u.test(word) && !/^(not|or)$/iu.test(word) ? word : JSON.stringify(word);
  }
  function simpleTerm(term) {
    return term.alternatives ? '(' + term.alternatives.map(simpleWord).join(' OR ') + ')' : (term.exclude ? 'NOT ' : '') + simpleWord(term.word);
  }
  function splitPipes(text) {
    const result = []; let start = 0, quoted = false, escaped = false;
    for (let i=0;i<text.length;i++) {
      if (escaped) { escaped=false; continue; }
      if (text[i] === '\\' && quoted) { escaped=true; continue; }
      if (text[i] === '"') quoted=!quoted;
      else if (text[i] === '|' && !quoted) { result.push(text.slice(start,i)); start=i+1; }
    }
    result.push(text.slice(start)); return result;
  }

  function appendKeyword(input, text, dialect = 'shiplog') {
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new Error('请选择 1–2000 个字符的关键词。');
    const terms = parseTerms(input,dialect);
    // Selection is always a literal, including spaces and reserved NOT/OR words.
    const literal = simpleWord(text.trim());
    parseTerms(literal,dialect);
    const next = [...terms.map(simpleTerm),literal].join(' ');
    compile(next,dialect);
    return next;
  }

  function removeKeyword(input,index,dialect = 'shiplog') {
    if (!Number.isInteger(index) || index < 0) throw new Error('无效的关键词位置。');
    const terms = parseTerms(input,dialect);
    let current = 0, removed = false;
    const next = terms.flatMap(term => {
      if (term.alternatives) {
        const alternatives = term.alternatives.filter(() => {
          const keep = current++ !== index; if (!keep) removed = true; return keep;
        });
        if (!alternatives.length) return [];
        return [alternatives.length === 1 ? {word:alternatives[0],exclude:false} : {...term,alternatives}];
      }
      if (current++ === index) { removed = true; return []; }
      return [term];
    });
    if (!removed) throw new Error('关键词位置已变化，请重试。');
    return next.map(simpleTerm).join(' ');
  }

  function highlightParts(input,dialect = 'shiplog') {
    let terms;
    try {
      terms = parseTerms(input,dialect).flatMap(term => term.alternatives ?
        term.alternatives.map(word=>({word,exclude:false})) : [term]);
    } catch { return [{text:input,kind:'plain'}]; }
    const parts = []; let end = 0, index = 0;
    for (const match of input.matchAll(/"(?:\\.|[^"\\])*"|[^\s()（）]+/gu)) {
      if (/^(NOT|OR)$/iu.test(match[0])) continue;
      if (match.index > end) parts.push({text:input.slice(end,match.index),kind:'plain'});
      parts.push({text:match[0],kind:terms[index++]?.exclude ? 'exclude' : 'include'});
      end = match.index + match[0].length;
    }
    if (end < input.length) parts.push({text:input.slice(end),kind:'plain'});
    return parts;
  }
  function selectorPrefix(text) {
    if (typeof text !== 'string' || !text.startsWith('{')) throw new Error('未找到有效的服务和环境选择器。');
    let quoted = '';
    let escaped = false;
    for (let i = 1; i < text.length; i++) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (quoted === '"' && ch === '\\') { escaped = true; continue; }
      if (quoted && ch === quoted) quoted = '';
      else if (!quoted && (ch === '"' || ch === '`')) quoted = ch;
      if (ch === '}' && !quoted) {
        const value = text.slice(0, i + 1);
        if (!value.slice(1, -1).trim()) break;
        return value;
      }
    }
    throw new Error('服务和环境选择器不完整，请先在原页面执行一次查询。');
  }

  function isExploreURL(href) {
    try {
      const url = new URL(href);
      return /^https?:$/u.test(url.protocol) && /\/explore\/?$/u.test(url.pathname);
    } catch { return false; }
  }

  function splitLoki(tail) {
    const tokens = [];
    let rest = tail.trim();
    // Only plain leading line filters belong to the simplified editor. Preserve all other stages.
    while (rest) {
      const match = /^(\|=|!=|\|~)\s*("(?:\\.|[^"\\])*"|`[^`]*`)\s*/u.exec(rest);
      if (!match) break;
      let word;
      try { word = match[2][0] === '`' ? match[2].slice(1, -1) : JSON.parse(match[2]); }
      catch { break; }
      if (/[\r\n\u0000]/u.test(word)) break;
      if (match[1] === '|~') {
        const alternatives = decodeAlternatives(word);
        if (!alternatives) break;
        tokens.push({alternatives,exclude:false});
      } else tokens.push({word, exclude: match[1] === '!='});
      rest = rest.slice(match[0].length);
      // A filter with OR is one indivisible expression, not independent operands.
      if (/^or\b/u.test(rest)) return { tokens: [], filter: '', suffix: tail.trim() };
    }
    return {tokens, filter: tokens.map(t => compileTerm(t,'loki')).join(' '), suffix: rest.trim()};
  }

  function readEntries(href) {
    if (!isExploreURL(href)) throw new Error('当前不是 Grafana Explore 页面。');
    const url = new URL(href);
    const entries = [];
    const addPane = (key, state, pane, paneId = '') => {
      if (!pane || typeof pane !== 'object') return;
      const legacy = Array.isArray(pane);
      const queries = legacy ? pane.slice(3) : pane.queries;
      const range = legacy ? {from:pane[0], to:pane[1]} : pane.range;
      const datasource = legacy ? pane[2] : pane.datasource;
      if (!Array.isArray(queries) || !range || ![range.from,range.to].every(v => typeof v === 'string' || typeof v === 'number')) return;
      queries.forEach((query, index) => {
        if (!query || typeof query !== 'object' || Array.isArray(query)) return;
        const id = JSON.stringify([key,paneId,index]);
        entries.push({id,url,state,key,pane,paneId,legacy,query,index,from:range.from,to:range.to,datasource});
      });
    };
    if (url.searchParams.has('panes')) {
      const version = url.searchParams.get('schemaVersion');
      if (version && version !== '1') throw new Error('当前 Explore 链接版本尚未支持。');
      const state = JSON.parse(url.searchParams.get('panes'));
      if (state && typeof state === 'object' && !Array.isArray(state)) {
        for (const [id,pane] of Object.entries(state)) addPane('panes',state,pane,id);
      }
    } else {
      for (const key of ['left','right']) {
        if (!url.searchParams.has(key)) continue;
        try { const state = JSON.parse(url.searchParams.get(key)); addPane(key,state,state); }
        catch { /* One invalid pane must not prevent editing another valid pane. */ }
      }
    }
    return entries;
  }

  const dialectChoices = new Map();
  function dialectKey(entry) {
    const ds = entry.query.datasource || entry.datasource;
    const identity = typeof ds === 'object' && ds ? [ds.uid || '',ds.type || ''] : [ds || ''];
    return JSON.stringify([entry.url.origin,entry.url.searchParams.get('orgId') || '',identity]);
  }
  function setDialectChoice(key,value) {
    if (!['shiplog','loki','auto'].includes(value)) throw new Error('未知查询语法');
    if (value === 'auto') dialectChoices.delete(key); else dialectChoices.set(key,value);
  }
  function inferDialect(entry) {
    const {query} = entry;
    const ds = query.datasource || entry.datasource;
    const type = ds && typeof ds === 'object' ? String(ds.type || '').toLowerCase() : '';
    const name = typeof ds === 'string' ? ds : '';
    const choice = dialectChoices.get(dialectKey(entry));
    if (choice) return {dialect:choice,dialectReason:'已选择并记住'};
    if (type === 'loki') return {dialect:'loki',dialectReason:'数据源类型'};
    if (/^(shiplog|logsearchship|logsearch|logsearchus)$/.test(type)) return {dialect:'shiplog',dialectReason:'数据源类型'};
    // Never reinterpret a declared non-log datasource based on a similar expression.
    if (!type) {
      const raw = typeof query.expr === 'string' ? query.expr.trim() : '';
      let tail = null;
      try { tail = raw.slice(selectorPrefix(raw).length).trim(); } catch {}
      if (tail !== null && /^grep(?:\s|$)/u.test(tail)) return {dialect:'shiplog',dialectReason:'grep 查询语法'};
      if (tail !== null && /^(?:\|[=~]|![=~]|\|\s*(?:json|logfmt|regexp|pattern|line_format|label_format)\b)/u.test(tail)) return {dialect:'loki',dialectReason:'LogQL 查询语法'};
      if (typeof query.queryText === 'string' && typeof query.value === 'string' && /^(?:grep\s|$)/u.test(query.value.trim())) return {dialect:'shiplog',dialectReason:'环境与检索分离字段'};
      if (/^loki$/iu.test(name)) return {dialect:'loki',dialectReason:'已知名称辅助识别'};
      if (/^logsearch(?:ship|us)?$/iu.test(name)) return {dialect:'shiplog',dialectReason:'已知名称辅助识别'};
    }
    return {dialect:'raw',dialectReason:'无法判断，请选择查询语法'};
  }

  function analyze(entry) {
    const {query} = entry;
    const ds = query.datasource || entry.datasource;
    const {dialect,dialectReason} = inferDialect(entry);
    if (dialect === 'raw' && typeof query.expr !== 'string') throw new Error('当前数据源没有可编辑的 expr 查询字段。');
    const source = (dialect === 'shiplog' ? query.queryText || query.expr : query.expr)?.trim();
    const datasource = typeof ds === 'object' ? ds.uid || ds.type : ds;
    const base = {...entry,dialect,dialectReason,dialectKey:dialectKey(entry),dialectChoice:dialectChoices.get(dialectKey(entry)) || 'auto',datasource:datasource || dialect,
      raw: typeof query.expr === 'string' ? query.expr : '',
      label:`${entry.paneId || (entry.key === 'right' ? '右侧' : '左侧')} · ${query.refId || entry.index + 1} · ${datasource || dialect}`};
    if (dialect === 'raw') return {...base,selector:'',filter:'',suffix:'',simpleAvailable:false};
    let selector;
    try { selector = selectorPrefix(source); }
    catch (error) {
      if (dialect !== 'loki') throw error;
      return {...base,selector:'',filter:'',suffix:'',simpleAvailable:false};
    }
    let filter, suffix = '';
    if (dialect === 'shiplog') {
      if (query.queryText && query.queryText.trim() !== selector) throw new Error('queryText 含有额外语法。');
      filter = typeof query.value === 'string' ? query.value : source.slice(selector.length).trim();
    } else {
      const tail = source.slice(selector.length);
      // Range vectors are metric expressions, not editable log queries. Ignore quoted bracket characters.
      const unquoted = tail.replace(/"(?:\\.|[^"\\])*"|`[^`]*`/gu, '');
      if (unquoted.includes('[')) return {...base,selector,filter:'',suffix:'',simpleAvailable:false};
      ({filter,suffix} = splitLoki(tail));
    }
    return {...base, selector,filter,suffix,simpleAvailable:true};
  }

  function targets(href) {
    try {
      return readEntries(href).flatMap(entry => { try { return [analyze(entry)]; } catch { return []; } });
    } catch { return []; }
  }

  function context(href, targetId) {
    const options = targets(href);
    const result = targetId ? options.find(option => option.id === targetId) : options[0];
    if (!result) throw new Error('尚无可编辑的日志查询。请选择 Loki / grep 日志数据源 和日志范围；其他数据源或未知链接格式暂不支持。');
    return result;
  }

  function expression(ctx, input) {
    if (!ctx.simpleAvailable) throw new Error('此复杂查询无法转换为简易模式，请使用高级模式。');
    const filter = compile(input,ctx.dialect);
    return ctx.dialect === 'shiplog' ? ctx.selector + filter : [ctx.selector,filter,ctx.suffix].filter(Boolean).join(' ');
  }

  function buildURL(href, input, targetId) {
    const ctx = context(href,targetId);
    const {url,state,key,query} = ctx;
    const filter = compile(input,ctx.dialect);
    query.expr = expression(ctx,input);
    if (ctx.dialect === 'shiplog') { query.queryText = ctx.selector; query.value = filter; }
    // Legacy arrays were sliced but each query object still belongs to the original JSON tree.
    url.searchParams.set(key,JSON.stringify(state));
    return url.href;
  }

  function buildAdvancedURL(href, raw, targetId) {
    if (typeof raw !== 'string' || !raw.trim()) throw new Error('请输入完整查询语句。');
    const ctx = context(href,targetId);
    ctx.query.expr = raw;
    if (ctx.dialect === 'shiplog') {
      const selector = selectorPrefix(raw.trim());
      ctx.query.queryText = selector;
      ctx.query.value = raw.trim().slice(selector.length).trim();
    }
    ctx.url.searchParams.set(ctx.key,JSON.stringify(ctx.state));
    return ctx.url.href;
  }

  function decompile(filter, dialect = 'shiplog') {
    if (!filter.trim()) return '';
    if (dialect === 'loki') {
      const parsed = splitLoki(filter);
      if (parsed.suffix) return null;
      return parsed.tokens.map(simpleTerm).join(' ');
    }
    const terms = [];
    for (const segment of splitPipes(filter)) {
      const regex = /^grep\s+-E\s+("(?:\\.|[^"\\])*")$/u.exec(segment.trim());
      if (regex) {
        let alternatives;
        try { alternatives = decodeAlternatives(JSON.parse(regex[1])); } catch { return null; }
        if (!alternatives) return null;
        terms.push(simpleTerm({alternatives})); continue;
      }
      const match = /^grep\s+(-v\s+)?(.+)$/u.exec(segment.trim());
      if (!match) return null;
      let word = match[2];
      if (word.startsWith('"')) {
        try { word = JSON.parse(word); } catch { return null; }
        if (typeof word !== 'string') return null;
      } else if (/\s/u.test(word)) return null;
      const term = simpleWord(word);
      terms.push((match[1] ? 'NOT ' : '') + term);
    }
    const input = terms.join(' ');
    try { compile(input); return input; } catch { return null; }
  }
  class Editor {
    constructor(href, targetId) {
      this.ctx = context(href,targetId);
      this.sourceRaw = this.ctx.raw;
      this.sourceDatasource = JSON.stringify(this.ctx.query.datasource || this.ctx.datasource);
      this.sourceURL = href;
      this.raw = this.ctx.raw;
      let input = this.ctx.simpleAvailable ? decompile(this.ctx.filter,this.ctx.dialect) : null;
      try { if (input !== null) compile(input,this.ctx.dialect); } catch { input = null; }
      this.input = input || '';
      this.mode = input === null || this.ctx.suffix ? 'advanced' : 'simple';
    }
    switchMode(mode) {
      if (mode === this.mode) return;
      if (this.searchError) throw new Error(this.searchError);
      if (mode === 'advanced') {
        this.raw = expression(this.ctx,this.input);
      } else if (mode === 'simple') {
        const href = buildAdvancedURL(this.ctx.url.href,this.raw,this.ctx.id);
        const ctx = context(href,this.ctx.id);
        const input = ctx.simpleAvailable ? decompile(ctx.filter,ctx.dialect) : null;
        if (input === null) throw new Error('此查询无法无损转换为简易模式，已保留高级原文。');
        try { compile(input,ctx.dialect); }
        catch { throw new Error('此查询无法无损转换为简易模式，已保留高级原文。'); }
        this.ctx = ctx;
        this.input = input;
      } else throw new Error('未知模式。');
      this.mode = mode;
    }
    getSearchText() {
      const selector = this.ctx.selector;
      return selector && this.raw.startsWith(selector) ? this.raw.slice(selector.length).trimStart() : this.raw;
    }
    setSearchText(text) {
      const selector = this.ctx.selector;
      this.searchError = selector && text.trimStart().startsWith('{') ? '环境参数请在 Grafana 原位置修改，此处只填写检索条件。' : '';
      this.raw = selector ? selector + (this.ctx.dialect === 'loki' && text.trim() ? ' ' : '') + text : text;
    }
    getExpression() {
      if (this.searchError) throw new Error(this.searchError);
      if (this.mode === 'simple') return expression(this.ctx,this.input);
      if (!this.raw.trim()) throw new Error('请输入完整查询语句。');
      return this.raw;
    }
    getURL(href = this.sourceURL) {
      const current = context(href,this.ctx.id);
      if (current.raw !== this.sourceRaw || JSON.stringify(current.query.datasource || current.datasource) !== this.sourceDatasource) {
        throw new Error('原页面查询或数据源已变化，请重新读取当前查询；草稿已保留。');
      }
      return buildAdvancedURL(href,this.getExpression(),this.ctx.id);
    }
  }
  const api = { appendKeyword, removeKeyword, setDialectChoice, compile, parseTerms, highlightParts, context, buildURL, buildAdvancedURL, decompile, isExploreURL, targets, expression, Editor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShiplogSearch = api;
})(globalThis);
