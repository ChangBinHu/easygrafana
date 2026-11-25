const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '../query.js');
const Q = fs.existsSync(source) ? require(source) : {};
test('public compiler API exists', () => {
  for (const name of ['compile', 'context', 'buildURL', 'decompile']) assert.equal(typeof Q[name], 'function');
});
const selector = '{app="sample-service", cluster="cluster-test", ns="sample-test",timestamp=""}';
function fixture() {
  const url = new URL('https://logs.example.com/explore?orgId=4&right=unchanged#anchor');
  url.searchParams.set('left', JSON.stringify(['now-1h', 'now', 'LogSearchShip', {
    queryText: selector, expr: selector + 'grep old', value: 'grep old', refId: 'A',
  }, { expr: 'keep second query' }]));
  return url;
}
test('AND / exclude produces the supplied Shiplog grep dialect', () => {
  assert.equal(Q.compile('exampleRequestId ProcessRequest NOT debug'), 'grep exampleRequestId | grep ProcessRequest | grep -v debug');
});
test('quoted phrases and unicode', () => {
  assert.equal(Q.compile('"request failed" NOT "debug mode" 退款'), 'grep "request failed" | grep -v "debug mode" | grep "退款"');
});
test('whitespace normalizes and empty means remove filters', () => {
  assert.equal(Q.compile('  id\tmethod  '), 'grep id | grep method');
  assert.equal(Q.compile('   '), '');
});
test('malformed input does not silently issue a different search', () => {
  for (const text of ['"unfinished', '-', '""', 'foo"bar"', '"foo"bar', 'a | grep b', 'a\nb', 'a;pwd', '`id`', '$(id)', 'a > b']) {
    assert.throws(() => Q.compile(text), Error, text);
  }
});
test('option-like words are rejected instead of becoming grep flags', () => {
  assert.throws(() => Q.compile('--help'));
  assert.throws(() => Q.compile('"-n"'));
});
test('preserves time, datasource, metadata, second query and unrelated URL state', () => {
  const original = fixture();
  const updated = new URL(Q.buildURL(original.href, 'id ProcessRequest'));
  const state = JSON.parse(updated.searchParams.get('left'));
  assert.deepEqual(state.slice(0, 3), ['now-1h', 'now', 'LogSearchShip']);
  assert.equal(state[3].queryText, selector);
  assert.equal(state[3].expr, selector + 'grep id | grep ProcessRequest');
  assert.equal(state[3].value, 'grep id | grep ProcessRequest');
  assert.equal(state[3].refId, 'A');
  assert.deepEqual(state[4], { expr: 'keep second query' });
  assert.equal(updated.searchParams.get('orgId'), '4');
  assert.equal(updated.searchParams.get('right'), 'unchanged');
  assert.equal(updated.hash, '#anchor');
  assert.equal(JSON.parse(original.searchParams.get('left'))[3].value, 'grep old');
});
test('read context, with safe expr-only fallback including braces in labels', () => {
  assert.equal(Q.context(fixture().href).selector, selector);
  const url = fixture();
  const state = JSON.parse(url.searchParams.get('left'));
  state[3] = { expr: '{app="a}b",ns="test"}grep old' };
  url.searchParams.set('left', JSON.stringify(state));
  assert.equal(Q.context(url.href).selector, '{app="a}b",ns="test"}');
});
test('unknown schema, non-selector queryText and invalid JSON are blocked', () => {
  for (const left of ['', '{}', 'oops', JSON.stringify(['now-1h', 'now', 'LogSearchShip', {queryText:'{app="x"}grep old'}]), JSON.stringify(['now-1h','now','LogSearchShip',{queryText:'{}'}])]) {
    const url = fixture(); url.searchParams.set('left', left);
    assert.throws(() => Q.context(url.href));
  }
});
test('clear filters keeps selector and all other state', () => {
  const updated = new URL(Q.buildURL(fixture().href, ''));
  const q = JSON.parse(updated.searchParams.get('left'))[3];
  assert.equal(q.expr, selector); assert.equal(q.value, '');
});
test('existing supported filters restore to simplified text; unknown filters stay unsupported', () => {
  assert.equal(Q.decompile('grep id| grep ProcessRequest | grep -v debug'), 'id ProcessRequest NOT debug');
  assert.equal(Q.decompile('grep "request failed"'), '"request failed"');
  assert.equal(Q.decompile(''), '');
  assert.equal(Q.decompile('grep -E error.*'), null);
});

