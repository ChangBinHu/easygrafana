const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness(result = true) {
  const source = fs.readFileSync(require('node:path').join(__dirname,'../content.js'),'utf8');
  const code = source.slice(source.indexOf('  function installSelectionSearch()'),source.indexOf('  async function start()'));
  const events = {}, queued = [], hosts = [], clicks = [], buttons = {};
  let cleared = false;
  const element = {nodeType:1,closest:()=>null};
  const selection = {isCollapsed:false,rangeCount:1,anchorNode:element,focusNode:element,toString:()=> 'nickname',removeAllRanges:()=>{cleared=true;},getRangeAt:()=>({getBoundingClientRect:()=>({width:60,height:16,left:100,bottom:120})})};
  const document = {addEventListener:(type,fn,capture)=> {events[type]={fn,capture};},body:{append:node=>hosts.push(node)},createElement:()=>({style:{},getBoundingClientRect:()=>({width:220,height:32}),attachShadow:()=>({querySelector:selector=>buttons[selector] ||= {addEventListener(type,fn){this[type]=fn;}}}),remove(){}})};
  vm.runInNewContext(code+';installSelectionSearch();',{document,window:{getSelection:()=>selection,addEventListener(){}},location:{href:'https://example.com/explore'},recognizedPage:()=>true,mounted:{host:{setAttribute(){}},addSelection:(...args)=>{clicks.push(args);return result;}},EasyGrafanaJSON:{formatSelection:()=>null},innerWidth:1000,innerHeight:800,setTimeout:fn=>queued.push(fn),clearTimeout(){},setInterval(){}});
  return {events,queued,hosts,buttons,clicks,isCleared:()=>cleared};
}
test('selection toolbar receives mouseup even when a log row stops bubbling',()=>{
  const h=harness();
  // Simulate a row consuming the bubble phase: only capture subscribers run.
  if(h.events.mouseup.capture) h.events.mouseup.fn({composedPath:()=>[],isComposing:false});
  h.queued.forEach(fn=>fn());
  assert.equal(h.hosts.length,1);
  assert.equal(h.hosts[0].id,'easygrafana-selection-search');
});

test('layout scroll after selecting text keeps the toolbar available',()=>{
  const h=harness();
  h.events.mouseup.fn({composedPath:()=>[],isComposing:false});
  let removed=false;
  h.hosts[0].remove=()=>{removed=true;};
  h.events.scroll.fn({type:'scroll'});
  assert.equal(removed,false);
  assert.equal(h.hosts[0].style.top,'126px');
});

test('adding selected text executes once; invalid or busy drafts never execute',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../content.js'),'utf8');
  const code=source.slice(source.indexOf('    function addSelection('),source.indexOf('    return {host,syncURL'));
  for (const scenario of ['valid','invalid','busy']) {
    let runs=0;
    const editor={mode:'simple',input:'old',ctx:{dialect:'shiplog'},getURL(){}};
    const context={editor,submitting:scenario==='busy',syncURL(){},Q:{appendKeyword:(input,text)=>{if(scenario==='invalid') throw Error('invalid');return input+' '+text;}},location:{href:'https://example.com/explore'},drafts:new Map(),targetId:'A',renderMode(){},refresh(){},syncNative(){},closeHistory(){},message(){},run:async()=>{runs++;}};
    vm.runInNewContext(code+";addSelection('new');",context);
    assert.equal(runs,scenario==='valid'?1:0);
    assert.equal(context.editor.input,scenario==='valid'?'old new':'old');
  }
});

test('replace selection clears keyword conditions and preserves scope, time and other queries',()=>{
  const Q=require('../query.js');
  const source=fs.readFileSync(require('node:path').join(__dirname,'../content.js'),'utf8');
  const code=source.slice(source.indexOf('    function addSelection('),source.indexOf('    return {host,syncURL'));
  for (const mode of ['simple','advanced']) for (const dialect of ['shiplog','loki']) {
    const url=new URL('https://logs.example.com/explore?orgId=7&right=unchanged');
    const selector='{app="sample-service",cluster="cluster-test"}';
    const suffix=dialect==='loki'?' | json | status >= 500':'';
    const filters=dialect==='loki'?' |= "oldId" != "debug"':'grep oldId | grep -v debug';
    url.searchParams.set('left',JSON.stringify(['now-2h','now',dialect==='loki'?'loki':'LogSearch',{expr:selector+filters+suffix,refId:'A'},{expr:selector+'grep untouched',refId:'B'}]));
    const editor=new Q.Editor(url.href); editor.switchMode(mode);
    let runs=0,submitted;
    const context={editor,submitting:false,syncURL(){},Q,location:{href:url.href},drafts:new Map(),targetId:editor.ctx.id,renderMode(){},refresh(){},syncNative(){},closeHistory(){},message(){},run:async()=>{runs++;submitted=context.editor.getURL(url.href);}};
    vm.runInNewContext(code+';addSelection("new phrase",true);',context);
    assert.equal(runs,1);
    assert.equal(context.editor.mode,mode);
    const result=new URL(submitted), before=JSON.parse(url.searchParams.get('left')), after=JSON.parse(result.searchParams.get('left'));
    assert.equal(after[3].expr,selector+(dialect==='loki'?' |= "new phrase"':'grep "new phrase"')+suffix);
    assert.deepEqual(after.slice(0,3),before.slice(0,3));
    assert.deepEqual(after[4],before[4]);
    assert.equal(result.searchParams.get('orgId'),'7');
    assert.equal(result.searchParams.get('right'),'unchanged');
  }
});

test('unsafe replacements and nonconvertible advanced queries preserve the original draft',()=>{
  const Q=require('../query.js');
  const source=fs.readFileSync(require('node:path').join(__dirname,'../content.js'),'utf8');
  const code=source.slice(source.indexOf('    function addSelection('),source.indexOf('    return {host,syncURL'));
  for (const scenario of ['invalid','complex','stale','busy']) {
    const url=new URL('https://logs.example.com/explore');
    url.searchParams.set('left',JSON.stringify(['now-1h','now','LogSearch',{expr:'{app="sample"}grep old'+(scenario==='complex'?' | sort':'')}]));
    const editor=new Q.Editor(url.href); editor.stale=scenario==='stale';
    let runs=0;
    const context={editor,submitting:scenario==='busy',syncURL(){},Q,location:{href:url.href},drafts:new Map(),targetId:editor.ctx.id,renderMode(){},refresh(){},syncNative(){},closeHistory(){},message(){},run:async()=>runs++};
    vm.runInNewContext(code+`;addSelection(${JSON.stringify(scenario==='invalid'?'bad | command':'new')},true);`,context);
    assert.equal(runs,0,scenario);
    assert.equal(context.editor,editor,scenario);
  }
});

test('selection buttons dispatch append and replace and retain selection on errors',()=>{
  for (const action of ['append','replace']) for (const result of [true,'query error']) {
    const h=harness(result);
    h.events.mouseup.fn({composedPath:()=>[],isComposing:false});
    let prevented=false,removed=false;
    h.hosts[0].remove=()=>{removed=true;};
    h.buttons['#'+action].pointerdown({preventDefault(){prevented=true;}});
    h.buttons['#'+action].click();
    assert.equal(prevented,true);
    assert.deepEqual(h.clicks,[['nickname',action==='replace']]);
    assert.equal(h.isCleared(),result===true);
    assert.equal(removed,result===true);
    if(result!==true) assert.equal(h.buttons.p.textContent,result);
  }
});
