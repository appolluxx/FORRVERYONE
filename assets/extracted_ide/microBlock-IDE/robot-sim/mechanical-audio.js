/* Lightweight synthesized mechanical sound, driven by measured joint RPM. */
(function () {
    'use strict';
    const toolbar=document.querySelector('.motor-sim-toolbar');if(!toolbar)return;
    const key='roboblocks-mechanical-audio-v1';
    const defaults=window.SimMechanicalAudioDefaults||{motor:{base:100,range:100,cutoff:2150,volume:200,gear:30},servo:{base:500,range:300,cutoff:6000,volume:50,gear:80}};
    const limits={base:[80,1200],range:[0,3000],cutoff:[300,6000],volume:[0,200],gear:[0,100]};
    function createEngine(offline){
    let scheduledTime=0;const clock=()=>offline?scheduledTime:context.currentTime;
    let settings=JSON.parse(JSON.stringify(defaults)),previewTimer=null;
    function configure(value){for(const kind of ['motor','servo'])for(const [name,[min,max]] of Object.entries(limits)){const v=value?.[kind]?.[name];if(typeof v==='number'&&Number.isFinite(v))settings[kind][name]=Math.max(min,Math.min(max,v));}}
    if(window.SIM_AUDIO_TUNER)try{configure(JSON.parse(localStorage.getItem(key)));}catch(_){}
    function save(value){configure(value);if(!window.SIM_AUDIO_TUNER)return true;try{localStorage.setItem(key,JSON.stringify(settings));return true;}catch(_){return false;}}
    let context,output,master,voices=[],lastSample=0,lastUpdate=0;
    function silence(){if(!context)return;for(const v of voices){v.gain.gain.setTargetAtTime(0,clock(),.025);v.gearGain?.gain.setTargetAtTime(0,clock(),.025);}}
    async function unlock(){
        try{
            if(!context){
                const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
                context=offline||new Audio();output=context.createGain();output.gain.value=1;output.connect(context.destination);master=context.createGain();master.gain.value=2;master.connect(output);
                const friction=context.createBuffer(1,context.sampleRate,context.sampleRate),samples=friction.getChannelData(0);
                for(let j=0;j<samples.length;j++)samples[j]=Math.random()*2-1;
                for(let i=0;i<6;i++){
                    const oscillator=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
                    // Roll off the servo's sharp upper harmonics as well as motor noise.
                    oscillator.type=i<4?'triangle':'sawtooth';filter.type='lowpass';filter.frequency.value=i<4?2100:2600;gain.gain.value=0;
                    oscillator.connect(filter);filter.connect(gain);gain.connect(i<4?output:master);oscillator.start();
                    // Preserve the current motor sound, including its unity output gain.
                    if(i<4){voices.push({oscillator,gain,filter});continue;}
                    // Broadband friction with tooth-mesh amplitude pulses. This
                    // is a separate soft mechanical layer, not another high beep.
                    const noise=context.createBufferSource(),band=context.createBiquadFilter(),pulse=context.createGain(),gearFilter=context.createBiquadFilter(),gearGain=context.createGain(),teeth=context.createOscillator(),depth=context.createGain();
                    noise.buffer=friction;noise.loop=true;band.type='bandpass';band.Q.value=.8;
                    pulse.gain.value=.65;depth.gain.value=.3;teeth.type='sine';gearFilter.type='lowpass';gearGain.gain.value=0;
                    noise.connect(band);band.connect(pulse);teeth.connect(depth);depth.connect(pulse.gain);pulse.connect(gearFilter);gearFilter.connect(gearGain);gearGain.connect(master);
                    noise.start(0,i/7);teeth.start();voices.push({oscillator,gain,filter,band,teeth,gearFilter,gearGain});
                }
            }
            if(!offline&&context.state==='suspended')await context.resume();
        }catch(error){console.warn('Simulation sound unavailable',error);silence();}
    }
    if(!offline)document.getElementById('motor-sim-run')?.addEventListener('click',unlock,{capture:true});
    function update(sample,active,preview=false){
        if(previewTimer&&!preview)return;
        lastSample=offline?scheduledTime*1000:performance.now();
        if(!active||!sample?.available){silence();return;}
        if(!context||(!offline&&context.state!=='running')||lastSample-lastUpdate<40)return;
        lastUpdate=lastSample;
        voices.forEach((voice,i)=>{
            const servo=i>=4,s=(servo?sample.servos:sample.motors)?.[servo?i-4:i];
            const rpm=Number.isFinite(s?.rpm)?Math.abs(s.rpm):0;
            const speed=Math.min(1,rpm/(servo?100:900));
            if(!servo){
                voice.oscillator.frequency.setTargetAtTime(170+speed*990,clock(),.035);
                voice.gain.gain.setTargetAtTime(rpm>2?.012*Math.sqrt(speed):0,clock(),.055);
                return;
            }
            const config=settings.servo;
            voice.filter.frequency.setTargetAtTime(config.cutoff,clock(),.035);
            voice.oscillator.frequency.setTargetAtTime(config.base+speed*config.range,clock(),.035);
            const level=rpm>2?(servo?.009:.012)*config.volume/100*Math.sqrt(speed):0,texture=config.gear/100;
            // Slow motion exposes the gear pulses; the motor whine gradually
            // comes forward as RPM rises. Both layers retain the stop envelope.
            const ramp=Math.max(0,Math.min(1,(speed-.05)/.55)),fast=ramp*ramp*(3-2*ramp);
            voice.gain.gain.setTargetAtTime(level*(.12+.88*fast)*(1-.4*texture),clock(),servo?.035:.055);
            voice.band.frequency.setTargetAtTime((servo?650:380)+speed*(servo?900:700),clock(),.045);
            voice.teeth.frequency.setTargetAtTime(18+speed*(servo?145:105),clock(),.045);
            voice.gearFilter.frequency.setTargetAtTime(config.cutoff,clock(),.035);
            voice.gearGain.gain.setTargetAtTime(level*texture*(2.8-.6*fast),clock(),.035);
        });
    }
    const impactVoices=new Set();let offlineEnds=[];
    let paperNoise;
    const impactTones={metal:[460,.045,.065],plastic:[540,.07,.09],wood:[290,.055,.07],paper:[180,.045,.032],rubber:[100,.035,.05],glass:[1900,.3,.08]};
    function impacts(events){
        if(!context||(!offline&&context.state!=='running'))return;
        const layers=(events||[]).flatMap(e=>e.otherMaterial&&e.otherMaterial!==e.material?[e,{...e,material:e.otherMaterial,resonance:'solid',layerGain:.3}]:[e]);
        for(const event of layers){
            const rod=event.surface==='rod';
            if(offline)offlineEnds=offlineEnds.filter(end=>end>scheduledTime);
            if((offline?offlineEnds.length:impactVoices.size)>=8||!(event.speed>=(rod?.025:.12)))continue;
            // Only a real field can has the long hollow metallic ring.
            // Wheel hubs/chassis touching the field use a short damped tap.
            const [frequency,duration,level]=event.material==='metal'&&event.resonance==='can'?[1050,.22,.11]:impactTones[event.material]||impactTones.plastic;
            const strength=Math.min(1,Math.sqrt(Math.max(.001,event.mass||.02)/.02)*(rod?Math.sqrt(event.speed/.4):event.speed/1.8));
            const paper=event.material==='paper',gain=context.createGain(),time=clock();
            const oscillator=paper?context.createBufferSource():context.createOscillator();
            const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=paper?1300:5000;
            if(paper){
                if(!paperNoise){paperNoise=context.createBuffer(1,Math.ceil(context.sampleRate*.1),context.sampleRate);const data=paperNoise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
                oscillator.buffer=paperNoise;
            }else{
                oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,time);
                oscillator.frequency.exponentialRampToValueAtTime(frequency*.65,time+duration);
            }
            gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level*strength*(event.layerGain||1),time+.002);
            gain.gain.exponentialRampToValueAtTime(.00001,time+duration);
            oscillator.connect(filter);filter.connect(gain);gain.connect(master);impactVoices.add(oscillator);
            oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();impactVoices.delete(oscillator);};
            if(offline)offlineEnds.push(time+duration+.01);
            oscillator.start(time);oscillator.stop(time+duration+.01);
        }
    }
    function stopImpacts(){for(const voice of impactVoices){try{voice.stop();}catch(_){}}}
    if(offline)return {unlock,update,impacts,configure,getOutput:()=>output,setTime:t=>{scheduledTime=t;}};
    document.getElementById('terminal-robot-panel')?.addEventListener('pointerdown',unlock,{capture:true});
    // Stop sustained tones if rendering is paused or the tab becomes inactive.
    const watchdog=setInterval(()=>{if(performance.now()-lastSample>300)silence();},150);
    window.addEventListener('robot-project-reset',()=>{silence();stopImpacts();});
    window.addEventListener('beforeunload',()=>{clearInterval(watchdog);silence();stopImpacts();context?.close();});
    let previewGeneration=0;
    function stopPreview(){previewGeneration++;clearInterval(previewTimer);previewTimer=null;silence();}
    async function preview(kind,speed){stopPreview();const generation=previewGeneration;await unlock();if(generation!==previewGeneration||!context||context.state!=='running')return false;
        const play=()=>{const sample={available:true,motors:[],servos:[]};sample[kind==='servo'?'servos':'motors']=[{rpm:Math.max(0,Math.min(100,speed))*(kind==='servo'?1:9)}];update(sample,true,true);};
        previewTimer=setInterval(play,50);play();return true;
    }
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPreview();});
    window.addEventListener('robot-project-reset',stopPreview);
    window.addEventListener('beforeunload',stopPreview);
    async function captureOutput(){
        await unlock();
        if(!context||context.state!=='running')throw Error('Audio is unavailable. Click Download again to enable sound.');
        const destination=context.createMediaStreamDestination();output.connect(destination);
        return {stream:destination.stream,release(){output.disconnect(destination);destination.stream.getTracks().forEach(track=>track.stop());}};
    }
    return {captureOutput,getOutput:()=>context?{context,node:output}:null,unlock,stopImpacts,update,silence,impacts,preview,stopPreview,configure:save,getSettings:()=>JSON.parse(JSON.stringify(settings)),defaults:()=>JSON.parse(JSON.stringify(defaults))};
    }
    const live=createEngine();
    live.renderOffline=async(frames,duration,cancelled=()=>false)=>{
        const context=new OfflineAudioContext(1,Math.ceil(duration*48000),48000),engine=createEngine(context);
        engine.configure(live.getSettings());await engine.unlock();
        const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='square';gain.gain.value=0;
        oscillator.connect(gain);gain.connect(engine.getOutput());oscillator.start();
        for(let i=0;i<frames.length;i++){
            if(cancelled())throw Error('Export cancelled');
            const frame=frames[i],audio=frame.trace.audio;if(!audio)continue;
            engine.setTime(frame.t);engine.update(audio,true);engine.impacts(audio.impacts);
            oscillator.frequency.setValueAtTime(Math.max(1,audio.tone?.frequency||1),frame.t);
            gain.gain.setValueAtTime(audio.tone?.duty?.025:0,frame.t);
            if(i%120===0)await new Promise(resolve=>setTimeout(resolve,0));
        }
        oscillator.stop(duration);
        return context.startRendering();
    };
    window.SimMechanicalAudio=live;
})();

// Server defaults are optional; bundled audio continues working offline.
(()=>{
 if(window.SIM_AUDIO_TUNER)return;
 let busy=false,lastRevision=null;
 async function refresh(){
  if(busy||document.hidden)return;busy=true;
  try{
   const url=window.IDEAccount?await IDEAccount.url('/api/sound-settings'):(await (await fetch('account-config.json')).json()).apiBase.replace(/\/$/,'')+'/api/sound-settings';
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)return;
   const value=await response.json();if(value.settings&&value.revision!==lastRevision){window.SimMechanicalAudio.configure(value.settings);lastRevision=value.revision;}
  }catch(_){}finally{busy=false;}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
 setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
 window.refreshServerSoundSettings=refresh;
})();
