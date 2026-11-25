(() => {
  const Q = globalThis.ShiplogSearch;
  // Demo-only storage; shipped extension uses private chrome.storage.local.
  globalThis.EasyGrafanaDemoHistory = async (action,text,dialect) => {
    const H = globalThis.EasyGrafanaHistory, key = H.key(location.origin,dialect);
    if (action === 'clear') { localStorage.removeItem(key); return []; }
    let items = JSON.parse(localStorage.getItem(key) || '[]');
    if (action === 'record') { items = H.record(items,text); localStorage.setItem(key,JSON.stringify(items)); }
    return items;
  };
  function example(name) {
    const url = new URL(location.origin + (name === 'ordinary' ? '/ordinary' : name === 'shiplog' || name === 'unknown' ? '/explore' : '/grafana/explore'));
    url.searchParams.set('sample',name);
    if (['ordinary','unknown'].includes(name)) return url;
    url.searchParams.set('orgId','4');
    if (name === 'logsearch') {
      url.searchParams.set('left',JSON.stringify(['now-1h','now','LogSearch',{expr:'{app="sample-dashboard",cluster="cluster-prod-a|cluster-prod-b",ns="sample",timestamp=""}'}]));
    } else if (name === 'shiplog') {
      const selector = '{app="sample-service",cluster="cluster-test",ns="sample-test",timestamp=""}';
      url.searchParams.set('left',JSON.stringify(['now-1h','now','LogSearchShip',{queryText:selector,expr:selector+'grep request123 | grep ProcessRequest',value:'grep request123 | grep ProcessRequest',refId:'A'}]));
    } else {
      const query = {refId:'A',datasource:{uid:'demo-loki',type:'loki'},expr:name === 'advanced' ? 'sum by (app) (rate({app="api"} |= "error" [5m]))' : '{app="api"} |= "request123"',editorMode:'code',maxLines:1000};
      const pane = {datasource:'demo-loki',queries:[query],range:{from:'now-15m',to:'now'}};
      if (name === 'object') url.searchParams.set('left',JSON.stringify(pane));
      else {
        url.searchParams.set('schemaVersion','1');
        url.searchParams.set('panes',JSON.stringify({alpha:pane,beta:{...pane,queries:[{...query,refId:'B',expr:'{app="worker"} |= "job"'}]}}));
      }
    }
    return url;
  }
  function render() {
    const url = new URL(location.href);
    const name = url.searchParams.get('sample') || 'shiplog';
    document.title = ['ordinary','unknown'].includes(name) ? '普通业务页面 · 本地演示' : 'Grafana Explore · EasyGrafana 演示';
    document.querySelector('#scene').textContent = '当前场景：' + name;
    const queries = Q.targets(url.href);
    document.querySelector('#query').textContent = queries.length ? queries.map(q => q.label+'\n'+q.raw).join('\n\n') : '普通页面不应出现 EasyGrafana 搜索框。';
    const rows = document.querySelector('#nativeRows');
    rows.replaceChildren(...queries.map(q => {
      const row = document.createElement('div'); row.className = 'query-row'; row.setAttribute('aria-label','Query editor row');
      const area = document.createElement('textarea'); area.value = q.dialect === 'shiplog' ? (q.query.value ?? q.filter) : q.raw;
      area.setAttribute('aria-label','Grafana 原始查询');
      area.addEventListener('input',() => { row.dataset.draft = area.value; });
      row.append(area); return row;
    }));
    document.querySelector('#range').textContent = queries.length ? `${queries[0].from} → ${queries[0].to} · orgId=${url.searchParams.get('orgId')}` : '';
  }
  const initial = new URL(location.href);
  if (!initial.searchParams.has('left') && !initial.searchParams.has('panes') && !['ordinary','unknown'].includes(initial.searchParams.get('sample'))) history.replaceState(null,'',example(initial.searchParams.get('sample') || 'shiplog'));
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click',() => {
    history.pushState(null,'',example(button.dataset.demo)); render();
    // Deliberately no custom event: the extension must observe native SPA URL changes itself.
  }));
  document.querySelector('#run').addEventListener('click',() => {
    document.querySelector('#query').textContent = '原生 Run Query 收到：\n' + [...document.querySelectorAll('#nativeRows textarea')].map(el => el.value).join('\n');
  });
  const theme = document.createElement('button'); theme.textContent = '切换深浅主题';
  theme.onclick = () => { document.body.classList.toggle('theme-dark'); document.body.style.background = document.body.classList.contains('theme-dark') ? '#141619' : ''; };
  document.querySelector('nav').append(theme);
  window.addEventListener('popstate',render);
  render();
})();