function modern(format = 'panes', host = 'https://monitor.example.com/grafana/explore') {
  const url = new URL(host);
  const pane = {datasource:'uid-logs', range:{from:'now-15m',to:'now'}, queries:[
    {refId:'A', datasource:{uid:'uid-logs',type:'loki'}, expr:'{app="api"} |= "old" | json | status >= 500', editorMode:'code', maxLines:500},
    {refId:'B', datasource:{uid:'uid-metrics',type:'prometheus'}, expr:'up'},
  ]};
  url.searchParams.set('orgId','9');
  if (format === 'panes') {
    url.searchParams.set('schemaVersion','1');
    url.searchParams.set('panes',JSON.stringify({xyz:pane,other:{...pane,queries:[{...pane.queries[0],refId:'C',expr:'{app="worker"}'}]}}));
  } else url.searchParams.set('left',JSON.stringify(pane));
  return url;
}
test('Loki uses literal line filters and permits safely quoted punctuation', () => {
  assert.equal(Q.compile('id "request failed" NOT debug', 'loki'), '|= "id" |= "request failed" != "debug"');
  assert.equal(Q.compile('"a|b" NOT "-flag"', 'loki'), '|= "a|b" != "-flag"');
});
test('new panes, arbitrary domains and Grafana subpaths are recognized', () => {
  for (const host of ['https://other.example.com/explore','http://192.0.2.1:3000/grafana/explore/']) {
    assert.equal(Q.isExploreURL(host),true);
    assert.equal(Q.targets(modern('panes',host).href).length,3);
    assert.equal(Q.context(modern('panes',host).href).dialect,'loki');
  }
  assert.equal(Q.isExploreURL('https://example.com/explore-more'),false);
  assert.equal(Q.isExploreURL('https://example.com/d/abc'),false);
  assert.equal(Q.isExploreURL('file:///explore'),false);
});
test('new panes preserve other queries, panes, metadata and advanced log pipeline', () => {
  const url = modern();
  const before = JSON.parse(url.searchParams.get('panes'));
  const updated = new URL(Q.buildURL(url.href,'id NOT debug'));
  const after = JSON.parse(updated.searchParams.get('panes'));
  assert.equal(after.xyz.queries[0].expr,'{app="api"} |= "id" != "debug" | json | status >= 500');
  assert.deepEqual(after.xyz.queries[1],before.xyz.queries[1]);
  assert.deepEqual(after.other,before.other);
  assert.deepEqual(after.xyz.range,before.xyz.range);
  assert.equal(after.xyz.queries[0].maxLines,500);
  assert.equal(after.xyz.queries[0].queryText,undefined);
  assert.equal(updated.searchParams.get('orgId'),'9');
  assert.equal(updated.searchParams.get('schemaVersion'),'1');
});
test('explicit target edits only selected pane/query', () => {
  const url = modern();
  const options = Q.targets(url.href);
  const after = JSON.parse(new URL(Q.buildURL(url.href,'worker',options.find(option => option.paneId === 'other').id)).searchParams.get('panes'));
  assert.equal(after.other.queries[0].expr,'{app="worker"} |= "worker"');
  assert.equal(after.xyz.queries[0].expr,'{app="api"} |= "old" | json | status >= 500');
  assert.throws(() => Q.buildURL(url.href,'x','nonexistent'));
});
test('object left and right states and legacy Loki arrays', () => {
  const url = modern('left');
  url.searchParams.set('right',url.searchParams.get('left'));
  assert.equal(Q.targets(url.href).length,4);
  const after = new URL(Q.buildURL(url.href,'new'));
  assert.equal(JSON.parse(after.searchParams.get('left')).queries[0].expr,'{app="api"} |= "new" | json | status >= 500');
  assert.equal(after.searchParams.get('right'),url.searchParams.get('right'));
  url.searchParams.delete('right');
  url.searchParams.set('left',JSON.stringify(['now-1h','now','Loki',{expr:'{app="x"} |= "old"'}]));
  assert.equal(Q.context(url.href).dialect,'loki');
  assert.equal(JSON.parse(new URL(Q.buildURL(url.href,'new')).searchParams.get('left'))[3].expr,'{app="x"} |= "new"');
});
test('unknown datasource and future schema are not rewritten; metrics require advanced mode', () => {
  for (const query of [
    {datasource:{type:'prometheus'},expr:'{app="x"}'},
    {datasource:{type:'loki'},expr:'rate({app="x"}[5m])'},
    {datasource:{type:'loki'},expr:'{app="x"}[5m]'},
    {datasource:{type:'elasticsearch'},expr:'{app="x"}'},
    {datasource:{uid:'unknown'},expr:'{app="x"}'},
  ]) {
    const url = new URL('https://g.example/explore');
    url.searchParams.set('left',JSON.stringify({range:{from:'now-1h',to:'now'},queries:[query]}));
    if (query.datasource.type === 'loki') assert.equal(Q.context(url.href).simpleAvailable,false);
    else { assert.equal(Q.context(url.href).dialect,'raw'); assert.equal(new Q.Editor(url.href).mode,'advanced'); }
    assert.throws(() => Q.buildURL(url.href,'new'));
  }
  const url = modern();url.searchParams.set('schemaVersion','99');
  assert.throws(() => Q.buildURL(url.href,'new'));
});
test('advanced Loki mode preserves raw expression and only changes selected query', () => {
  const url = modern();
  const raw = 'sum by (app) (rate({app="api"} |= "error" [5m]))';
  const updated = new URL(Q.buildAdvancedURL(url.href,raw));
  assert.equal(JSON.parse(updated.searchParams.get('panes')).xyz.queries[0].expr,raw);
  assert.equal(Q.context(updated.href).simpleAvailable,false);
  assert.throws(() => Q.buildAdvancedURL(url.href,'  '));
});
test('advanced Shiplog mode updates all native editor fields', () => {
  const raw = selector + 'grep request | grep -v debug | tail -100';
  const updated = new URL(Q.buildAdvancedURL(fixture().href,raw));
  const q = JSON.parse(updated.searchParams.get('left'))[3];
  assert.equal(q.expr,raw);assert.equal(q.queryText,selector);assert.equal(q.value,'grep request | grep -v debug | tail -100');
});
test('mode conversion can change selector and preserve advanced Loki stages', () => {
  const url = modern();
  const raw = '{app="changed"} |= "request failed" | json | level="error"';
  const advanced = Q.buildAdvancedURL(url.href,raw);
  assert.equal(Q.decompile(Q.context(advanced).filter,'loki'),'"request failed"');
  assert.equal(Q.expression(Q.context(advanced),'id NOT debug'),'{app="changed"} |= "id" != "debug" | json | level="error"');
});
test('Loki roundtrip preserves advanced expressions and backtick strings', () => {
  const url = modern('left');
  const pane = JSON.parse(url.searchParams.get('left'));
  pane.queries[0].expr = '{app="x"} |= `request failed` != "debug" | line_format "{{.message}}"';
  url.searchParams.set('left',JSON.stringify(pane));
  const ctx = Q.context(url.href);
  assert.equal(Q.decompile(ctx.filter,'loki'),'"request failed" NOT debug');
  assert.equal(ctx.suffix,'| line_format "{{.message}}"');
  const updated = Q.buildURL(url.href,'x');
  assert.equal(Q.decompile(Q.context(updated).filter,'loki'),'x');
});
test('Loki OR filters are preserved intact instead of partially deleting operands', () => {
  const url = modern('left');
  const pane = JSON.parse(url.searchParams.get('left'));
  pane.queries[0].expr = '{app="x"} |= "a" or "b"';
  url.searchParams.set('left',JSON.stringify(pane));
  const updated = new URL(Q.buildURL(url.href,'id'));
  assert.equal(JSON.parse(updated.searchParams.get('left')).queries[0].expr,'{app="x"} |= "id" |= "a" or "b"');
});
test('mode switches retain simple edits and advanced selector/pipeline edits', () => {
  const editor = new Q.Editor(modern().href);
  assert.equal(editor.mode,'advanced');
  editor.switchMode('simple');
  editor.input = 'new NOT debug';
  editor.switchMode('advanced');
  assert.equal(editor.raw,'{app="api"} |= "new" != "debug" | json | status >= 500');
  editor.raw = '{app="changed"} |= "request failed" | json';
  editor.switchMode('simple');
  assert.equal(editor.input,'"request failed"');
  editor.input = 'request';
  assert.equal(editor.getExpression(),'{app="changed"} |= "request" | json');
});
test('simple queries default to simple mode; valid but unrepresentable empty filters stay advanced', () => {
  assert.equal(new Q.Editor(fixture().href).mode,'simple');
  const url = Q.buildAdvancedURL(modern().href,'{app="api"} |= ""');
  const editor = new Q.Editor(url);
  assert.equal(editor.mode,'advanced');
  assert.throws(() => editor.switchMode('simple'));
  assert.equal(editor.getExpression(),'{app="api"} |= ""');
});
test('non-convertible advanced query remains intact when simple mode is requested', () => {
  const editor = new Q.Editor(modern().href);
  editor.switchMode('advanced');
  editor.raw = 'sum(rate({app="api"}[5m]))';
  assert.throws(() => editor.switchMode('simple'));
  assert.equal(editor.mode,'advanced');
  assert.equal(editor.raw,'sum(rate({app="api"}[5m]))');
  assert.equal(editor.getExpression(),editor.raw);
});
test('advanced Shiplog stages start in advanced mode and cannot be dropped by a toggle', () => {
  const url = Q.buildAdvancedURL(fixture().href,selector+'grep id | tail -100');
  const editor = new Q.Editor(url);
  assert.equal(editor.mode,'advanced');
  assert.throws(() => editor.switchMode('simple'));
  assert.equal(editor.raw,selector+'grep id | tail -100');
});
test('submission rejects a changed source query but preserves a new time range', () => {
  const url = modern();
  const editor = new Q.Editor(url.href);
  editor.raw = '{app="api"} |= "draft"';
  const changed = Q.buildAdvancedURL(url.href,'{app="other"}');
  assert.throws(() => editor.getURL(changed),/变化/u);
  const state = JSON.parse(url.searchParams.get('panes'));
  state.xyz.range.from = 'now-6h';
  url.searchParams.set('panes',JSON.stringify(state));
  const updated = new URL(editor.getURL(url.href));
  assert.equal(JSON.parse(updated.searchParams.get('panes')).xyz.range.from,'now-6h');
});

