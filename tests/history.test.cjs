const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const file = require('node:path').join(__dirname,'../history.js');
const H = fs.existsSync(file) ? require(file) : {};
test('history API exists', () => assert.equal(typeof H.record,'function'));
test('repeated queries track usage and filter by typed text', () => {
  let items = H.record([], 'trace NOT (11 22)', 1);
  items = H.record(items,'refund',2);
  items = H.record(items,'trace NOT (11 22)',3);
  assert.equal(H.suggest(items,'')[0].text,'trace NOT (11 22)');
  assert.equal(H.suggest(items,'REF')[0].text,'refund');
  assert.equal(items.find(x=>x.text==='trace NOT (11 22)').count,2);
});
test('history is bounded and ignores empty, oversized and corrupt values', () => {
  let items = [];
  for (let i=0;i<110;i++) items = H.record(items,'term'+i,i);
  assert.equal(items.length,100);
  assert.deepEqual(H.record(items,'  ',111),items);
  assert.deepEqual(H.record(items,'x'.repeat(2001),111),items);
  assert.deepEqual(H.suggest([null,{text:3},{text:'bad',count:-1,last:2}],''),[]);
});
test('history keys isolate origin and datasource dialect', () => {
  assert.notEqual(H.key('https://a','shiplog'),H.key('https://b','shiplog'));
  assert.notEqual(H.key('https://a','shiplog'),H.key('https://a','loki'));
});

test('syntax examples preserve existing query, select editable sample and compile in both dialects', () => {
  const Q = require('../query.js');
  assert.equal(H.syntax.length,5);
  for (const item of H.syntax) {
    for (const before of ['', 'request123', '"request failed"  ']) {
      const result = H.insertSyntax(before,item);
      assert.equal(result.text.slice(result.selectionStart,result.selectionEnd),item.sample);
      assert.ok(result.text.startsWith(before.trimEnd()));
      for (const dialect of ['shiplog','loki']) assert.doesNotThrow(()=>Q.compile(result.text,dialect));
    }
  }
});


test('recent use outranks frequency, equal timestamps rank by frequency', () => {
  const items = [
    {text:'old popular',count:99,last:1},
    {text:'recent once',count:1,last:3},
    {text:'recent popular',count:5,last:3}
  ];
  assert.deepEqual(H.suggest(items).map(x=>x.text),['recent popular','recent once','old popular']);
  const updated = H.record(items,'old popular',4);
  assert.equal(updated[0].text,'old popular');
  assert.equal(updated[0].count,100);
  assert.equal(H.suggest(updated)[0].text,'old popular');
});
test('history retention keeps recent entries ahead of old high-frequency entries', () => {
  const items = [{text:'old popular',count:1000,last:0}];
  for (let i=1;i<=100;i++) items.push({text:'term'+i,count:1,last:i});
  const saved = H.record(items,'new',101);
  assert.equal(saved.length,100);
  assert.equal(saved[0].text,'new');
  assert.ok(!saved.some(x=>x.text==='old popular'));
});
