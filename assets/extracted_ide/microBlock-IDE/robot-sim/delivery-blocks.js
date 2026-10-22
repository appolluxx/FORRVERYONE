(function(root){
    'use strict';
    const helpers={leave:'เดินหน้าแล้วหยุดกลางเส้น',pick:'หยิบกระป๋อง แล้วกลับตัว',drop:'วางกระป๋อง',far:'วางกระป๋องไกล',reverse:'เลี้ยวซ้าย 180 องศา',backAlign:'ถอยหลังแล้วหยุดกลางเส้น',closeGrip:'หุบมือจับ',home:'เดินเข้าจุดสตาร์ท'};
    const block=(type,fields={},values={})=>({type,fields,values});
    const num=n=>block('math_number',{NUM:n});
    const call=name=>({type:'procedures_callnoreturn',procedure:name,
        ...([helpers.far,helpers.home].includes(name)?{args:['SPEED','time'],values:{ARG0:num(15),ARG1:num(.6)}}:{})});
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    function xml(b,next=''){
        return '<block type="'+escape(b.type)+'">'+(b.procedure?'<mutation name="'+escape(b.procedure)+'">'+(b.args||[]).map(name=>'<arg name="'+escape(name)+'"></arg>').join('')+'</mutation>':'')+
            Object.entries(b.fields||{}).map(([name,v])=>'<field name="'+escape(name)+'">'+escape(v)+'</field>').join('')+
            Object.entries(b.values||{}).map(([name,v])=>'<value name="'+escape(name)+'">'+xml(v)+'</value>').join('')+
            (b.comment?'<comment pinned="false">'+escape(b.comment)+'</comment>':'')+(next?'<next>'+next+'</next>':'')+'</block>';
    }
    const chain=items=>items.reduceRight((next,b)=>xml(b,next),'');
    function startPose(plan){
        const pose=root.SimFieldLayout.startPose(plan.layout,{width:2.4,length:1.2,centerX:.15,centerZ:-.45});
        const first=plan.legs[0]?.path.find(id=>/^\d+:[0-3]$/.test(id));
        if(!first)throw Error('The route has no START exit.');
        // BuildBOT's physical front is local -X.
        const heading=(3-Number(first.split(':')[1]))*Math.PI/2;
        // Move 4 cm toward the exit: front sensors approach the border while
        // side sensors clear the START lettering. Keep the raised-arm chassis inside.
        return {...pose,x:pose.x-Math.cos(heading)*.04,z:pose.z+Math.sin(heading)*.04,heading:Math.atan2(Math.sin(heading),Math.cos(heading)),reference:'body-center'};
    }
    function project(template,plan,selection='all',compiled){
        if(!['all','can 1','can 2','can 3','can 4','can 5','can 6','end mission'].includes(selection))throw Error('Choose a mission to generate.');
        if(selection.startsWith('can ')&&Number(selection.slice(4))>plan.deliveries.length)throw Error('That can is not part of this route.');
        if(!template?.files?.['main.xml'])throw Error('The OPT project template is unavailable.');
        const result=JSON.parse(JSON.stringify(template)),parser=new DOMParser(),doc=parser.parseFromString(result.files['main.xml'],'application/xml');
        if(doc.querySelector('parsererror'))throw Error('The OPT workspace could not be read.');
        const workspace=doc.documentElement,top=[...workspace.children];
        const names=new Set(top.filter(e=>e.getAttribute('type')==='procedures_defnoreturn').map(e=>[...e.children].find(f=>f.tagName==='field'&&f.getAttribute('name')==='NAME')?.textContent));
        for(const name of Object.values(helpers))if(!names.has(name))throw Error('The OPT project is missing a required procedure: '+name);
        if(!Array.isArray(compiled))throw Error('Generate a route through the account service first.');
        const route=compiled;
        if(plan.deliveries.length>6)throw Error('This OPT template supports can 1-6. Use no more than six cans.');
        // Replace only mission bodies. Keep every helper, event, startup block,
        // procedure identity, position and unrelated workspace block intact.
        function replaceMission(name,items){
            const node=top.find(e=>e.getAttribute('type')==='procedures_defnoreturn'&&
                [...e.children].some(f=>f.tagName==='field'&&f.getAttribute('name')==='NAME'&&f.textContent===name));
            if(!node)throw Error('The OPT project is missing a mission procedure: '+name);
            let stack=[...node.children].find(e=>e.tagName==='statement'&&e.getAttribute('name')==='STACK');
            if(!stack){stack=doc.createElementNS(workspace.namespaceURI,'statement');stack.setAttribute('name','STACK');node.appendChild(stack);}
            const parsed=parser.parseFromString('<xml xmlns="'+workspace.namespaceURI+'">'+chain(items)+'</xml>','application/xml');
            if(parsed.querySelector('parsererror'))throw Error('Could not generate the mission blocks.');
            stack.replaceChildren(...[...parsed.documentElement.children].map(e=>doc.importNode(e,true)));
        }
        for(let i=0;i<6;i++)if(selection==='all'||selection==='can '+(i+1))replaceMission('can '+(i+1),i<plan.deliveries.length?
            route.slice(i*2,i*2+2).flatMap(leg=>leg.items):[]);
        if(selection==='all'||selection==='end mission')replaceMission('end mission',plan.returnToStart?route.at(-1).items:[]);
        result.files['main.xml']=new XMLSerializer().serializeToString(doc);
        delete result.files['main.py'];
        const config=JSON.parse(result.files['config.json']);config.mode='block';config.board='buildbot';config.github=null;result.files['config.json']=JSON.stringify(config);
        result.meta=result.meta||{};result.meta.fieldLayout=plan.layout;
        result.meta.defaultRobotPosition=startPose(plan);
        result.files['delivery-route.json']=JSON.stringify(plan);
        return result;
    }
    function applyToWorkspace(workspace,Blockly,plan,selection='all',compiled){
        if(!workspace)throw Error('Open the OPT program in Block mode first.');
        const template={files:{'main.xml':Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace)),'config.json':'{}'}};
        const generated=project(template,plan,selection,compiled);
        const dom=new DOMParser().parseFromString(generated.files['main.xml'],'application/xml');
        const names=['can 1','can 2','can 3','can 4','can 5','can 6','end mission'];
        const replacements=names.filter(name=>selection==='all'||name===selection).map(name=>{
            const target=workspace.getTopBlocks(false).find(b=>b.type==='procedures_defnoreturn'&&b.getFieldValue('NAME')===name);
            if(!target?.getInput('STACK'))throw Error('Missing mission procedure: '+name);
            const definition=[...dom.documentElement.children].find(n=>[...n.children].some(f=>f.tagName==='field'&&f.getAttribute('name')==='NAME'&&f.textContent===name));
            const body=[...definition.children].find(n=>n.tagName==='statement'&&n.getAttribute('name')==='STACK')?.firstElementChild;
            for(const b of body?[body,...body.querySelectorAll('block,shadow')]:[])if(!Blockly.Blocks[b.getAttribute('type')])throw Error('Missing block: '+b.getAttribute('type'));
            return {target,body};
        });
        Blockly.Events.setGroup(true);
        try{
            for(const {target,body} of replacements){
                const connection=target.getInput('STACK').connection;
                const replacement=body?Blockly.Xml.domToBlock(body,workspace):null;
                connection.targetBlock()?.dispose(false);
                if(replacement)connection.connect(replacement.previousConnection);
            }
        }finally{Blockly.Events.setGroup(false);}
        return generated.meta.defaultRobotPosition;
    }
    const api={project,chain,applyToWorkspace,startPose};root.SimDeliveryBlocks=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