test('NOT single term, groups and fullwidth brackets compile to exclusions', () => {
  assert.equal(Q.compile('trace NOT debug NOT (11 22)'), 'grep trace | grep -v debug | grep -v 11 | grep -v 22');
  assert.equal(Q.compile('trace NOT （11 22）','loki'), '|= "trace" != "11" != "22"');
  assert.equal(Q.compile('NOT("debug mode" error) ok NOT old'), 'grep -v "debug mode" | grep -v error | grep ok | grep -v old');
});
test('NOT errors are rejected rather than silently changing meaning', () => {
  for (const text of ['NOT', 'NOT ()', 'NOT (11', 'NOT (11))', 'NOT (NOT 11)', 'NOT (11 -22)', 'NOT -debug', 'NOT （11)']) {
    assert.throws(() => Q.compile(text), undefined, text);
  }
});
test('literal NOT is quoted through advanced/simple round trips', () => {
  assert.equal(Q.compile('"NOT" "not"'), 'grep NOT | grep not');
  for (const dialect of ['shiplog','loki']) {
    const raw = Q.compile('"NOT" "not" NOT ("request failed" 22)',dialect);
    assert.equal(Q.compile(Q.decompile(raw,dialect),dialect),raw);
  }
});


test('simple mode rejects removed minus exclusion syntax for both dialects', () => {
  for (const dialect of ['shiplog','loki']) {
    for (const input of ['-debug','id -debug','-"debug mode"','NOT (11 -22)']) {
      assert.throws(() => Q.compile(input,dialect),Error,input);
    }
    const raw = Q.compile('id NOT debug NOT "debug mode"',dialect);
    assert.equal(Q.decompile(raw,dialect),'id NOT debug NOT "debug mode"');
  }
});

