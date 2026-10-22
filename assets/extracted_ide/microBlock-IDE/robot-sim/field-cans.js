(function(root){
    'use strict';
    const logoUrl=typeof document!=='undefined'&&document.currentScript
        ?new URL('assets/pt-robotics-logo.png',document.currentScript.src).href:null;
    // Cyan marker centers in opt-primary-2025.png (image top maps to -Z).
    const markers=[[.5105172722,.125],[.6144334209,.125],[.1355172722,.375],
        [.3644406640,.625],[.6356080922,.625],[.6144810974,.875]];
    function create(T,field,random){
        // Fixed field layout: the leftmost marker (index 2) is green.
        const colors=['red','red','green','yellow','yellow','green'];
        // sRGB paint colours sampled from the solid target areas of the field.
        const palette={red:0xed1c23,yellow:0xfbda0c,green:0x0f8942};
        const group=new T.Group();group.name='Field cans';
        const geometry=new T.CylinderBufferGeometry(.025,.025,.1,32);
        // Shared visual decal only; the existing can collision shape stays intact.
        const logoGeometry=new T.CylinderBufferGeometry(.0252,.0252,.018*2202/2256,8,1,true,-.36,.72);
        const logoMaterial=new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false});
        let logoTexture=null,disposed=false;
        if(logoUrl)new T.ImageLoader().load(logoUrl,image=>{
            if(disposed)return;
            const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
            canvas.getContext('2d').drawImage(image,0,0,256,256);
            logoTexture=new T.CanvasTexture(canvas);logoTexture.encoding=T.sRGBEncoding;
            logoMaterial.map=logoTexture;logoMaterial.needsUpdate=true;
            items.forEach(p=>p.mesh.children.forEach(child=>{if(child.name==='PT Robotics logo')child.visible=true;}));
        });
        const materials=Object.fromEntries(Object.entries(palette).map(([name,color])=>[name,new T.MeshStandardMaterial({
            color:new T.Color(color).convertSRGBToLinear(),roughness:.8,metalness:0,toneMapped:false
        })]));
        const items=(field.canMarkers||markers).map(([u,v,assignedColor,supportHeight=0],i)=>{
            const color=assignedColor||colors[i],material=materials[color];
            const mesh=new T.Mesh(geometry,[material,material,material]);
            mesh.name=color+' can '+(i+1);mesh.castShadow=mesh.receiveShadow=true;
            const logo=new T.Mesh(logoGeometry,logoMaterial);logo.name='PT Robotics logo';
            logo.position.y=-.033;logo.visible=false;mesh.add(logo);
            mesh.position.set((field.centerX||0)+(u-.5)*field.width,(field.baseY||0)+field.thickness+.05+supportHeight,(field.centerZ||0)+(v-.5)*field.length);
            group.add(mesh);
            return {mesh,color,position:mesh.position.clone(),radius:.025,height:.1,mass:.02};
        });
        function reset(){items.forEach(p=>{p.mesh.position.copy(p.position);p.mesh.quaternion.set(0,0,0,1);});group.updateMatrixWorld(true);}
        return {group,items,reset,dispose(){disposed=true;if(group.parent)group.parent.remove(group);geometry.dispose();logoGeometry.dispose();logoMaterial.dispose();if(logoTexture)logoTexture.dispose();Object.values(materials).forEach(m=>m.dispose());}};
    }
    function attach(C,T,world,cans,scale){
        const entries=cans.items.map(p=>{
            const material=new C.Material({friction:.35,restitution:0});
            const body=new C.Body({mass:p.mass,material,linearDamping:.01,angularDamping:.01,allowSleep:false});
            // Only settled field props may sleep; robot joints remain live.
            body._impactMaterial='metal';
            body._canRest={linearLimit:.001*scale,angularLimit:.03,quiet:0,support:null};
            const shape=new C.Cylinder(p.radius*scale,p.radius*scale,p.height*scale,24);
            shape.groundContactLimit=4;
            shape.material=material;
            const q=new C.Quaternion();q.setFromEuler(-Math.PI/2,0,0);body.addShape(shape,new C.Vec3(),q);
            body.position.set(p.position.x*scale,p.position.y*scale,p.position.z*scale);world.addBody(body);
            return {body,mesh:p.mesh,initial:body.position.clone()};
        });
        function sync(){entries.forEach(({body,mesh})=>{
            const parentQ=mesh.parent.getWorldQuaternion(new T.Quaternion());
            mesh.quaternion.copy(parentQ.invert().multiply(new T.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w)));
            mesh.position.copy(mesh.parent.worldToLocal(new T.Vector3(body.position.x,body.position.y,body.position.z).divideScalar(scale)));
            mesh.updateMatrixWorld(true);
        });}
        function reset(){entries.forEach(({body,initial})=>{
            body.position.copy(initial);body.quaternion.set(0,0,0,1);
            body.previousPosition.copy(initial);body.interpolatedPosition.copy(initial);
            body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.force.set(0,0,0);body.torque.set(0,0,0);
            body.aabbNeedsUpdate=true;body.wakeUp();
            body._canRest.quiet=0;body._canRest.support=null;
        });world.broadphase.dirty=true;sync();}
        return {entries,sync,reset};
    }
    root.SimFieldCans={create,attach};
    if(typeof module!=='undefined')module.exports=root.SimFieldCans;
})(typeof window!=='undefined'?window:globalThis);
