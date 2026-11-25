const {test} = require('node:test');
const assert = require('node:assert/strict');
const I = require('../inline.js');
const ctx = {dialect:'shiplog',query:{value:'grep trace'},filter:'grep trace',selector:'{app="a"}'};
test('matches exact native query and refuses ambiguous rows',() => {
 const item = {value:'grep trace'};
 assert.equal(I.choose([item,{value:'grep other'}],ctx),item);
 assert.equal(I.choose([item,{value:'grep trace'}],ctx),null);
 assert.equal(I.choose([{value:'different'}],ctx),null);
});
test('does not write Monaco hidden textareas or disabled editors',() => {
 assert.equal(I.choose([{value:'grep trace',rich:true}],ctx),null);
 assert.equal(I.choose([{value:'grep trace',disabled:true}],ctx),null);
});
test('Shiplog keeps selector outside native filter field',() => {
 assert.equal(I.nativeValue(ctx,'{app="a"}grep trace | grep -v debug'),'grep trace | grep -v debug');
 assert.equal(I.nativeValue(ctx,'{app="b"}grep trace'),null);
 assert.equal(I.nativeValue({dialect:'loki'},'{app="a"} |= "trace"'),'{app="a"} |= "trace"');
});
