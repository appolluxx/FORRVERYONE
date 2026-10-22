'use strict';
importScripts('field-layout.js');
self.onmessage=event=>{
    try{
        const category=event.data.category||'delivery-robot-primary';
        if(['lga-junior','lga-senior'].includes(category)){self.postMessage({layout:SimFieldLayout.localShuffle(event.data.layout,event.data.seed,category==='lga-senior')});return;}
        if(!['delivery-robot-primary','basic-tracks','rescue-robot'].includes(category))throw Error('Choose an available field category.');
        self.postMessage({layout:category==='rescue-robot'?SimFieldLayout.rescueShuffle(event.data.layout,event.data.seed):category==='basic-tracks'?SimFieldLayout.route(event.data.seed,event.data.layout):SimFieldLayout.connectedShuffle(event.data.layout,event.data.seed)});
    }
    catch(error){self.postMessage({error:error.message});}
};
