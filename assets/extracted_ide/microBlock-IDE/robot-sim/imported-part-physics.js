(function(root){
    'use strict';
    const materials={plastic:.6,metal:.4,wood:.65,rubber:.9,glass:.3,paper:.5};
    function settings(value){
        const p=value||{},material=Object.hasOwn(materials,p.soundMaterial)?p.soundMaterial:'plastic';
        return {mass:Number.isFinite(p.mass)&&p.mass>0?Math.min(100,p.mass):.1,
            static:p.static===true,collider:['box','sphere','cylinder','auto'].includes(p.collider)?p.collider:'box',
            soundMaterial:material,friction:materials[material]};
    }
    function create(part,mesh){
        const physics=settings(part.physics),component={id:'imported-body',name:part.name||'Imported part',physics};
        const manifest={id:'imported-'+part.id,components:[component],joints:[],devices:[],mates:[]};
        const model={manifest,meshes:new Map([[component.id,mesh]]),root:mesh,commands:new Map()};
        const noop=()=>{};
        return {root:mesh,physics:{mass:physics.static?0:physics.mass,friction:physics.friction},
            physicsModel:()=>model,setPhysicsDriven:noop,update:noop,setMotors:noop,reset:noop,
            applyDisplay:noop,sampleSensors:noop,dispose:noop};
    }
    root.ImportedPartPhysics={settings,create};
    if(typeof module!=='undefined')module.exports=root.ImportedPartPhysics;
})(typeof window!=='undefined'?window:globalThis);
