(() => {
  'use strict';
  const Q = globalThis.ShiplogSearch;
  const I = globalThis.EasyGrafanaInline;
  const H = globalThis.EasyGrafanaHistory;
  const dialectStoragePrefix = 'easygrafana.dialect.v1.';
  let mounted = null;
  let wasActive = false;
  let detectionURL = '';
  let knownQuery = false;

  function recognizedPage() {
    if (!Q.isExploreURL(location.href)) return false;
    if (detectionURL !== location.href) {
      detectionURL = location.href;
      knownQuery = Q.targets(location.href).length > 0;
    }
    if (knownQuery) return true;
    const brand = document.querySelector('meta[name="application-name"],meta[name="generator"]')?.content || '';
    return /grafana|shiplog/iu.test(document.title + ' ' + brand);
  }

  function mount() {
    if (document.getElementById('easygrafana-extension')) return null;
    const host = document.createElement('div');
    host.id = 'easygrafana-extension';
    host.style.cssText = 'display:block;width:100%;min-width:0;flex:1 1 auto;';
    const shadow = host.attachShadow({mode:'open'});
    // Static markup only; all page/query values use textContent or value.
    shadow.innerHTML = `
      <style>
        :host{--bg:#fff;--fg:#24292f;--border:#c9d0d8;--muted:#657080;--accent:#2375d7;color-scheme:light}
        :host([data-dark]){--bg:#0b0c0e;--fg:#c7d0d9;--border:#343b43;--muted:#98a2ad;--accent:#6eb4ff;color-scheme:dark}
        *{box-sizing:border-box}[hidden]{display:none!important}
        .shell{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;color:var(--fg)}
        button,input,textarea,select{font:inherit;color:inherit}
        button{cursor:pointer;background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:5px 10px}
        button:disabled{opacity:.45;cursor:not-allowed}
        button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
        .panel{width:100%;background:transparent}
        header{display:flex;align-items:center;gap:8px;margin-bottom:5px}
        #dialectChoice{width:auto;max-width:220px;padding:2px 6px;font-size:11px}#dialectReason{font-size:11px;color:var(--muted)}h2{font-size:11px;margin:0;font-weight:650;color:var(--muted)}.subtitle,.mark,.close,.launcher{display:none}
        form{display:grid;grid-template-columns:auto minmax(160px,1fr) auto;gap:5px 8px;align-items:start}
        .modes{display:flex;grid-column:1;grid-row:1}.mode{white-space:nowrap;height:34px;border-radius:0}
        .mode:first-child{border-radius:3px 0 0 3px}.mode:last-child{border-radius:0 3px 3px 0;border-left:0}
        .mode[aria-pressed="true"]{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--bg))}
        #simpleFields{position:relative}.history-toggle{position:absolute;right:1px;top:1px;height:32px;border:0}.history-menu{position:absolute;top:36px;left:0;right:0;z-index:1000;background:var(--bg);border:1px solid var(--border);box-shadow:0 6px 20px #0003;max-height:260px;overflow:auto;padding:4px}.history-menu button{display:block;width:100%;text-align:left;border:0;overflow-wrap:anywhere}.history-menu button[aria-selected="true"],.history-menu button:hover{background:color-mix(in srgb,var(--accent) 15%,var(--bg))}.history-menu small{display:block;color:var(--muted)}#keywords{padding-right:36px}#historyStatus{font-size:11px;color:var(--muted)}#simpleFields,#advancedFields{grid-column:2;grid-row:1;min-width:0}
        label{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
        input,textarea,select{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:6px 9px}
        input{height:34px}textarea{min-height:68px;resize:vertical;font:12px/1.6 ui-monospace,monospace}
        input[aria-invalid="true"],textarea[aria-invalid="true"]{border-color:#e45a61}
        .hint{font-size:11px;color:var(--muted);margin:4px 0 0}.hint br{display:none}
        .context,.preview-label{display:none}#preview{display:none}
        .actions{grid-column:3;grid-row:1;display:flex;gap:5px}.primary{height:34px;background:#216fc1;border-color:#216fc1;color:white;white-space:nowrap}
        #copy{display:none}.status{grid-column:2 / -1;font-size:11px;color:var(--muted);margin:0}.status:empty{display:none}.error{color:#ed6c75}
        #target{grid-column:1 / -1;font-size:12px}
        details{grid-column:1 / -1;font-size:11px;color:var(--muted)}summary{cursor:pointer}details p{overflow-wrap:anywhere;margin:5px 0}
        pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 ui-monospace,monospace;color:var(--fg)}
        .keyword-wrap{position:relative;height:34px;background:var(--bg);border-radius:3px}
        #keywords{height:34px;position:relative;z-index:1;background:transparent;font:13px/20px ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-ligatures:none;letter-spacing:normal;padding-top:6px;padding-bottom:6px}
        .keyword-mirror{position:absolute;inset:7px 37px 7px 10px;overflow:hidden;pointer-events:none;font:13px/20px ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-ligatures:none;letter-spacing:normal;color:transparent;white-space:pre}
        #keywordPaint{display:block;width:max-content}
        .word-highlight{border-radius:4px;background:color-mix(in srgb,var(--accent) 23%,var(--bg));color:transparent}
        .word-highlight.exclude{background:color-mix(in srgb,#d88735 28%,var(--bg))}
        .history-toggle{z-index:2;background:var(--bg)}
        #keywordDeletes{position:absolute;inset:1px 37px auto 10px;height:14px;overflow:hidden;pointer-events:none;z-index:3}
        #keywordDeletes button{position:absolute;top:0;width:13px;height:13px;padding:0;border:0;border-radius:4px;font-size:12px;line-height:13px;color:var(--accent);background:color-mix(in srgb,var(--accent) 20%,var(--bg));pointer-events:auto}
        #keywordDeletes button:hover{background:var(--accent);color:var(--bg)}
        @media(max-width:650px){form{grid-template-columns:1fr auto}.modes{grid-column:1 / -1;grid-row:1}#simpleFields,#advancedFields{grid-column:1;grid-row:2}.actions{grid-column:2;grid-row:2}.status{grid-column:1 / -1}}
      </style>
      <div class="shell">
        <section class="panel" id="panel" aria-labelledby="heading" hidden>
          <header><div class="mark" aria-hidden="true">⌕</div><div><h2 id="heading">EasyGrafana</h2><div class="subtitle">自动识别 · 保留原查询范围</div></div><select id="dialectChoice" aria-label="查询语法"><option value="auto">查询语法：自动识别</option><option value="shiplog">grep 日志数据源</option><option value="loki">Loki（LogQL）</option></select><span id="dialectReason"></span></header>
          <form>
            <div class="modes" role="group" aria-label="查询模式"><button class="mode" id="simpleMode" type="button" aria-pressed="true">简易模式</button><button class="mode" id="advancedMode" type="button" aria-pressed="false">高级模式</button></div>
            <select id="target" aria-label="要搜索的查询" hidden></select>
            <div class="context"><strong id="scope">正在识别查询…</strong><div class="time" id="time"></div></div>
            <div id="simpleFields"><label for="keywords">包含 / 排除关键词</label><div class="keyword-wrap"><div class="keyword-mirror" aria-hidden="true"><span id="keywordPaint"></span></div><div id="keywordDeletes" aria-label="删除关键词"></div><input id="keywords" role="combobox" aria-autocomplete="list" aria-controls="historyOptions" aria-expanded="false" autocomplete="off" spellcheck="false" placeholder='请求ID NOT (debug timeout)' aria-describedby="simpleHint status"></div><button id="historyToggle" class="history-toggle" type="button" aria-label="查看语法提示和常用检索">▾</button><div id="historyMenu" class="history-menu" hidden><div id="historyOptions" role="listbox" aria-label="语法提示和常用检索"></div><small id="historyEmpty">暂无匹配的常用检索</small><button id="clearHistory" type="button">清空当前站点记录</button></div><p class="hint" id="simpleHint">一个色块 = 一个检索词 · 双引号合并短语 · <code>(11 OR 22)</code> 任意匹配 · <code>NOT (11 22)</code> 排除 · Enter 搜索</p></div>
            <div id="advancedFields" hidden><label for="raw">原始检索条件</label><textarea id="raw" spellcheck="false" aria-describedby="advancedHint status" placeholder='grep 请求ID | grep -v debug'></textarea><p class="hint" id="advancedHint">只编辑检索条件，环境沿用页面设置 · Enter 换行 · Ctrl / ⌘ + Enter 搜索</p></div>
            <div class="preview-label">将执行的查询</div><pre id="preview" aria-label="查询预览"></pre>
            <p class="status" id="status" role="status" aria-live="polite"></p>
            <div class="actions"><button id="copyLogs" type="button" title="复制当前页面已渲染的日志正文；不含未加载的日志">复制页面日志</button><button class="secondary" id="copy" type="button">复制查询</button><button class="primary" id="search" type="submit">搜索 ↵</button></div>
            <details><summary>查询预览与说明</summary><pre id="inlinePreview"></pre><p id="selector"></p><p id="pipeline"></p><p>自动识别 Loki / grep 日志数据源；查询范围以地址栏为准。多查询时仅修改当前选中项。复杂表达式无法转换时保留高级原文。</p><p id="historyStatus"></p><button class="secondary" id="restore" type="button">重新读取当前查询</button></details>
          </form>
        </section>

      </div>`;
    // Placement happens only after a real query editor has been found.
    const $ = selector => shadow.querySelector(selector);
    const input = $('#keywords');
    const raw = $('#raw');
    const panel = $('#panel');
    const drafts = new Map();
    let targetId = '';
    let previousURL = '';
    let editor = null;
    let native = null;
    let originalDisplay = '';
    let originalPriority = '';
    let expectedNative = null;
    let expectedRaw = null;
    let fallback = false;
    let historyItems = [];
    let historyDialect = '';
    let historyIndex = -1;
    let historyVisible = [];
    let bypassRun = false;
    let submitting = false;
    async function historyRequest(action,text,dialect) {
      if (globalThis.EasyGrafanaDemoHistory) return globalThis.EasyGrafanaDemoHistory(action,text,dialect);
      const result = await chrome.runtime.sendMessage({type:'easygrafana-history',action,text,dialect});
      if (!result || result.error) throw new Error(result?.error || '常用检索记录不可用。');
      return result.items;
    }
    function closeHistory() {
      $('#historyMenu').hidden = true;
      input.setAttribute('aria-expanded','false');
      input.removeAttribute('aria-activedescendant');
      historyIndex = -1;
    }
    function renderHistory(all = false) {
      historyVisible = H.suggest(historyItems.filter(item => {
        try { Q.compile(item.text,historyDialect); return true; } catch { return false; }
      }),all ? '' : input.value).concat(H.syntax);
      historyIndex = -1; input.removeAttribute('aria-activedescendant');
      $('#historyOptions').replaceChildren(...historyVisible.map((item,index) => {
        const option = document.createElement('button'); option.type = 'button';
        option.id = 'history-option-'+index; option.setAttribute('role','option');
        option.setAttribute('aria-selected','false');
        const text = document.createElement('span'); text.textContent = item.text;
        const count = document.createElement('small'); count.textContent = item.description ? item.description + ' · 点击追加示例' : '常用检索 · 使用 '+item.count+' 次 · 点击替换输入';
        option.append(text,count);
        option.addEventListener('click',() => chooseHistory(index));
        return option;
      }));
      $('#historyEmpty').hidden = historyVisible.length > 0;
      $('#historyMenu').hidden = false; input.setAttribute('aria-expanded','true');
    }
    function chooseHistory(index) {
      const item = historyVisible[index];
      if (!item || !editor) return;
      const completion = item.sample ? H.insertSyntax(input.value,item) : null;
      input.value = completion ? completion.text : item.text;
      editor.input = input.value; editor.dirty = true;
      refresh(); syncNative(); input.focus(); closeHistory();
      if (completion) input.setSelectionRange(completion.selectionStart,completion.selectionEnd);
      requestAnimationFrame(syncHighlightScroll);
    }
    async function loadHistory() {
      if (!editor) return;
      const dialect = editor.ctx.dialect;
      if (dialect === 'raw' || historyDialect === dialect) return;
      historyDialect = dialect; historyItems = []; closeHistory();
      try {
        const items = await historyRequest('get','',dialect);
        if (historyDialect === dialect) historyItems = items;
      } catch { $('#historyStatus').textContent = '常用检索记录不可用；搜索仍可正常使用。'; }
    }
    async function recordHistory() {
      if (!editor || editor.mode !== 'simple' || !editor.input.trim()) return;
      const dialect = editor.ctx.dialect, text = editor.input;
      try {
        const items = await historyRequest('record',text,dialect);
        if (historyDialect === dialect) historyItems = items;
        $('#historyStatus').textContent = '';
      } catch { $('#historyStatus').textContent = '此次记录保存失败，查询仍会执行。'; }
    }
    $('#historyToggle').addEventListener('click',() => {
      if ($('#historyMenu').hidden) renderHistory(true); else closeHistory();
    });
    $('#clearHistory').addEventListener('click',async () => {
      const dialect = historyDialect;
      try {
        await historyRequest('clear','',dialect);
        if (historyDialect === dialect) { historyItems = []; renderHistory(true); }
      } catch { $('#historyStatus').textContent = '清空失败，请重试。'; }
    });
    input.addEventListener('focus',() => { renderHistory(); });
    input.addEventListener('input',() => renderHistory());
    shadow.addEventListener('focusout',() => {
      setTimeout(() => { if (!$('#simpleFields').contains(shadow.activeElement)) closeHistory(); },0);
    });
    document.addEventListener('pointerdown',event => { if (!event.composedPath().includes(host)) closeHistory(); });

    function restoreNative() {
      if (native) {
        if (originalDisplay) native.style.setProperty('display',originalDisplay,originalPriority);
        else native.style.removeProperty('display');
      }
      native = null; expectedNative = null; expectedRaw = null;
    }
    function place() {
      if (!editor) { restoreNative(); host.remove(); return; }
      if (native && (!native.isConnected || (native.value !== expectedNative && native.value !== I.nativeValue(editor.ctx,editor.sourceRaw)))) {
        if (native.isConnected) { editor.stale = true; message('原输入框已变化，请重新读取当前查询。',true); }
        restoreNative(); host.remove();
      }
      if (!native) {
        native = I.find(document,editor.ctx);
        if (!native && editor.dirty && !editor.stale) {
          try {
            const expression = editor.getExpression();
            const value = I.nativeValue(editor.ctx,expression);
            if (value !== null) native = I.find(document,{...editor.ctx,raw:expression,query:{...editor.ctx.query,value}});
          } catch {}
        }
        if (native) {
          originalDisplay = native.style.getPropertyValue('display');
          originalPriority = native.style.getPropertyPriority('display');
          expectedNative = native.value;
        }
      }
      if (native) {
        if (native.previousSibling !== host) native.before(host);
        native.style.setProperty('display','none','important');
        fallback = false;
      } else {
        // Rich editors have private models. Keep them visible and provide an inline URL-based editor.
        const anchor = document.querySelector('[aria-label="Query editor row"],.query-row,.monaco-editor');
        if (!anchor) { host.remove(); return; }
        if (anchor.previousSibling !== host) anchor.before(host); fallback = true;
      }
      const dark = document.querySelector('body.theme-dark,html.theme-dark,[data-theme="dark"]');
      host.toggleAttribute('data-dark',!!dark);
    }
    function syncNative() {
      if (!native || !editor || editor.stale) return;
      try {
        const expression = editor.getExpression();
        const value = I.nativeValue(editor.ctx,expression);
        expectedRaw = null;
        if (value !== null && I.write(native,value)) {
          expectedNative = value; expectedRaw = expression;
        }
      } catch { /* Invalid input is shown by refresh and never written to Grafana. */ }
    }
    async function run(event) {
      event?.preventDefault();
      if (submitting || refresh() === null) return;
      closeHistory();
      submitting = true;
      const submittedEditor = editor, submittedExpression = editor.getExpression();
      await recordHistory();
      submitting = false;
      if (refresh() === null) return;
      if (editor !== submittedEditor || editor.getExpression() !== submittedExpression) {
        message('保存记录期间输入发生变化，请重新搜索。',true); return;
      }
      syncNative();
      const expression = editor.getExpression();
      const scope = native?.closest('[aria-label="Explore"],.explore');
      const buttons = scope ? [...scope.querySelectorAll('button')] : [];
      const button = buttons.find(b => /^run query$/i.test(b.textContent.trim()));
      if (native && expectedRaw === expression && button) {
        editor.dirty = false;
        bypassRun = true;
        try { button.click(); } finally { bypassRun = false; }
      } else {
        try { location.assign(editor.getURL(location.href)); }
        catch (error) { message(error.message,true); }
      }
    }


    function message(text,error = false) {
      $('#status').textContent = text;
      $('#status').classList.toggle('error',error);
    }
    function renderMode() {
      $('#dialectChoice').disabled = !editor;
      $('#dialectChoice').value = editor?.ctx.dialectChoice || 'auto';
      $('#dialectReason').textContent = editor?.ctx.dialectReason || '';
      const simple = !editor || editor.mode === 'simple';
      $('#simpleMode').setAttribute('aria-pressed',String(simple));
      $('#advancedMode').setAttribute('aria-pressed',String(!simple));
      $('#advancedMode').disabled = !editor;
      $('#simpleMode').disabled = !editor || editor.ctx.dialect === 'raw';
      $('#simpleFields').hidden = !simple;
      $('#advancedFields').hidden = simple;
      $('#search').textContent = simple ? '搜索 ↵' : '执行查询';
      input.value = editor?.input || '';
      raw.value = editor?.getSearchText() || '';
      $('#advancedHint').textContent = editor?.ctx.dialect === 'raw' ? '当前数据源使用原始查询 · Ctrl / ⌘ + Enter 搜索' : '只编辑检索条件，环境沿用页面设置 · Enter 换行 · Ctrl / ⌘ + Enter 搜索';
      raw.placeholder = editor?.ctx.dialect === 'raw' ? '原始查询表达式' : editor?.ctx.dialect === 'loki' ? '|= "error" | json' : 'grep 请求ID | grep -v debug';
    }
    let activeKeyword = -1;
    function syncHighlightScroll() {
      $('#keywordPaint').style.transform = `translateX(${-input.scrollLeft}px)`;
      const base = $('#keywordDeletes').getBoundingClientRect();
      const words = [...$('#keywordPaint').querySelectorAll('.word-highlight')];
      [...$('#keywordDeletes').children].forEach((button,index) => {
        const rect = words[index]?.getBoundingClientRect();
        button.hidden = index !== activeKeyword || !rect || rect.right <= base.left || rect.left >= base.right;
        if (rect) button.style.left = `${Math.min(base.width-13,Math.max(0,rect.right-base.left-8))}px`;
      });
    }
    function renderTerms() {
      activeKeyword = -1;
      const parts = Q.highlightParts(input.value,editor?.ctx.dialect || 'shiplog');
      $('#keywordPaint').replaceChildren(...parts.map(part => {
        const span = document.createElement('span');
        span.textContent = part.text;
        if (part.kind !== 'plain') span.className = 'word-highlight' + (part.kind === 'exclude' ? ' exclude' : '');
        return span;
      }));
      let keywordIndex = 0;
      $('#keywordDeletes').replaceChildren(...parts.filter(part => part.kind !== 'plain').map(part => {
        const index = keywordIndex++, button = document.createElement('button');
        button.type = 'button'; button.textContent = '×';
        button.setAttribute('aria-label',`删除关键词 ${part.text}`); button.title = `删除 ${part.text}`;
        button.addEventListener('click',() => {
          try {
            if (!editor) return;
            input.value = Q.removeKeyword(input.value,index,editor.ctx.dialect);
            editor.input = input.value; editor.dirty = true;
            refresh(); syncNative(); input.focus(); closeHistory();
          } catch (error) { message(error.message,true); }
        });
        return button;
      }));
      syncHighlightScroll();
      requestAnimationFrame(syncHighlightScroll);
    }
    new ResizeObserver(syncHighlightScroll).observe(input);
    input.addEventListener('scroll',syncHighlightScroll);
    input.addEventListener('keyup',syncHighlightScroll);
    input.addEventListener('click',event => {
      const words = [...$('#keywordPaint').querySelectorAll('.word-highlight')];
      activeKeyword = words.findIndex(word => {
        const rect = word.getBoundingClientRect();
        return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      });
      if (activeKeyword >= 0) closeHistory();
      syncHighlightScroll();
    });
    document.addEventListener('pointerdown',event => {
      const path = event.composedPath();
      if (!path.includes(input) && !path.includes($('#keywordDeletes'))) {
        activeKeyword = -1; syncHighlightScroll();
      }
    });
    shadow.addEventListener('focusout',() => {
      setTimeout(() => {
        if (shadow.activeElement !== input && !$('#keywordDeletes').contains(shadow.activeElement)) {
          activeKeyword = -1; syncHighlightScroll();
        }
      },0);
    });
    input.addEventListener('compositionend',renderTerms);
    function refresh() {
      renderTerms();
      $('#search').disabled = $('#copy').disabled = true;
      try {
        if (!editor) throw new Error('请选择 Loki / grep 日志数据源 及日志范围；其他数据源或未知链接格式暂不支持。');
        if (editor.stale) throw new Error('原页面查询已变化，草稿已保留。请先重新读取当前查询。');
        const current = Q.context(location.href,targetId);
        $('#scope').textContent = `${current.datasource} · ${current.dialect === 'loki' ? 'Loki' : current.dialect === 'shiplog' ? 'grep' : '原始查询'}`;
        $('#time').textContent = `${current.from} → ${current.to}`;
        $('#selector').textContent = editor.ctx.selector || '高级表达式';
        $('#pipeline').textContent = editor.ctx.suffix ? `简易模式保留的高级阶段：${editor.ctx.suffix}` : '';
        const expression = editor.getExpression();
        // Validate target/schema and Shiplog selector before enabling either submit control.
        editor.getURL(location.href);
        $('#preview').textContent = expression;
        $('#inlinePreview').textContent = expression;
        input.setAttribute('aria-invalid','false');
        raw.setAttribute('aria-invalid','false');
        $('#search').disabled = $('#copy').disabled = false;
        message(fallback ? '此编辑器保留原生输入框；请使用此处搜索按钮执行。' : '');
        return expression;
      } catch (error) {
        $('#preview').textContent = editor?.mode === 'advanced' ? editor.raw : '—';
        (editor?.mode === 'advanced' ? raw : input).setAttribute('aria-invalid','true');
        message(error.message,true);
        return null;
      }
    }
    function selectDraft(force = false) {
      try {
        if (force || !drafts.has(targetId)) {
          const draft = new Q.Editor(location.href,targetId);
          draft.sourceRaw = draft.ctx.raw;
          draft.sourceDatasource = JSON.stringify(draft.ctx.query.datasource || draft.ctx.datasource);
          drafts.set(targetId,draft);
        }
        editor = drafts.get(targetId);
      } catch {
        editor = null;
        $('#scope').textContent = '等待可编辑的日志查询';
        $('#time').textContent = $('#selector').textContent = $('#pipeline').textContent = '';
      }
      renderMode(); place(); refresh(); loadHistory();
    }
    function setMode(mode) {
      if (!editor) return;
      closeHistory();
      try { editor.switchMode(mode); renderMode(); refresh(); syncNative(); }
      catch (error) { message(error.message,true); }
    }
    function open(show, focus = true) {
      panel.hidden = false;
      if (focus) (editor?.mode === 'advanced' ? raw : input).focus();
    }
    $('#simpleMode').addEventListener('click',() => setMode('simple'));
    $('#advancedMode').addEventListener('click',() => setMode('advanced'));
    input.addEventListener('input',() => { if (editor) { editor.input = input.value; editor.dirty = true; } refresh(); syncNative(); });
    raw.addEventListener('input',() => { if (editor) { editor.setSearchText(raw.value); editor.dirty = true; } refresh(); syncNative(); });
    input.addEventListener('keydown',event => {
      if ($('#historyMenu').hidden && event.key === 'ArrowDown') renderHistory(true);
      if (!$('#historyMenu').hidden && ['ArrowDown','ArrowUp','Escape','Enter'].includes(event.key) && !event.isComposing) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeHistory(); return; }
        if (event.key === 'Enter' && historyIndex >= 0) {
          event.preventDefault(); event.stopPropagation(); chooseHistory(historyIndex); return;
        }
        if (event.key.startsWith('Arrow') && historyVisible.length) {
          event.preventDefault(); event.stopPropagation();
          historyIndex = (historyIndex + (event.key === 'ArrowDown' ? 1 : -1) + historyVisible.length) % historyVisible.length;
          [...$('#historyOptions').children].forEach((el,index) => el.setAttribute('aria-selected',String(index === historyIndex)));
          input.setAttribute('aria-activedescendant','history-option-'+historyIndex);
          $('#history-option-'+historyIndex).scrollIntoView({block:'nearest'}); return;
        }
      }
      if (event.key === 'Enter') {
        event.preventDefault(); event.stopPropagation();
        if (!event.isComposing) $('form').requestSubmit();
      }
    });
    raw.addEventListener('keydown',event => {
      if (event.key === 'Enter' && !event.isComposing && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); event.stopPropagation(); $('form').requestSubmit();
      }
    });
    $('#dialectChoice').addEventListener('change',async () => {
      if (!editor) return;
      const old = editor, key = old.ctx.dialectKey, choice = $('#dialectChoice').value;
      try {
        if (old.stale) throw new Error('原页面查询已变化，请先重新读取当前查询。');
        const expression = old.mode === 'simple' ? old.getExpression() : old.raw;
        Q.setDialectChoice(key,choice);
        const next = new Q.Editor(location.href,targetId);
        if (old.dirty) {
          next.raw = expression; next.mode = 'advanced'; next.dirty = true;
          try { next.switchMode('simple'); } catch { /* Preserve complex draft verbatim. */ }
        }
        restoreNative();
        for (const [id,draft] of drafts) {
          if (draft.ctx.dialectKey !== key) continue;
          if (id !== targetId && draft.dirty) draft.stale = true;
          else drafts.delete(id);
        }
        drafts.set(targetId,next); editor = next;
        renderMode(); place(); refresh(); loadHistory();
      } catch (error) {
        Q.setDialectChoice(key,old.ctx.dialectChoice);
        editor = old; renderMode(); message(error.message,true); return;
      }
      try {
        const storageKey = dialectStoragePrefix + key;
        if (globalThis.EasyGrafanaDemoHistory) {
          if (choice === 'auto') localStorage.removeItem(storageKey); else localStorage.setItem(storageKey,choice);
        } else if (choice === 'auto') await chrome.storage.local.remove(storageKey);
        else await chrome.storage.local.set({[storageKey]:choice});
        if (editor?.ctx.dialectKey === key) message('查询语法已保存；当前查询未自动执行。');
      } catch { message('本次语法选择已生效，但未能保存；刷新后需重新选择。',true); }
    });
    $('#target').addEventListener('change',() => { restoreNative(); targetId = $('#target').value; selectDraft(); });
    $('#restore').addEventListener('click',() => { restoreNative(); selectDraft(true); });
    document.addEventListener('keydown',event => {
      if (event.altKey && event.shiftKey && event.code === 'KeyS' && host.isConnected) {
        event.preventDefault(); open(true);
      }
    });
    $('form').addEventListener('submit',run);
    // Prevent native Run Query from silently executing an invalid or unsynchronised draft.
    const guardRun = event => {
      if (bypassRun || !host.isConnected || !editor || !native) return;
      const button = event.target.closest?.('button');
      if (!button || !/^run query$/i.test(button.textContent.trim()) ||
          !native.closest('[aria-label="Explore"],.explore')?.contains(button)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      run();

    };
    document.addEventListener('click',guardRun,true);
    $('#copyLogs').addEventListener('click',async () => {
      const button = $('#copyLogs'); button.disabled = true;
      try {
        const count = await globalThis.EasyGrafanaLogCopy.copy(document);
        message(`已复制 ${count} 条页面日志正文（仅当前已渲染内容，虚拟滚动未渲染部分不包含）。`);
      } catch (error) { message(error.message,true); }
      finally { button.disabled = false; }
    });
    $('#copy').addEventListener('click',async () => {
      const expression = refresh();
      if (expression === null) return;
      try { await navigator.clipboard.writeText(expression); message('已复制完整查询。'); }
      catch { message('浏览器未允许复制，可手动选中预览文字复制。',true); }
    });
    function syncURL() {
      if (previousURL === location.href) return;
      previousURL = location.href;
      const options = Q.targets(location.href);
      for (const [id,draft] of drafts) {
        const current = options.find(option => option.id === id);
        if (!current || !draft.dirty) { drafts.delete(id); continue; }
        const datasource = JSON.stringify(current.query.datasource || current.datasource);
        if (id === targetId && current.raw === expectedRaw && datasource === draft.sourceDatasource) {
          draft.sourceRaw = current.raw; draft.sourceURL = location.href;
          draft.ctx = current;
        } else if (current.raw !== draft.sourceRaw || datasource !== draft.sourceDatasource) draft.stale = true;
      }
      if (!options.some(option => option.id === targetId)) targetId = options[0]?.id || '';
      $('#target').replaceChildren(...options.map(option => {
        const node = document.createElement('option'); node.value = option.id; node.textContent = option.label; return node;
      }));
      $('#target').value = targetId;
      $('#target').hidden = options.length <= 1;
      selectDraft();
    }
    syncURL();
    function addSelection(text, replace = false, exclude = false) {
      try {
        if (submitting) throw new Error('查询正在提交，请稍后再修改关键词。');
        syncURL();
        if (!editor || editor.stale) throw new Error('请先重新读取当前查询。');
        // Work on a copy so unsupported advanced queries and invalid selections
        // never change the original draft or its mode.
        const next = Object.assign(Object.create(Object.getPrototypeOf(editor)),editor);
        const mode = next.mode;
        if (mode === 'advanced') next.switchMode('simple');
        next.input = Q.appendKeyword(replace ? '' : next.input,text,next.ctx.dialect,exclude);
        if (mode === 'advanced') next.switchMode('advanced');
        next.getURL(location.href);
        next.dirty = true;
        editor = next; drafts.set(targetId,next);
        renderMode(); refresh(); syncNative(); closeHistory();
        void run().catch(error => message(error.message,true));
        return true;
      } catch (error) { message(error.message,true); return error.message; }
    }
    return {host,syncURL,open,place,restoreNative,addSelection};
  }

  function syncPage() {
    const active = recognizedPage();
    if (active && !mounted) mounted = mount();
    if (mounted) {
      mounted.host.style.display = active ? 'block' : 'none';
      if (!active) { mounted.restoreNative(); mounted.host.remove(); }
      if (active) {
        mounted.place();
        mounted.syncURL();
        if (!wasActive) mounted.open(true,false); // Automatic, without stealing keyboard focus.
      }
    }
    wasActive = active;
  }
  function installSelectionSearch() {
    let host, text = '', sourceURL = '';
    const diagnose = reason => mounted?.host?.setAttribute('data-selection-state',reason);
    diagnose('ready');
    const hide = event => { if (host) diagnose('hidden:' + (event?.type || 'manual')); host?.remove(); host = null; text = ''; };
    const position = rect => {
      host.style.left = `${Math.max(8,Math.min(rect.left,innerWidth-host.getBoundingClientRect().width-8))}px`;
      host.style.top = `${Math.max(8,Math.min(rect.bottom+6,innerHeight-host.getBoundingClientRect().height-8))}px`;
    };
    const ignored = 'input,textarea,[contenteditable]:not([contenteditable="false"]),#easygrafana-extension,#easygrafana-json-viewer,#easygrafana-selection-search';
    function consider(event) {
      diagnose('event');
      if (event.composedPath().some(node => node.id === 'easygrafana-selection-search')) return;
      hide();
      if (!recognizedPage() || !mounted || event.isComposing || event.composedPath().some(node => node.matches?.(ignored))) return;
      diagnose('eligible');
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;
      const parent = node => node?.nodeType === 1 ? node : node?.parentElement;
      if ([selection.anchorNode,selection.focusNode].some(node => parent(node)?.closest(ignored))) return;
      diagnose('selected');
      const value = selection.toString();
      if (!value.trim() || value.length > 2000 || /[\r\n]/u.test(value) || globalThis.EasyGrafanaJSON?.formatSelection(value) !== null) return;
      diagnose('plain-text');
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      text = value; sourceURL = location.href;
      host = document.createElement('div'); host.id = 'easygrafana-selection-search';
      host.style.cssText = 'position:fixed;z-index:2147483646;max-width:calc(100vw - 16px)';
      const shadow = host.attachShadow({mode:'open'});
      shadow.innerHTML = `<style>.actions{display:flex;gap:4px;flex-wrap:wrap}button{font:13px/20px system-ui;color:#edf4ff;background:#1d65b5;border:1px solid #579cff;border-radius:5px;padding:5px 12px;box-shadow:0 3px 12px #0006;cursor:pointer}button:focus-visible{outline:2px solid #fff}p{max-width:280px;margin:4px 0;padding:6px;background:#181b1f;color:#ffb7b7;font:12px/1.5 system-ui}</style><div class="actions"><button id="append" type="button" title="追加关键词并立即搜索">＋ 加入搜索</button><button id="replace" type="button" title="替换当前查询的全部关键词并立即搜索">替换搜索</button><button id="exclude" type="button" title="追加排除条件并立即搜索">排除搜索</button></div><p role="status" hidden></p>`;
      for (const action of ['append','replace','exclude']) {
        const button = shadow.querySelector('#' + action);
        button.addEventListener('pointerdown',e => e.preventDefault());
        button.addEventListener('click',() => {
          if (!recognizedPage() || sourceURL !== location.href) { hide(); return; }
          const result = mounted.addSelection(text,action === 'replace',action === 'exclude');
          if (result === true) { hide(); window.getSelection()?.removeAllRanges(); }
          else { const status = shadow.querySelector('p'); status.hidden = false; status.textContent = result; position(rect); }
        });
      }
      document.body.append(host);
      position(rect);
      diagnose('shown');
    }
    // Grafana log rows can stop bubbling; observe selection before row handlers.
    document.addEventListener('mouseup',consider,true);
    document.addEventListener('keyup',event => {
      if (event.key === 'Escape') hide();
      else if (event.key === 'Shift' || event.shiftKey && event.key.startsWith('Arrow')) consider(event);
    });
    document.addEventListener('pointerdown',event => {
      if (!event.composedPath().some(node => node.id === 'easygrafana-selection-search')) hide();
    });
    // Grafana and other widgets emit scroll during selection/layout updates.
    // Keep the toolbar anchored instead of treating every scroll as dismissal.
    document.addEventListener('scroll',() => {
      if (!host) return;
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.toString() !== text) { hide(); return; }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) { hide(); return; }
      position(rect);
    },true);
    window.addEventListener('resize',hide);
    setInterval(() => { if (host && (!recognizedPage() || sourceURL !== location.href || window.getSelection()?.toString() !== text)) hide({type:'selection-or-url-changed'}); },300);
  }
  async function start() {
    try {
      const stored = globalThis.EasyGrafanaDemoHistory ? Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith(dialectStoragePrefix)).map(k => [k,localStorage.getItem(k)])) : await chrome.storage.local.get(null);
      for (const [key,value] of Object.entries(stored)) {
        if (key.startsWith(dialectStoragePrefix) && ['shiplog','loki'].includes(value)) Q.setDialectChoice(key.slice(dialectStoragePrefix.length),value);
      }
    } catch { /* Storage failures must not prevent automatic recognition. */ }
    globalThis.EasyGrafanaJSON?.install(recognizedPage);
    syncPage();
    installSelectionSearch();
    window.addEventListener('popstate',syncPage);
    setInterval(syncPage,1000);
  }
  start();
})();
