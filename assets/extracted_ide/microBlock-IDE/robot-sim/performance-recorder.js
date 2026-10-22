(function(root){
    'use strict';
    // One sample per second, bounded memory, no disk writes on the render path.
    class Recorder {
        constructor(){this.history=[];this.incidents=[];this.frames=0;this.frameMax=0;this.renderMax=0;this.tasks=0;this.taskMs=0;this.taskMax=0;this.lastIncident=-Infinity;}
        frame(gap,cost){this.frames++;this.frameMax=Math.max(this.frameMax,gap);this.renderMax=Math.max(this.renderMax,cost);}
        longTask(duration){this.tasks++;this.taskMs+=duration;this.taskMax=Math.max(this.taskMax,duration);}
        sample(value){
            const sample={...value,frames:this.frames,frameMaxMs:this.frameMax,renderMaxMs:this.renderMax,longTasks:this.tasks,longTaskMs:this.taskMs,longTaskMaxMs:this.taskMax};
            this.frames=0;this.frameMax=0;this.renderMax=0;this.tasks=0;this.taskMs=0;this.taskMax=0;
            this.history.push(sample);if(this.history.length>120)this.history.shift();
            for(const incident of this.incidents)if(sample.wallMs>incident.at&&sample.wallMs<=incident.at+5000)incident.after.push(sample);
            if(sample.ratio<.8&&sample.wallMs-this.lastIncident>=10000){
                this.lastIncident=sample.wallMs;
                this.incidents.push({at:sample.wallMs,run:sample.run,before:this.history.slice(-11),after:[]});
                if(this.incidents.length>8)this.incidents.shift();
            }
            return sample;
        }
        report(environment){return JSON.parse(JSON.stringify({version:1,environment,history:this.history,incidents:this.incidents}));}
    }
    root.SimPerformanceRecorder=Recorder;if(typeof module!=='undefined')module.exports=Recorder;
})(typeof window!=='undefined'?window:globalThis);
