(function(root){
 'use strict';
 function request(storage,board,p){
  const key='roboblocks-cpp-preferences-v1:'+board;
  const text=storage.getItem(key),state=text?JSON.parse(text):{};
  const nsKey=JSON.stringify([p.partition||'nvs',p.namespace]);
  const valid=s=>typeof s==='string'&&new TextEncoder().encode(s).length>0&&new TextEncoder().encode(s).length<=15;
  if(!valid(p.namespace))return p.op===3?10:0;
  let ns=Object.hasOwn(state,nsKey)?state[nsKey]:null;
  function save(){const json=JSON.stringify(state);if(json.length>262144)return false;storage.setItem(key,json);return true;}
  // A bounded SIM store, not a model of ESP32 flash wear or partition geometry.
  const used=()=>Object.values(state).reduce((n,v)=>n+1+Object.values(v).reduce((a,e)=>a+1+Math.ceil(e.bytes.length/32),0),0);
  if(p.op===0){if(!ns){if(p.type)return 0;state[nsKey]={};return save()?1:0;}return 1;}
  if(p.op===6)return Math.max(0,630-used());
  if(!ns)return p.op===3?10:0;
  if(p.op===4){state[nsKey]={};return save()?1:0;}
  if(!valid(p.key))return p.op===3?10:0;
  const entry=Object.hasOwn(ns,p.key)?ns[p.key]:null;
  if(p.op===3)return entry?entry.type:10;
  if(p.op===2)return entry&&entry.type===p.type?entry.bytes:0;
  if(p.op===5){if(!entry)return 0;delete ns[p.key];return save()?1:0;}
  if(p.op===1){
   if(!Number.isInteger(p.type)||p.type<0||p.type>9||!Array.isArray(p.bytes)||!p.bytes.length||p.bytes.length>65536||p.bytes.some(v=>!Number.isInteger(v)||v<0||v>255))return 0;
   Object.defineProperty(ns,p.key,{value:{type:p.type,bytes:p.bytes},enumerable:true,writable:true,configurable:true});
   return used()<=630&&save()?p.bytes.length:0;
  }
  throw Error('Unsupported Preferences operation');
 }
 root.SimPreferences={request};if(typeof module!=='undefined')module.exports=root.SimPreferences;
})(typeof window!=='undefined'?window:globalThis);
