(function(root){
    'use strict';
    function generate(Blockly,workspace,options){
        const py=Blockly.Python,original=py.controls_forever_asyncio_no_connect,asyncMode=py.IN_ASYNC;
        if (options && options.firmware) {
            const prefix=py.STATEMENT_PREFIX;
            const restored=[];
            try {
                if(options.trace){
                    py.STATEMENT_PREFIX='_rb_sim_block_(%1)\n';
                    for(const type of ['procedures_callnoreturn','procedures_callreturn']){
                        const owner=py.forBlock&&py.forBlock[type]?py.forBlock:py,originalCall=owner[type];
                        if(typeof originalCall!=='function')continue;
                        restored.push(()=>{owner[type]=originalCall;});
                        owner[type]=function(block,...args){
                            const code=originalCall.call(this,block,...args),id=py.quote_(block.id);
                            if(Array.isArray(code))return ['_rb_sim_value_('+id+', lambda: '+code[0]+')',py.ORDER_FUNCTION_CALL];
                            return '_rb_sim_enter_('+id+')\ntry:\n'+py.prefixLines(code,py.INDENT)+'finally:\n'+py.INDENT+'_rb_sim_leave_()\n';
                        };
                    }
                }
                const tracePrelude='from _sim_trace import block as _rb_sim_block_, enter as _rb_sim_enter_, leave as _rb_sim_leave_\ndef _rb_sim_value_(block_id, call):\n  _rb_sim_enter_(block_id)\n  try:\n    return call()\n  finally:\n    _rb_sim_leave_()\n';
                return (options.trace?tracePrelude:'')+(options.firmware === 'atom-vx' ? 'import _board_setup\n' : 'import robot\n') + py.workspaceToCode(workspace);
            }
            finally { restored.forEach(restore=>restore());py.IN_ASYNC = asyncMode;py.STATEMENT_PREFIX=prefix; }
        }
        // The SIM worker yields hardware calls and sleeps automatically. Keep
        // the generated main loop synchronous; Upload keeps its own generator.
        py.controls_forever_asyncio_no_connect=function(block){
            if(block.workspace.getAllBlocks(false).some(b=>b.type==='switch_on_pressed'))throw new Error('Python SIM does not support switch event tasks yet.');
            py.definitions_.import_robot='import robot';py.definitions_.sim_time='import time';py.IN_ASYNC=false;
            return 'while True:\n'+(py.statementToCode(block,'block')||py.INDENT+'pass\n')+py.INDENT+'time.sleep(0.01)\n';
        };
        try{return 'import robot\n'+py.workspaceToCode(workspace);}finally{py.controls_forever_asyncio_no_connect=original;py.IN_ASYNC=asyncMode;}
    }
    function collect(tree){
        const files=Object.create(null);
        function walk(node,prefix,add){Object.keys(node||{}).forEach(key=>{const value=node[key],name=(prefix?prefix+'/':'')+key.replace(/^\//,'');if(typeof value==='string'){if(name.endsWith('.py'))add(name,value);}else if(value&&typeof value==='object')walk(value,name,add);});}
        walk(tree,'',(name,value)=>{
            const extension=/^extension\/[^/]+\/modules\/(.+)$/.exec(name);
            if(extension){const file=extension[1];if(files[file]!==undefined&&files[file]!==value)throw new Error('Conflicting Python extension module: '+file);files[file]=value;}
        });
        walk(tree,'',(name,value)=>{if(!name.startsWith('extension/'))files[name]=value;});
        return files;
    }
    async function collectInstalled(directory){
        const files=Object.create(null);
        // Monaco replaces window.require with its AMD loader after startup.
        const nativeRequire = typeof root.nodeRequire === 'function' ? root.nodeRequire :
            (typeof window === 'undefined' && typeof require === 'function' ? require : null);
        if(!directory)return files;
        if(!nativeRequire)throw new Error('Native Extension file access is unavailable. Restart the IDE.');
        const fs=nativeRequire('fs').promises,path=nativeRequire('path');
        async function walk(dir,prefix){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
            if(entry.isSymbolicLink())continue;
            const file=path.join(dir,entry.name),relative=prefix+entry.name;
            if(entry.isDirectory())await walk(file,relative+'/');
            else if(entry.isFile()&&entry.name.endsWith('.py')){const text=await fs.readFile(file,'utf8');if(files[relative]!==undefined&&files[relative]!==text)throw new Error('Conflicting Python extension module: '+relative);files[relative]=text;}
        }}
        let entries;try{entries=await fs.readdir(directory,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return files;throw e;}
        for(const entry of entries)if(entry.isDirectory()&&!entry.isSymbolicLink()){
            const modules=path.join(directory,entry.name,'modules');try{await walk(modules,'');}catch(e){if(e.code!=='ENOENT')throw e;}
        }
        return files;
    }
    root.SimPythonSource={generate,collect,collectInstalled};if(typeof module!=='undefined')module.exports=root.SimPythonSource;
})(typeof window!=='undefined'?window:globalThis);