test('visual terms distinguish separate words from one phrase and use actual exclusion semantics', () => {
  assert.equal(typeof Q.parseTerms,'function');
  assert.deepEqual(Q.parseTerms('11 22'),[{word:'11',exclude:false},{word:'22',exclude:false}]);
  assert.deepEqual(Q.parseTerms('"11 22"'),[{word:'11 22',exclude:false}]);
  assert.deepEqual(Q.parseTerms('NOT (11 "22 33")'),[{word:'11',exclude:true},{word:'22 33',exclude:true}]);
  assert.deepEqual(Q.parseTerms('"11  22"'),[{word:'11  22',exclude:false}]);
  assert.throws(()=>Q.parseTerms('"11 22'));
  assert.deepEqual(Q.parseTerms(''),[]);
});

test('OR alternatives and explicit groups compile for both data sources', () => {
  assert.equal(Q.compile('11 OR 22'),'grep -E "(11|22)"');
  assert.equal(Q.compile('trace (11 OR 22) NOT debug'),'grep trace | grep -E "(11|22)" | grep -v debug');
  assert.equal(Q.compile('trace （11 or "22 33"）','loki'),'|= "trace" |~ "(11|22 33)"');
  assert.deepEqual(Q.parseTerms('11 OR 22'),[{alternatives:['11','22'],exclude:false}]);
});
test('OR matches literal alternatives and survives mode round trips', () => {
  for (const dialect of ['shiplog','loki']) {
    for (const input of ['trace (11 OR "22 33") NOT debug','"OR" ("a.b" OR "c+d")','(a OR b) (c OR d)']) {
      const filter = Q.compile(input,dialect);
      const simple = Q.decompile(filter,dialect);
      assert.notEqual(simple,null,filter);
      assert.equal(Q.compile(simple,dialect),filter);
    }
  }
  assert.equal(Q.compile('"a.b" OR "c+d"','loki'),'|~ "(a\\.b|c\\+d)"'.replaceAll('\\','\\\\'));
});
test('incomplete OR, unsupported negation, nested and ambiguous groups are rejected', () => {
  for (const input of ['OR','a OR','OR a','a OR OR b','a OR NOT b','a b OR c','a OR b c','a OR b NOT c','(a b)','(a OR b','（a OR b)','NOT (a OR b)','((a OR b) OR c)']) {
    assert.throws(()=>Q.compile(input),Error,input);
  }
  assert.equal(Q.compile('"OR"'),'grep OR');
  assert.equal(Q.decompile('grep OR'),'"OR"');
});

