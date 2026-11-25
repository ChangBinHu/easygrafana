(function(root) {
  'use strict';
  const MAX_LENGTH = 200000;
  function formatSelection(text) {
    if (typeof text !== 'string' || text.length > MAX_LENGTH) return null;
    let source = text.trim();
    try {
      // Prefer valid JSON unchanged. Decode only outer string encodings, at
      // most four layers; keep numeric tokens in source for lossless formatting.
      let valid = false;
      for (let depth = 0; depth <= 4; depth++) {
        let parsed;
        try { parsed = JSON.parse(source); }
        catch {
          if (depth === 4 || !/^[{[]/.test(source)) return null;
          source = JSON.parse('"' + source + '"').trim();
          continue;
        }
        if (parsed && typeof parsed === 'object') { valid = true; break; }
        if (typeof parsed !== 'string' || depth === 4) return null;
        source = parsed.trim();
      }
      if (!valid) return null;
      const tokens = source.match(/"(?:\\[\s\S]|[^"\\])*"|[^\s]/g);
      let level = 0, output = '';
      const newline = () => '\n' + '  '.repeat(level);
      tokens.forEach((token,index) => {
        if (token === '{' || token === '[') {
          output += token; level++;
          if (level > 100) throw new Error('Too deep');
          if (tokens[index+1] !== '}' && tokens[index+1] !== ']') output += newline();
        } else if (token === '}' || token === ']') {
          level--;
          if (tokens[index-1] !== '{' && tokens[index-1] !== '[') output += newline();
          output += token;
        } else if (token === ',') output += ',' + newline();
        else if (token === ':') output += ': ';
        else output += token;
      });
      return output;
    } catch { return null; }
  }
  function install(enabled) {
    let host, dialog, body, status, previousFocus, timer, selected = '';
    function close() {
      dialog?.close(); host?.remove(); host = null;
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
    }
    function show(text) {
      if (host) return;
      previousFocus = document.activeElement;
      host = document.createElement('div'); host.id = 'easygrafana-json-viewer';
      const shadow = host.attachShadow({mode:'open'});
      shadow.innerHTML = `<style>
        :host{color-scheme:light dark}*{box-sizing:border-box}
        dialog{width:min(850px,90vw);max-height:85vh;padding:0;border:1px solid #78838d;border-radius:8px;background:light-dark(#fff,#181b1f);color:light-dark(#24292f,#dce3eb);box-shadow:0 16px 60px #0008;font:14px/1.5 system-ui}
        dialog::backdrop{background:#0006}header{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #78838d}h2{font-size:15px;margin:0;flex:1}button{font:inherit;color:inherit;background:transparent;border:1px solid #78838d;border-radius:4px;padding:5px 12px;cursor:pointer}button:focus-visible{outline:2px solid #579cff}
        pre{margin:0;padding:16px;overflow:auto;max-height:calc(85vh - 110px);white-space:pre;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}p{margin:0;padding:4px 16px 10px;font-size:12px}
      </style><dialog aria-labelledby="jsonTitle"><header><h2 id="jsonTitle">JSON 查看 · EasyGrafana</h2><button id="copyJson" type="button">复制 JSON</button><button id="closeJson" type="button" autofocus>关闭</button></header><pre tabindex="0" aria-label="格式化 JSON"></pre><p role="status" aria-live="polite">Esc 关闭 · 仅在本地格式化</p></dialog>`;
      dialog = shadow.querySelector('dialog'); body = shadow.querySelector('pre'); status = shadow.querySelector('[role=status]');
      body.textContent = text;
      shadow.querySelector('#closeJson').addEventListener('click',close);
      dialog.addEventListener('cancel',event => { event.preventDefault(); close(); });
      shadow.querySelector('#copyJson').addEventListener('click',async () => {
        try { await navigator.clipboard.writeText(text); status.textContent = '已复制 JSON'; }
        catch { status.textContent = '复制失败，请选中内容手动复制。'; }
      });
      document.body.append(host); dialog.showModal();
    }
    function consider(event) {
      clearTimeout(timer);
      if (!enabled() || host || event.isComposing) return;
      if (event.type === 'keyup' && !event.shiftKey && !['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      if (event.composedPath().some(el => el.matches?.('input,textarea,[contenteditable="true"],#easygrafana-extension,#easygrafana-json-viewer'))) return;
      const value = window.getSelection()?.toString() || '';
      if (!value) { selected = ''; return; }
      if (value === selected) return;
      timer = setTimeout(() => {
        if (!enabled() || host || window.getSelection()?.toString() !== value) return;
        const formatted = formatSelection(value);
        if (formatted !== null) { selected = value; show(formatted); }
      },180);
    }
    document.addEventListener('mouseup',consider);
    document.addEventListener('keyup',consider);
    setInterval(() => { if (host && !enabled()) close(); },1000);
  }
  const api = {formatSelection,install};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EasyGrafanaJSON = api;
})(globalThis);
