(function(root){
    'use strict';
    const KEY='robot_default_position_v1';
    function normalize(value){return value&&['x','z','heading'].every(k=>typeof value[k]==='number'&&Number.isFinite(value[k]))?{x:value.x,z:value.z,heading:Math.atan2(Math.sin(value.heading),Math.cos(value.heading)),...(value.reference==='body-center'?{reference:'body-center'}:{})}:null;}
    function load(){try{return normalize(JSON.parse(root.localStorage.getItem(KEY)));}catch(_){return null;}}
    function save(value){const pose=normalize(value);if(!pose)throw Error('Invalid default position');root.localStorage.setItem(KEY,JSON.stringify(pose));return pose;}
    root.SimDefaultPosition={KEY,normalize,load,save,clear:()=>root.localStorage.removeItem(KEY)};
})(typeof window!=='undefined'?window:globalThis);