test('OR regular expressions match alternatives literally, including punctuation and escaped separators', () => {
  const words = ['a.b','x+y','[tag]','a\\b','(hi)','path?'];
  const input = words.map(JSON.stringify).join(' OR ');
  const raw = Q.compile(input,'shiplog');
  const pattern = JSON.parse(raw.slice('grep -E '.length));
  const {spawnSync} = require('node:child_process');
  const lines = [...words,'axb','xxxy','tag','hi','path','neither'];
  const result = spawnSync('grep',['-E',pattern],{input:lines.join('\n')+'\n',encoding:'utf8'});
  assert.equal(result.status,0);
  assert.deepEqual(result.stdout.trimEnd().split('\n'),words);
  const loki = Q.compile('"a|b" OR "c\\\\d"','loki');
  assert.equal(Q.compile(Q.decompile(loki,'loki'),'loki'),loki);
});

test('input highlights preserve exact text positions and semantic term boundaries', () => {
  assert.equal(typeof Q.highlightParts,'function');
  const input = '11  22 "11 22" NOT (33 "44 55") (a OR b)';
  const parts = Q.highlightParts(input);
  assert.equal(parts.map(p=>p.text).join(''),input);
  assert.deepEqual(parts.filter(p=>p.kind!=='plain').map(p=>[p.text,p.kind]),[
    ['11','include'],['22','include'],['"11 22"','include'],['33','exclude'],['"44 55"','exclude'],['a','include'],['b','include']
  ]);
  assert.deepEqual(Q.highlightParts('"unfinished'),[{text:'"unfinished',kind:'plain'}]);
  assert.deepEqual(Q.highlightParts('"NOT"'),[{text:'"NOT"',kind:'include'}]);
});

