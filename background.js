'use strict';
importScripts('history.js');
// Serialize read/modify/write across tabs to keep frequency counts accurate.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((request,sender,respond) => {
  if (request?.type !== 'easygrafana-history') return;
  let origin;
  try {
    const url = new URL(sender.url);
    if (!/^https?:$/.test(url.protocol) || !/\/explore\/?$/.test(url.pathname)) return;
    origin = url.origin;
  } catch { return; }
  if (!['shiplog','loki'].includes(request.dialect) || !['get','record','clear'].includes(request.action)) return;
  const task = async () => {
    const H = globalThis.EasyGrafanaHistory;
    const key = H.key(origin,request.dialect);
    if (request.action === 'clear') { await chrome.storage.local.remove(key); return []; }
    const stored = (await chrome.storage.local.get(key))[key] || [];
    if (request.action === 'get') return H.record(stored,'');
    const next = H.record(stored,request.text);
    await chrome.storage.local.set({[key]:next});
    return next;
  };
  queue = queue.then(task,task);
  queue.then(items => respond({items}),() => respond({error:'常用检索记录暂时无法保存。'}));
  return true;
});
