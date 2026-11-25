const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness() {
  const source = fs.readFileSync(require('node:path').join(__dirname,'../content.js'),'utf8');
  const code = source.slice(source.indexOf('  function installSelectionSearch()'),source.indexOf('  async function start()'));
  const events = {}, queued = [], hosts = [];
  const element = {nodeType:1,closest:()=>null};
  const selection = {isCollapsed:false,rangeCount:1,anchorNode:element,focusNode:element,toString:()=> 'nickname',getRangeAt:()=>({getBoundingClientRect:()=>({width:60,height:16,left:100,bottom:120})})};
  const document = {addEventListener:(type,fn,capture)=> {events[type]={fn,capture};},body:{append:node=>hosts.push(node)},createElement:()=>({style:{},attachShadow:()=>({querySelector:()=>({addEventListener(){}})}),remove(){}})};
  vm.runInNewContext(code+';installSelectionSearch();',{document,window:{getSelection:()=>selection,addEventListener(){}},location:{href:'https://example.com/explore'},recognizedPage:()=>true,mounted:{host:{setAttribute(){}}},EasyGrafanaJSON:{formatSelection:()=>null},innerWidth:1000,innerHeight:800,setTimeout:fn=>queued.push(fn),clearTimeout(){},setInterval(){}});
  return {events,queued,hosts};
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
  const code=source.slice(source.indexOf('    function addSelection(text)'),source.indexOf('    return {host,syncURL'));
  for (const scenario of ['valid','invalid','busy']) {
    let runs=0;
    const editor={mode:'simple',input:'old',ctx:{dialect:'shiplog'},getURL(){}};
    const context={editor,submitting:scenario==='busy',syncURL(){},Q:{appendKeyword:(input,text)=>{if(scenario==='invalid') throw Error('invalid');return input+' '+text;}},location:{href:'https://example.com/explore'},drafts:new Map(),targetId:'A',renderMode(){},refresh(){},syncNative(){},closeHistory(){},message(){},run:async()=>{runs++;}};
    vm.runInNewContext(code+";addSelection('new');",context);
    assert.equal(runs,scenario==='valid'?1:0);
    assert.equal(context.editor.input,scenario==='valid'?'old new':'old');
  }
});