test('advanced search field hides selector while submission retains environment and empty filters', () => {
  const editor = new Q.Editor(fixture().href);
  editor.switchMode('advanced');
  assert.equal(typeof editor.getSearchText,'function');
  assert.equal(editor.getSearchText(),'grep old');
  editor.setSearchText('grep request | grep -v debug');
  assert.equal(editor.getExpression(),selector+'grep request | grep -v debug');
  assert.equal(Q.context(editor.getURL()).selector,selector);
  editor.switchMode('simple');
  assert.equal(editor.input,'request NOT debug');
  editor.switchMode('advanced');
  assert.equal(editor.getSearchText(),'grep request | grep -v debug');
  editor.setSearchText('');
  assert.equal(editor.getExpression(),selector);
  editor.setSearchText('{app="other"}grep error');
  assert.throws(()=>editor.getExpression(),/环境/);
  assert.throws(()=>editor.switchMode('simple'),/环境/);
});
test('legacy LogSearch expr-only URLs load on docker log host and preserve selector', () => {
  const url = new URL('https://logs.example.com/explore?orgId=4');
  const scope = '{app="sample-dashboard",cluster="cluster-prod-a|cluster-prod-b", ns="sample", timestamp=""}';
  for (const datasource of ['LogSearch', {type:'logsearch',uid:'docker-logs'}]) {
    url.searchParams.set('left',JSON.stringify(['now-1h','now',datasource,{expr:scope}]));
    assert.equal(Q.targets(url.href).length,1);
    assert.equal(Q.context(url.href).dialect,'shiplog');
    const editor = new Q.Editor(url.href);
    assert.equal(editor.mode,'simple');
    editor.input = 'request123 NOT debug';
    const result = new URL(Q.buildURL(url.href,editor.input));
    const state = JSON.parse(result.searchParams.get('left'));
    assert.deepEqual(state[2],datasource);
    assert.equal(state[3].queryText,scope);
    assert.equal(state[3].value,'grep request123 | grep -v debug');
    assert.equal(state[3].expr,scope+state[3].value);
  }
  url.searchParams.set('left',JSON.stringify(['now-1h','now','SomeOtherLogSearch',{expr:scope}]));
  assert.equal(Q.context(url.href).dialect,'raw');
});

