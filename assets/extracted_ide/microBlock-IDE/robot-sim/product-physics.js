(function(root){
    'use strict';
    const vector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
    const positiveMass=value=>Number.isFinite(value)&&value>=0?value:.1;
    const inertia=value=>vector(value)&&value.every(n=>n>0);
    // Authoring coordinates are metres in the component's unscaled geometry
    // frame. Instance transforms belong to Assembly, not to the product file.
    function estimate(T,mesh,physics){
        physics=physics||{};
        const geometry=mesh&&mesh.geometry;
        if(!geometry)throw new Error('A component mesh is required to estimate mass properties.');
        if(!geometry.boundingBox)geometry.computeBoundingBox();
        const bounds=geometry.boundingBox,center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
        const mass=positiveMass(physics.mass),com=vector(physics.centerOfMass)?physics.centerOfMass.slice():center.toArray();
        const dx=com[0]-center.x,dy=com[1]-center.y,dz=com[2]-center.z;
        // The box estimate is explicitly an approximation. An authored tensor
        // can replace it when CAD or measured mass properties are available.
        const estimated=[
            mass*((size.y*size.y+size.z*size.z)/12+dy*dy+dz*dz),
            mass*((size.x*size.x+size.z*size.z)/12+dx*dx+dz*dz),
            mass*((size.x*size.x+size.y*size.y)/12+dx*dx+dy*dy)
        ];
        return {mass,centerOfMass:com,inertia:inertia(physics.inertia)?physics.inertia.slice():estimated.map(n=>Math.max(1e-12,n)),collider:['box','sphere','cylinder'].includes(physics.collider)?physics.collider:'auto'};
    }
    function scaledInertia(value,scale){
        const sx=scale.x*scale.x,sy=scale.y*scale.y,sz=scale.z*scale.z;
        if(Math.abs(sx-sy)<1e-12&&Math.abs(sy-sz)<1e-12)return value.map(n=>Math.max(1e-12,n*sx));
        // Recover the diagonal second mass moments before applying scale.
        // This handles nonuniformly scaled instances while mass stays fixed.
        const xx=Math.max(0,(value[1]+value[2]-value[0])/2),yy=Math.max(0,(value[0]+value[2]-value[1])/2),zz=Math.max(0,(value[0]+value[1]-value[2])/2);
        return [sy*yy+sz*zz,sx*xx+sz*zz,sx*xx+sy*yy].map(n=>Math.max(1e-12,n));
    }
    function aggregate(T,components){
        const center=new T.Vector3();let mass=0;
        for(const item of components||[]){
            if(!item||!item.mesh||!item.mesh.geometry)continue;
            const properties=estimate(T,item.mesh,item.physics);
            item.mesh.updateWorldMatrix(true,false);
            center.addScaledVector(item.mesh.localToWorld(new T.Vector3().fromArray(properties.centerOfMass)),properties.mass);
            mass+=properties.mass;
        }
        if(mass)center.divideScalar(mass);
        return {mass,centerOfMass:center.toArray()};
    }
    root.ProductPhysics={estimate,aggregate,scaledInertia};
    if(typeof module!=='undefined')module.exports=root.ProductPhysics;
})(typeof window!=='undefined'?window:globalThis);
