const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('worker serializes concurrent records, isolates sites, clears only selected scope', async () => {
  let listener; const data = {};
  const sandbox = {URL, Promise, importScripts() {}, EasyGrafanaHistory:require('../history.js'),
    chrome:{runtime:{onMessage:{addListener(fn){listener=fn;}}},storage:{local:{
      async get(key){return {[key]:data[key]};},
      async set(value){Object.assign(data,value);},
      async remove(key){delete data[key];}
    }}}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../background.js'),'utf8'),sandbox);
  const call = (action,origin='https://a') => new Promise(resolve => listener({type:'easygrafana-history',action,dialect:'shiplog',text:'NOT (11 22)'},{url:origin+'/explore'},resolve));
  await Promise.all(Array.from({length:5},()=>call('record')));
  assert.equal((await call('get')).items[0].count,5);
  assert.equal((await call('get','https://b')).items.length,0);
  await call('record','https://b');
  await call('clear');
  assert.equal((await call('get')).items.length,0);
  assert.equal((await call('get','https://b')).items.length,1);
  assert.equal(listener({type:'easygrafana-history',action:'get',dialect:'shiplog'},{url:'https://a/ordinary'},()=>assert.fail()),undefined);
});