test('unknown datasource advanced fallback preserves query metadata and does not enable simple syntax', () => {
  const url = new URL('https://custom.example/grafana/explore');
  const query = {expr:'custom original',refId:'A',datasource:{uid:'custom',type:'custom-plugin'},other:'keep'};
  url.searchParams.set('left',JSON.stringify(['now-1h','now','Custom',query]));
  const editor = new Q.Editor(url.href);
  assert.equal(editor.mode,'advanced');
  assert.throws(()=>editor.switchMode('simple'));
  editor.setSearchText('custom replacement');
  const actual = JSON.parse(new URL(editor.getURL()).searchParams.get('left'))[3];
  assert.deepEqual(actual,{...query,expr:'custom replacement'});
});
test('LogSearchUS expr-only query enables simple mode and keeps US environment and timestamp', () => {
  const scope = '{app="sample-service",cluster="cluster-region-a|cluster-region-b", ns="sample",  timestamp="1700000000000"}';
  const url = new URL('https://logs.example.com/explore?orgId=4');
  url.searchParams.set('left',JSON.stringify(['now-1h','now','LogSearchUS',{expr:scope}]));
  const editor = new Q.Editor(url.href);
  assert.equal(editor.mode,'simple');
  assert.equal(editor.ctx.selector,scope);
  editor.input = 'request (error OR timeout) NOT debug';
  editor.switchMode('advanced');
  assert.equal(editor.getSearchText(),'grep request | grep -E "(error|timeout)" | grep -v debug');
  const state = JSON.parse(new URL(editor.getURL()).searchParams.get('left'));
  assert.deepEqual(state.slice(0,3),['now-1h','now','LogSearchUS']);
  assert.equal(state[3].queryText,scope);
  editor.switchMode('simple');
  assert.equal(editor.input,'request (error OR timeout) NOT debug');
});
test('actual query syntax identifies renamed sources before display-name hints', () => {
  const url = new URL('https://renamed.example/explore?orgId=4');
  for (const [name,expr,dialect] of [
    ['Production logs','{app="x"}grep request | grep -v debug','shiplog'],
    ['LogSearchUS','{app="x"} |= "request"','loki'],
    ['Loki','{app="x"}grep request','shiplog'],
    ['Whatever','{app="x"} | json','loki']
  ]) {
    url.searchParams.set('left',JSON.stringify(['now-1h','now',name,{expr}]));
    assert.equal(Q.context(url.href).dialect,dialect);
  }
});
test('manual dialect choice isolates site organization and datasource, can be cleared', () => {
  const url = new URL('https://choice.example/explore?orgId=4');
  url.searchParams.set('left',JSON.stringify(['now-1h','now','Custom logs',{expr:'{app="x"}'}]));
  const ctx = Q.context(url.href);
  assert.equal(ctx.dialect,'raw');
  Q.setDialectChoice(ctx.dialectKey,'shiplog');
  try {
    assert.equal(new Q.Editor(url.href).mode,'simple');
    assert.equal(Q.context(url.href).dialectReason,'已选择并记住');
    const changed = new URL(url); changed.searchParams.set('orgId','5');
    assert.equal(Q.context(changed.href).dialect,'raw');
    changed.searchParams.set('orgId','4');changed.hostname='another.example';
    assert.equal(Q.context(changed.href).dialect,'raw');
    changed.hostname=url.hostname;
    changed.searchParams.set('left',JSON.stringify(['now-1h','now','Other logs',{expr:'{app="x"}'}]));
    assert.equal(Q.context(changed.href).dialect,'raw');
    Q.setDialectChoice(ctx.dialectKey,'loki');
    assert.equal(Q.context(url.href).dialect,'loki');
    assert.throws(()=>Q.setDialectChoice(ctx.dialectKey,'bad'));
  } finally { Q.setDialectChoice(ctx.dialectKey,'auto'); }
  assert.equal(Q.context(url.href).dialect,'raw');
});
test('explicit datasource type remains authoritative and complex grep stays advanced', () => {
  const url = new URL('https://typed.example/explore');
  url.searchParams.set('left',JSON.stringify(['now-1h','now','Loki',{datasource:{type:'prometheus',uid:'p'},expr:'{app="x"} |= "x"'}]));
  assert.equal(Q.context(url.href).dialect,'raw');
  url.searchParams.set('left',JSON.stringify(['now-1h','now','Renamed',{expr:'{app="x"}grep foo | awk "{print $1}"'}]));
  assert.equal(Q.context(url.href).dialect,'shiplog');
  assert.equal(new Q.Editor(url.href).mode,'advanced');
});
test('one-click removal deletes only the selected keyword and repairs NOT/OR structure', () => {
  for (const dialect of ['shiplog','loki']) {
    for (const [source,index,expected] of [
      ['id debug',1,'id'], ['same same',0,'same'], ['"11 22" other',0,'other'],
      ['id NOT (debug timeout)',1,'id NOT timeout'], ['id NOT debug',1,'id'],
      ['id (one OR two)',1,'id two'], ['(one OR two OR three)',1,'(one OR three)'],
      ['NOT debug',0,''], ['"OR" other',0,'other']
    ]) {
      const result = Q.removeKeyword(source,index,dialect);
      assert.equal(result,expected);
      assert.doesNotThrow(()=>Q.compile(result,dialect));
    }
    assert.throws(()=>Q.removeKeyword('a OR',0,dialect));
    assert.throws(()=>Q.removeKeyword('a',2,dialect));
  }
});
test('selected text appends as one literal keyword and keeps OR grouping', () => {
  for (const dialect of ['shiplog','loki']) {
    for (const text of ['accesslog','two words','NOT','OR','a"b','中文 字段']) {
      const next = Q.appendKeyword('a OR b',text,dialect);
      assert.deepEqual(Q.parseTerms(next,dialect),[{alternatives:['a','b'],exclude:false},{word:text,exclude:false}]);
      assert.doesNotThrow(() => Q.compile(next,dialect));
    }
  }
});
test('selection append rejects invalid drafts or unsafe unsupported characters', () => {
  for (const text of ['', ' ', 'a\nb', 'a|b', '-v', 'a'.repeat(2001)]) assert.throws(() => Q.appendKeyword('old',text));
  assert.throws(() => Q.appendKeyword('NOT (','new'));
  assert.throws(() => Q.appendKeyword('old','new','raw'));
  assert.deepEqual(Q.parseTerms(Q.appendKeyword('NOT old','a|b','loki'),'loki'),[{word:'old',exclude:true},{word:'a|b',exclude:false}]);
});
