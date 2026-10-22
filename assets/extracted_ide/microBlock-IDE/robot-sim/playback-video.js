(function(root){
    'use strict';
    // Record the rendered canvas, not another simulation or a screen capture.
    function start(canvas,audioStream){
        if(!root.MediaRecorder||!canvas.captureStream)throw Error('Video recording is unavailable in this browser.');
        const mime=['video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>root.MediaRecorder.isTypeSupported(t));
        if(!mime)throw Error('No supported video format is available.');
        const stream=canvas.captureStream(30),chunks=[];
        for(const track of audioStream?.getAudioTracks()||[])stream.addTrack(track.clone());
        let recorder,done=false,cancelled=false,bytes=0,resolve,reject;
        const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
        const release=()=>stream.getTracks().forEach(track=>track.stop());
        try{recorder=new root.MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});}
        catch(error){release();throw error;}
        recorder.ondataavailable=event=>{
            if(event.data?.size){chunks.push(event.data);bytes+=event.data.size;}
            if(bytes>256*1024*1024&&!done){done=true;recorder.stop();release();reject(Error('Video exceeded 256 MB. Use a shorter recording.'));}
        };
        recorder.onerror=event=>{if(done)return;done=true;release();reject(event.error||Error('Video recording failed.'));};
        recorder.onstop=()=>{
            release();if(done)return;done=true;
            if(cancelled){resolve(null);return;}
            if(!bytes){reject(Error('No video frames were recorded.'));return;}
            resolve({blob:new Blob(chunks,{type:recorder.mimeType||mime}),extension:mime.startsWith('video/mp4')?'mp4':'webm'});
        };
        try{recorder.start(1000);}catch(error){release();throw error;}
        return {promise,stop(cancel=false){cancelled=cancel;if(!done&&recorder.state!=='inactive')recorder.stop();}};
    }
    async function fast({canvas,duration,frames,render,onProgress,cancelled}){
        const M=await import('./vendor/mediabunny/mediabunny.min.js');
        const fps=60,width=canvas.width,height=canvas.height;
        const mp4=await M.canEncodeVideo('avc',{width,height})&&await M.canEncodeAudio('aac',{sampleRate:48000,numberOfChannels:1});
        const videoCodec=mp4?'avc':'vp8',audioCodec=mp4?'aac':'opus';
        if(!await M.canEncodeVideo(videoCodec,{width,height})||!await M.canEncodeAudio(audioCodec,{sampleRate:48000,numberOfChannels:1}))throw Error('Fast video export is unavailable in this browser. Use current Chrome or Electron.');
        const output=new M.Output({format:mp4?new M.Mp4OutputFormat():new M.WebMOutputFormat(),target:new M.BufferTarget()});
        const hardware=await M.canEncodeVideo(videoCodec,{width,height,hardwareAcceleration:'prefer-hardware'})?'prefer-hardware':'no-preference';
        const video=new M.VideoSampleSource({codec:videoCodec,hardwareAcceleration:hardware,quality:new M.Quality({bitrate:12000000})});
        const audio=new M.AudioBufferSource({codec:audioCodec,quality:new M.Quality({bitrate:128000})});
        output.addVideoTrack(video,{frameRate:fps});output.addAudioTrack(audio);
        let written=0;output.target.on('write',({end})=>{written=Math.max(written,end);});
        const check=()=>{if(cancelled())throw Error('Export cancelled');if(written>256*1024*1024)throw Error('Video exceeded 256 MB. Use a shorter recording.');};
        try{
            check();onProgress(0,'Preparing audio');
            const buffer=await root.SimMechanicalAudio.renderOffline(frames,duration,cancelled);check();
            await output.start();
            // Close the audio track before video encoding to release interleaving backpressure.
            await audio.add(buffer);audio.close();
            const count=Math.ceil(duration*fps);let yieldAt=performance.now();
            for(let i=0;i<count;i++){
                check();render(i/fps,1/fps);
                // Snapshot WebGL synchronously, before an await can clear its drawing buffer.
                const sample=new M.VideoSample(canvas,{timestamp:i/fps,duration:Math.min(1/fps,duration-i/fps)});
                try{await video.add(sample);}finally{sample.close();}
                onProgress((i+1)/count,'Exporting 60 FPS');
                if(performance.now()-yieldAt>30){await new Promise(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}
            }
            video.close();check();onProgress(1,'Finishing video');await output.finalize();check();
            return {blob:new Blob([output.target.buffer],{type:mp4?'video/mp4':'video/webm'}),extension:mp4?'mp4':'webm'};
        }catch(error){if(output.state!=='finalized'&&output.state!=='canceled')await output.cancel();throw error;}
    }
    root.SimPlaybackVideo={start,fast};
    if(typeof module!=='undefined')module.exports=root.SimPlaybackVideo;
})(typeof window!=='undefined'?window:globalThis);
