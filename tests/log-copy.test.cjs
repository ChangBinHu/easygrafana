const {test} = require('node:test');
const assert = require('node:assert/strict');
const L = require('../log-copy.js');
function docFor(values,writeText) {
  return {
    querySelectorAll:()=>values.map(value=>({
      getClientRects:()=>[{}], closest:()=>null, parentElement:{closest:()=>null},
      cloneNode:()=>({textContent:value,querySelectorAll:()=>[]})
    })),
    defaultView:{navigator:{clipboard:{writeText}}}
  };
}
test('copy preserves row order, repeated logs and embedded newlines', async () => {
  let copied;
  const doc=docFor(['same','same','line one\r\nline two'],async text=>{copied=text;});
  assert.equal(await L.copy(doc),3);
  assert.equal(copied,'same\nsame\nline one\nline two');
});
test('empty results never overwrite clipboard', async () => {
  let writes=0;
  await assert.rejects(L.copy(docFor([],async()=>writes++)),/未找到/);
  assert.equal(writes,0);
});
test('clipboard failure uses fallback and cleans up even when rejected', async () => {
  let removed=false,focused=false;
  const doc=docFor(['one'],async()=>{throw Error('denied');});
  doc.activeElement={focus:()=>{focused=true;}};
  doc.createElement=()=>({setAttribute(){},style:{},select(){},remove(){removed=true;}});
  doc.body={append(){}};doc.execCommand=()=>false;
  await assert.rejects(L.copy(doc),/浏览器未允许/);
  assert.equal(removed,true);assert.equal(focused,true);
});
