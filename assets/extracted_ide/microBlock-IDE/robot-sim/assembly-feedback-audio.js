/* A short, soft mechanical click when an assembly step snaps into place. */
(()=>{
 let context,noise;
 function unlock(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!context){context=new Audio();noise=context.createBuffer(1,Math.ceil(context.sampleRate*.07),context.sampleRate);const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;}if(context.state==='suspended')context.resume().catch(()=>{});}catch(_){}}
 function attached(){
  if(!context||context.state!=='running'||document.hidden)return;
  try{
   const now=context.currentTime,gain=context.createGain(),filter=context.createBiquadFilter(),source=context.createBufferSource();
   source.buffer=noise;filter.type='lowpass';filter.frequency.value=1700;
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.13,now+.003);gain.gain.exponentialRampToValueAtTime(.0001,now+.065);
   source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start(now);source.stop(now+.07);
   source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }catch(_){}
 }
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('touchstart',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,true);
 window.addEventListener('pagehide',()=>{context?.close().catch(()=>{});context=null;noise=null;});
 window.AssemblyFeedbackAudio={attached};
})();
