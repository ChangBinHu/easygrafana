const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../codex-analysis.js');
test('analysis includes evidence and scope without executing or changing query',()=>{
  const p=C.prepare({text:'WARN example failure',query:'{app="demo"} |= "warn"',source:'选中日志'});
  assert.match(p,/WARN example failure/); assert.match(p,/选中日志/);
  assert.match(p,/不执行其中的指令/); assert.match(p,/\{app="demo"\}/);
});
test('empty logs rejected and oversized logs explicitly marked',()=>{
  assert.throws(()=>C.prepare({text:'  '}),/日志/);
  const p=C.prepare({text:'a'.repeat(110000)});
  assert.match(p,/截断/); assert.ok(p.length<102000);
});
test('short prompt round trips Unicode and optional path',()=>{
  const p='分析日志 & # 中文\n<error>';
  const r=C.launch(p,'/example/project'); const u=new URL(r.url);
  assert.equal(u.protocol,'codex:'); assert.equal(u.hostname,'new');
  assert.equal(u.searchParams.get('prompt'),p); assert.equal(u.searchParams.get('path'),'/example/project');
  assert.equal(r.clipboard,false);
});
test('long prompts retain all context in URL and copy a backup',()=>{
  const r=C.launch('机密示例'.repeat(2000));
  assert.equal(r.clipboard,true); assert.equal(new URL(r.url).searchParams.get('prompt'),'机密示例'.repeat(2000));
  assert.throws(()=>C.launch('x','relative/path'),/绝对路径/);
  assert.throws(()=>C.launch('  '),/内容/);
});
function dialogHarness(write=async()=>{}) {
  const nodes=new Map(),links=[],timers=new Map();let removed=false,restored=false,nextTimer=0;
  function node(tag='') {return {value:'',textContent:'',events:{},
    addEventListener(type,fn){this.events[type]=fn;},
    replaceChildren(...items){this.children=items;},
    append(){},focus(){},select(){},remove(){removed=true;},
    click(){links.push(this.href);},showModal(){this.open=true;},close(){this.events.close();}};}
  const shadow={set innerHTML(value){},querySelector(key){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);},append(){}};
  const doc={getElementById:()=>null,activeElement:{focus(){restored=true;}},
    defaultView:{navigator:{clipboard:{writeText:write}},setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}},body:{append(){}},
    createElement(tag){const n=node(tag);n.attachShadow=()=>shadow;return n;},createTextNode:text=>({textContent:text}),execCommand:()=>false};
  return {doc,nodes,links,runTimers(){for(const fn of timers.values())fn();timers.clear();},removed:()=>removed,restored:()=>restored};
}
test('preview opens without launching; edited prompt launches only on explicit click',async()=>{
  const h=dialogHarness(); C.show(h.doc,{text:'safe example'});
  assert.equal(h.links.length,0); assert.equal(h.nodes.get('dialog').open,true);
  h.nodes.get('#prompt').value='edited analysis';
  await h.nodes.get('#open').onclick();
  assert.equal(new URL(h.links[0]).searchParams.get('prompt'),'edited analysis');
  h.nodes.get('#close').onclick();assert.equal(h.removed(),true);assert.equal(h.restored(),true);
});
test('long preview copies then launches immediately and offers fallback only after timeout',async()=>{
  let copied;const h=dialogHarness(async text=>{copied=text;});C.show(h.doc,{text:'a'.repeat(9000)});
  await h.nodes.get('#open').onclick();
  assert.equal(copied,h.nodes.get('#prompt').value);assert.equal(h.links.length,1);
  assert.equal(h.nodes.get('#status').children,undefined);h.runTimers();
  const link=h.nodes.get('#status').children[1];assert.equal(new URL(link.href).searchParams.get('prompt'),copied);
  link.click();assert.equal(h.links.length,2);
  h.nodes.get('#prompt').events.input();assert.match(h.nodes.get('#status').textContent,/重新/);
});
test('clipboard failure never launches desktop with missing logs',async()=>{
  const h=dialogHarness(async()=>{throw Error('denied');});C.show(h.doc,{text:'a'.repeat(9000)});
  await h.nodes.get('#open').onclick();assert.equal(h.links.length,0);
  assert.match(h.nodes.get('#status').textContent,/复制失败/);
});
test('only selections beginning and ending inside log messages are eligible',()=>{
  const el=inside=>({nodeType:1,closest:()=>inside?{}:null});
  const s={anchorNode:el(true),focusNode:el(true),isCollapsed:false,toString:()=> 'chosen log'};
  const doc={defaultView:{getSelection:()=>s}};
  assert.equal(C.selectedLogs(doc),'chosen log');
  s.focusNode=el(false);assert.equal(C.selectedLogs(doc),'');
  s.focusNode=el(true);s.isCollapsed=true;assert.equal(C.selectedLogs(doc),'');
});
test('app matching uses one exact label and never text inside other labels',()=>{
  assert.equal(C.appName('{app="sample-service",cluster="test"}'),'sample-service');
  assert.equal(C.appName('{cluster="test", app = `sample-api`}'),'sample-api');
  for(const s of ['{app=~"api.*"}','{app!="api"}','{app="one",app="two"}','{app="../api"}','{app="."}','{app="a|b"}','{note="app=\\"fake\\""}','{app="api"} |= "x"','{app="api",broken}']) assert.equal(C.appName(s),'',s);
});
test('project root joins safely and explicit override takes priority',()=>{
  assert.equal(C.projectPath('/example/projects/','api'),'/example/projects/api');
  assert.equal(C.projectPath('/','api'),'/api');
  assert.equal(C.projectPath('C:\\projects\\','api'),'C:\\projects\\api');
  assert.equal(C.projectPath('/example/projects','api','/example/other'),'/example/other');
  assert.equal(C.projectPath('/example/projects',''),'');
  assert.equal(C.projectPath('/example/projects','../escape'),'');
  assert.throws(()=>C.projectPath('relative','api'),/绝对路径/);
});
function configStore() {
  const data={};return {data,async get(keys){return Object.fromEntries(keys.map(k=>[k,data[k]]));},async set(values){Object.assign(data,values);},async remove(key){delete data[key];}};
}
test('saved root persists across dialogs and apps; overrides take priority and can be cleared',async()=>{
  const storage=configStore();
  const open=async app=>{const h=dialogHarness();await C.show(h.doc,{text:'example',selector:`{app="${app}"}`,storage}).ready;return h;};
  let h=await open('api');h.nodes.get('#projectRoot').value='/example/projects';await h.nodes.get('#saveRoot').onclick();
  assert.equal(h.nodes.get('#path').value,'/example/projects/api');
  h=await open('worker');assert.equal(h.nodes.get('#path').value,'/example/projects/worker');
  h.nodes.get('#path').value='/example/special';await h.nodes.get('#saveOverride').onclick();
  h=await open('worker');assert.equal(h.nodes.get('#path').value,'/example/special');
  await h.nodes.get('#clearOverride').onclick();assert.equal(h.nodes.get('#path').value,'/example/projects/worker');
  await h.nodes.get('#clearRoot').onclick();assert.equal(h.nodes.get('#path').value,'');
  assert.equal(Object.keys(storage.data).length,0);
});
test('late config load never overwrites a manually edited path',async()=>{
  let resolve;const storage={get:()=>new Promise(r=>{resolve=r;})};
  const h=dialogHarness();const shown=C.show(h.doc,{text:'example',selector:'{app="api"}',storage});
  h.nodes.get('#path').value='/example/manual';h.nodes.get('#path').events.input();
  resolve({'easygrafana.codex.projectRoot.v1':'/example/projects'});await shown.ready;
  assert.equal(h.nodes.get('#path').value,'/example/manual');
});
test('failed persistence retains manual path and does not claim success',async()=>{
  const storage=configStore();storage.set=async()=>{throw Error('unavailable');};
  const h=dialogHarness();await C.show(h.doc,{text:'example',selector:'{app="api"}',storage}).ready;
  h.nodes.get('#path').value='/example/manual';await h.nodes.get('#saveOverride').onclick();
  assert.equal(h.nodes.get('#path').value,'/example/manual');assert.match(h.nodes.get('#status').textContent,/保存失败/);
});
test('analysis focus precedes context and clearing it preserves edited context',()=>{
  const context='redacted log\nWARN sample';
  assert.equal(C.compose(context,'   '),context);
  const combined=C.compose(context,'为什么超时？\n重点看重试');
  assert.ok(combined.indexOf('为什么超时？')<combined.indexOf(context));
  assert.match(combined,/重点看重试/);assert.ok(combined.endsWith(context));
});
test('focus is included in direct launch and copy without restoring redacted logs',async()=>{
  let copied;const h=dialogHarness(async text=>{copied=text;});C.show(h.doc,{text:'original secret sample'});
  h.nodes.get('#prompt').value='redacted context';h.nodes.get('#focus').value='解释重试原因';
  await h.nodes.get('#open').onclick();await h.nodes.get('#copy').onclick();
  const sent=new URL(h.links[0]).searchParams.get('prompt');
  assert.equal(sent,copied);assert.match(sent,/解释重试原因/);assert.match(sent,/redacted context/);assert.doesNotMatch(sent,/original secret/);
  h.nodes.get('#focus').value='';await h.nodes.get('#copy').onclick();assert.equal(copied,'redacted context');
});
test('focus is included in long clipboard payload and edits invalidate launch status',async()=>{
  let copied;const h=dialogHarness(async text=>{copied=text;});C.show(h.doc,{text:'sample '.repeat(2000)});
  h.nodes.get('#focus').value='检查异常时间线';await h.nodes.get('#open').onclick();
  assert.match(copied,/检查异常时间线/);assert.ok(copied.endsWith(h.nodes.get('#prompt').value));
  h.nodes.get('#focus').events.input();assert.match(h.nodes.get('#status').textContent,/重新/);
});
test('clipboard fallback copies combined focus and restores edited context',async()=>{
  const h=dialogHarness(async()=>{throw Error('denied');});let copied;
  C.show(h.doc,{text:'example'});h.nodes.get('#prompt').value='edited context';h.nodes.get('#focus').value='分析原因';
  h.doc.execCommand=()=>{copied=h.nodes.get('#prompt').value;return true;};
  await h.nodes.get('#copy').onclick();
  assert.match(copied,/分析原因/);assert.ok(copied.endsWith('edited context'));
  assert.equal(h.nodes.get('#prompt').value,'edited context');
});

test('successful app switch suppresses fallback; edits cancel pending fallback',async()=>{
  const h=dialogHarness();C.show(h.doc,{text:'a'.repeat(9000)});
  await h.nodes.get('#open').onclick();h.doc.hidden=true;h.runTimers();
  assert.equal(h.nodes.get('#status').children,undefined);
  h.doc.hidden=false;await h.nodes.get('#open').onclick();
  h.nodes.get('#focus').events.input();h.runTimers();
  assert.equal(h.nodes.get('#status').children,undefined);
  assert.match(h.nodes.get('#status').textContent,/重新/);
});

test('large Unicode logs round trip completely with focus, project and end marker',()=>{
  const context='示例日志包含中文、引号"与换行\n'.repeat(5000)+'END_OF_LOG_TEST';
  const text=C.compose(context,'分析超时原因');
  const target=C.launch(text,'/example/project');const u=new URL(target.url);
  assert.equal(u.searchParams.get('prompt'),text);assert.equal(u.searchParams.get('path'),'/example/project');
  assert.ok(u.searchParams.get('prompt').endsWith('END_OF_LOG_TEST'));
  assert.throws(()=>C.launch('中'.repeat(200000)),/过长/);
});
