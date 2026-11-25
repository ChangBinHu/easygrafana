const {test} = require('node:test');
const assert = require('node:assert/strict');
const {formatSelection:f} = require('../json-viewer.js');
test('JSON viewer formats objects and arrays preserving string contents', () => {
  assert.equal(f('{"a":[1,2],"b":{}}'),'{\n  "a": [\n    1,\n    2\n  ],\n  "b": {}\n}');
  for (const s of ['[]','{}','["a { b, : }",true,null]', '{"x":"a\\\"b\\nc"}']) assert.deepEqual(JSON.parse(f(s)),JSON.parse(s));
});
test('JSON viewer preserves long IDs and numeric spelling', () => {
  const result = f('{"id":9223372036854775807,"n":1.2300e+12}');
  assert.ok(result.includes('9223372036854775807')); assert.ok(result.includes('1.2300e+12'));
});
test('JSON viewer accepts quoted JSON and rejects ordinary or incomplete selections', () => {
  assert.equal(f(JSON.stringify('{"a":1}')),f('{"a":1}'));
  for (const text of ['hello','42','null','true','"hello"','prefix {"a":1}','{"a":}','{a:1}','{"a":1} tail',' '.repeat(200001)]) assert.equal(f(text),null);
  assert.equal(f('['.repeat(101)+'0'+']'.repeat(101)),null);
});
test('JSON viewer preserves markup as text', () => {
  const text = '{"html":"<img src=x onerror=alert(1)>"}';
  assert.equal(JSON.parse(f(text)).html,JSON.parse(text).html);
});
test('escaped JSON fragments without outer quotes decode without losing long IDs or string escapes', () => {
  const original = '{"timestamp":1700000000,"id":9223372036854775807,"ab":[{"key":"sample_event","value":"Control","path":"C:\\\\temp","message":"a\\\"b\\nc"}]}';
  let escaped = original;
  for (let depth=1;depth<=3;depth++) {
    escaped = JSON.stringify(escaped).slice(1,-1);
    assert.equal(f(escaped),f(original));
    assert.equal(f(JSON.stringify(escaped)),f(original));
  }
});
test('escaped incomplete fragments stay invalid and valid string content is not over-decoded', () => {
  for (const text of [String.raw`{\"a\":`,String.raw`{\"a\":1} trailing`,String.raw`{\"a\":\q}`]) assert.equal(f(text),null);
  const original = JSON.stringify({value:String.raw`{\"x\":1}`,path:String.raw`C:\new\test`});
  assert.deepEqual(JSON.parse(f(original)),JSON.parse(original));
});
