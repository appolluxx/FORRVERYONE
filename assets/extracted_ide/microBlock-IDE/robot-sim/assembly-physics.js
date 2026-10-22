(function(root){
    'use strict';
    const C=root.CANNON||(typeof require==='function'?require('./vendor/cannon-0.6.2.min.js'):null);
    const ProductPhysics=root.ProductPhysics||(typeof require==='function'?require('./product-physics.js'):null);
    const cv=v=>new C.Vec3(v.x,v.y,v.z);
    const colliderCache=new WeakMap();
    // Sweep held spherical props against the solver's colliders, then slide along
    // the contact plane. Pointer jumps must not teleport paper through a bin wall.
    function sweepHeldSphere(world,body,target){
        const ball=body.shapes.find(s=>s.type===C.Shape.types.SPHERE);if(!ball)return target;
        const radius=ball.radius,position=body.position.clone();let remaining=target.vsub(position);
        for(let pass=0;pass<4&&remaining.lengthSquared()>1e-12;pass++){
            let best=null;
            for(const obstacle of world.bodies){
                if(obstacle===body||!obstacle.collisionResponse)continue;
                for(let i=0;i<obstacle.shapes.length;i++){
                    const shape=obstacle.shapes[i];if(!shape.collisionResponse)continue;
                    const rotation=obstacle.quaternion.mult(obstacle.shapeOrientations[i]),inverse=rotation.conjugate();
                    const origin=obstacle.quaternion.vmult(obstacle.shapeOffsets[i]).vadd(obstacle.position);
                    const p=inverse.vmult(position.vsub(origin)),d=inverse.vmult(remaining);let t=null,normal=null;
                    if(shape.type===C.Shape.types.PLANE){
                        if(d.z<0&&p.z>=radius-1e-5){t=(radius-p.z)/d.z;normal=new C.Vec3(0,0,1);}
                    }else if(shape.type===C.Shape.types.SPHERE){
                        const r=radius+shape.radius,a=d.dot(d),b=p.dot(d),c=p.dot(p)-r*r,disc=b*b-a*c;
                        if(c>=-1e-6&&b<0&&disc>=0){t=(-b-Math.sqrt(disc))/a;normal=p.vadd(d.scale(t));normal.normalize();}
                    }else{
                        let lo,hi;
                        if(shape.type===C.Shape.types.BOX){lo=shape.halfExtents.negate();hi=shape.halfExtents;}
                        else if(shape.vertices){lo=new C.Vec3(Infinity,Infinity,Infinity);hi=new C.Vec3(-Infinity,-Infinity,-Infinity);for(const v of shape.vertices)for(const axis of ['x','y','z']){lo[axis]=Math.min(lo[axis],v[axis]);hi[axis]=Math.max(hi[axis],v[axis]);}}
                        if(!lo)continue;
                        let enter=-Infinity,leave=Infinity,axisHit=null,sign=0;
                        for(const axis of ['x','y','z']){
                            const min=lo[axis]-radius,max=hi[axis]+radius;
                            if(Math.abs(d[axis])<1e-10){if(p[axis]<min||p[axis]>max){leave=-Infinity;break;}continue;}
                            let a=(min-p[axis])/d[axis],b=(max-p[axis])/d[axis];const side=d[axis]>0?-1:1;if(a>b)[a,b]=[b,a];
                            if(a>enter){enter=a;axisHit=axis;sign=side;}leave=Math.min(leave,b);
                        }
                        if(enter>=-1e-6&&enter<=leave&&axisHit){t=enter;normal=new C.Vec3();normal[axisHit]=sign;}
                    }
                    if(t!==null&&t>=-1e-6&&t<=1&&(!best||t<best.t))best={t:Math.max(0,t),normal:rotation.vmult(normal)};
                }
            }
            if(!best){position.vadd(remaining,position);break;}
            const fraction=Math.max(0,best.t-1e-5/Math.max(1e-8,remaining.length()));position.vadd(remaining.scale(fraction),position);
            remaining.scale(1-fraction,remaining);const into=remaining.dot(best.normal);if(into<0)remaining.vsub(best.normal.scale(into),remaining);
        }
        return position;
    }
    // Small tapered solids need their actual outer envelope at the floor.
    // An AABB extends the narrow bottom of a support bracket to its full
    // width and makes those imaginary corners catch when the robot pitches.
    function lowerHull(T,node,vertex){
        const size=node.box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
        if(!(span>0)||size.y<span*.02||Math.max(size.x,size.z)<size.y*2)return null;
        const horizontal=size.x>size.z?'x':'z',depth=horizontal==='x'?'z':'x';
        const unique=new Map(),bottom=new T.Box3(),cut=node.box.min.y+size.y*.12;
        for(const {face} of node.faces)for(let i=face.first*3;i<(face.last+1)*3;i++){
            const p=vertex(i),key=[p[horizontal],p.y].map(n=>Math.round(n/span*1e6)).join(',');
            if(!unique.has(key))unique.set(key,[p[horizontal],p.y]);
            if(p.y<=cut)bottom.expandByPoint(p);
            if(unique.size>1024)return null;
        }
        if(bottom.getSize(new T.Vector3())[horizontal]>=size[horizontal]*.75)return null;
        // Extrude the convex vertical profile across the solid's thickness.
        // This remains conservative in the short horizontal direction, while
        // following the actual tapered underside instead of filling its air.
        const points=Array.from(unique.values()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
        if(points.length<3)return null;
        const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
        const lower=[],upper=[];
        for(const p of points){while(lower.length>1&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
        for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>1&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
        lower.pop();upper.pop();const profile=lower.concat(upper),count=profile.length;
        if(count<3||count>64)return null;
        const center=node.box.getCenter(new T.Vector3()),vertices=[];
        for(const edge of ['min','max'])for(const p of profile){
            const v=new T.Vector3();v[horizontal]=p[0];v.y=p[1];v[depth]=node.box[edge][depth];vertices.push(v.sub(center));
        }
        const faces=[Array.from({length:count},(_,i)=>i),Array.from({length:count},(_,i)=>count+i)];
        for(let i=0;i<count;i++){const next=(i+1)%count;faces.push([i,next,next+count,i+count]);}
        const inside=vertices.reduce((sum,v)=>sum.add(v),new T.Vector3()).divideScalar(vertices.length);
        for(const face of faces){
            const a=vertices[face[0]],normal=new T.Vector3().subVectors(vertices[face[1]],a).cross(new T.Vector3().subVectors(vertices[face[2]],a));
            if(normal.lengthSq()<span*span*span*span*1e-16)return null;
            if(normal.dot(new T.Vector3().subVectors(inside,a))>0)face.reverse();
        }
        // Cannon expects a convex shape's local origin inside its volume.
        vertices.forEach(v=>v.sub(inside));center.add(inside);
        return {center:center.toArray(),vertices:vertices.map(v=>v.toArray()),faces,sourceNode:node.faces[0].face.sourceNode};
    }
    // Preserve separate low GLB solids instead of filling the empty space
    // between them with the chassis bounding box. No surface IDs are assumed.
    function lowerColliders(T,g){
        if(colliderCache.has(g))return colliderCache.get(g);
        const faces=g.userData.brepFaces||[],box=g.boundingBox,positions=g.attributes.position;
        const nodes=new Map(),v=new T.Vector3(),size=box.getSize(new T.Vector3());
        const cut=box.min.y+size.y*.1,span=Math.max(size.x,size.y,size.z);
        const vertex=i=>v.fromBufferAttribute(positions,g.index?g.index.getX(i):i);
        for(const face of faces){
            if(face.sourceNode===undefined)continue;
            let node=nodes.get(face.sourceNode);
            if(!node){node={box:new T.Box3(),faces:[]};nodes.set(face.sourceNode,node);}
            const bounds=new T.Box3();
            for(let i=face.first*3;i<(face.last+1)*3;i++)bounds.expandByPoint(vertex(i));
            node.box.union(bounds);node.faces.push({face,bounds});
        }
        const low=Array.from(nodes.values()).filter(n=>n.box.min.y<cut);
        if(!nodes.size||!low.length||low.length>64){colliderCache.set(g,null);return null;}
        // Small equipment can afford one proxy per imported solid. A single
        // upper envelope bridges air between the PCB, pins and connectors,
        // causing a tilted sensor to rest on invisible corners.
        const compound=nodes.size<=64;
        const boxes=[],supports=[],hulls=[];
        for(const node of low){
            let support;
            for(const {face,bounds} of node.faces){
                if(face.last-face.first<50||bounds.min.y>box.min.y+span*.01)continue;
                // Least-squares sphere fit in a normalized local frame. A
                // spherical/hemispherical underside is a ball-support proxy.
                const origin=bounds.getCenter(new T.Vector3()),extent=bounds.getSize(new T.Vector3()).length();
                if(!(extent>0))continue;
                const rows=Array.from({length:4},()=>[0,0,0,0,0]),samples=[];
                const stride=Math.max(1,Math.floor((face.last-face.first+1)*3/256));
                for(let i=face.first*3;i<(face.last+1)*3;i+=stride){
                    const p=vertex(i).clone().sub(origin).divideScalar(extent),a=[2*p.x,2*p.y,2*p.z,1],b=p.lengthSq();samples.push(p);
                    for(let j=0;j<4;j++){for(let k=0;k<4;k++)rows[j][k]+=a[j]*a[k];rows[j][4]+=a[j]*b;}
                }
                let valid=true;
                for(let j=0;j<4;j++){
                    let pivot=j;for(let k=j+1;k<4;k++)if(Math.abs(rows[k][j])>Math.abs(rows[pivot][j]))pivot=k;
                    [rows[j],rows[pivot]]=[rows[pivot],rows[j]];
                    const divisor=rows[j][j];if(Math.abs(divisor)<1e-8){valid=false;break;}
                    for(let k=j;k<5;k++)rows[j][k]/=divisor;
                    for(let k=0;k<4;k++)if(k!==j){const factor=rows[k][j];for(let l=j;l<5;l++)rows[k][l]-=factor*rows[j][l];}
                }
                if(!valid)continue;
                const center=new T.Vector3(rows[0][4],rows[1][4],rows[2][4]),r=Math.sqrt(rows[3][4]+center.lengthSq());
                if(!Number.isFinite(r)||r<=0||samples.some(p=>Math.abs(p.distanceTo(center)-r)>r*.025))continue;
                const radius=r*extent,position=center.multiplyScalar(extent).add(origin);
                // A split ball caster occupies most of its component bounds.
                // The old whole-robot 10% limit rejected it after extraction
                // and substituted a box, whose corners catch during tilting.
                if(radius>span*.6||Math.abs(position.y-radius-bounds.min.y)>radius*.05)continue;
                support={position:position.toArray(),radius,sourceNode:face.sourceNode};break;
            }
            if(support){
                supports.push(support);
                if(compound){const bounds=node.box.clone();bounds.min.y=Math.max(bounds.min.y,support.position[1]);if(bounds.max.y>bounds.min.y)boxes.push(bounds);}
            }
            else{
                const hull=compound&&lowerHull(T,node,vertex);
                if(hull)hulls.push(hull);
                else{const bounds=node.box.clone();if(!compound)bounds.max.y=Math.min(bounds.max.y,cut);boxes.push(bounds);}
            }
        }
        if(compound)Array.from(nodes.values()).filter(node=>!low.includes(node)).forEach(node=>boxes.push(node.box.clone()));
        const result={bottom:cut,boxes,supports,hulls,compound};colliderCache.set(g,result);return result;
    }
    const Kernel=root.AssemblyPhysicsKernel||(typeof require==='function'?require('./assembly-physics-kernel.js'):null);
    const PlaneEquation=Kernel.PlaneEquation;
    function create(T,visual,products,environment){
        if(!C||!products.length||products.some(p=>!p.physicsModel))return null;
        const timeStep=1/240,unitScale=10;
        const world=new C.World();Kernel.installSolver(world);world.gravity.set(0,-9.81,0);
        // Light wheels attached to a heavier chassis need enough iterations
        // for tire contacts and hinges to agree. Under-solving creates creep
        // even with zero motor speed; sleeping would only hide that error.
        world.solver.iterations=320;world.allowSleep=false;
        // One friction pair per contact patch, rather than two equations
        // for every corner of every PCB/connector collision box. Keep all
        // normal contacts, the fixed timestep and the hinge solver budget.
        world.narrowphase.enableFrictionReduction=true;
        world.defaultContactMaterial.friction=.6;world.defaultContactMaterial.restitution=0;
        world.defaultContactMaterial.contactEquationStiffness=1e7;world.defaultContactMaterial.contactEquationRelaxation=4;
        const groundMaterial=new C.Material({friction:1,restitution:0});
        const floor=new C.Body({mass:0,material:groundMaterial}),groundShape=new C.Plane();groundShape.material=groundMaterial;floor.addShape(groundShape);floor.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(floor);
        floor._impactMaterial='plastic';
        const field=environment&&environment.field;
        let fieldBody=null;
        if(field&&Number.isFinite(field.width)&&field.width>0&&Number.isFinite(field.length)&&field.length>0&&Number.isFinite(field.thickness)&&field.thickness>0){
            // Static scene geometry is created directly in solver units. Only
            // the moving entries are converted by the scaling pass below.
            const centerX=Number.isFinite(field.centerX)?field.centerX:0,centerZ=Number.isFinite(field.centerZ)?field.centerZ:0,baseY=Number.isFinite(field.baseY)?field.baseY:0;
            fieldBody=new C.Body({mass:0,material:groundMaterial});
            fieldBody._impactMaterial=field.soundMaterial||'plastic';
            const shape=new C.Box(new C.Vec3(field.width*unitScale/2,field.thickness*unitScale/2,field.length*unitScale/2));
            shape.material=groundMaterial;fieldBody.addShape(shape);
            fieldBody.position.set(centerX*unitScale,(baseY+field.thickness/2)*unitScale,centerZ*unitScale);
            world.addBody(fieldBody);
            for(const rod of field.rods||[]){
                const body=new C.Body({mass:0,material:groundMaterial});
                body._impactMaterial='wood';body._impactSurface='rod';
                const shape=new C.Cylinder(rod.diameter*unitScale/2,rod.diameter*unitScale/2,rod.length*unitScale,16);
                shape.material=groundMaterial;body.addShape(shape);
                body.quaternion.setFromEuler(0,rod.yaw||0,0);
                body.position.set(rod.x*unitScale,(baseY+field.thickness+rod.diameter/2)*unitScale,rod.z*unitScale);
                world.addBody(body);
            }
            for(const part of field.structures||[]){
                if(part.visualOnly)continue;
                const body=new C.Body({mass:0,material:groundMaterial});
                body._impactMaterial=part.soundMaterial||'plastic';
                for(const section of part.collisionParts||[part]){
                    // Each convex patch needs a local origin inside its hull.
                    const center=part.collisionParts?section.vertices.reduce((sum,v)=>sum.map((n,i)=>n+v[i]/section.vertices.length),[0,0,0]):[0,0,0];
                    const shape=section.vertices?new C.ConvexPolyhedron(section.vertices.map(v=>new C.Vec3(...v.map((n,i)=>(n-center[i])*unitScale))),section.faces):new C.Box(new C.Vec3(...section.size.map(n=>n*unitScale/2)));
                    shape.material=groundMaterial;body.addShape(shape,new C.Vec3(...center.map(n=>n*unitScale)));
                }body._fieldStructure=part.name;
                body.position.set(part.x*unitScale,(baseY+field.thickness+part.y)*unitScale,part.z*unitScale);
                body.quaternion.setFromEuler(0,part.yaw,0);world.addBody(body);
            }
        }
        const entries=[],hinges=[],runtimeEntries=new Map(),initialVisualPosition=visual.position.clone();
        let primary,accumulator=0,renderedState=null;
        const vec=a=>new T.Vector3().fromArray(a||[0,0,0]);
        const face=(entry,value)=>{
            const point=entry.mesh.localToWorld(vec(value.center));
            const direction=value.axis?vec(value.axis).transformDirection(entry.mesh.matrixWorld):vec(value.normal).applyNormalMatrix(new T.Matrix3().getNormalMatrix(entry.mesh.matrixWorld));
            return {point:entry.body.pointToLocalFrame(cv(point)),axis:entry.body.vectorToLocalFrame(cv(direction.normalize()))};
        };
        const rigidPairs=[];
        function addMate(a,b,mate){
            if(!a||!b||a===b||!mate.faceA||!mate.faceB)return;
            if(mate.lockRotation){
                rigidPairs.push([a.body,b.body]);
                const constraint=new C.LockConstraint(a.body,b.body,{collideConnected:false});
                constraint.collideConnected=false;
                constraint.equations.forEach(equation=>equation.setSpookParams(1e7,4,timeStep));
                world.addConstraint(constraint);return;
            }
            const fa=face(a,mate.faceA),fb=face(b,mate.faceB),constraint=new C.Constraint(a.body,b.body,{collideConnected:false});
            constraint.authoringMate=true;
            constraint.update=function(){}; // Equations transform their frames in computeB.
            const tangent=new C.Vec3(),other=new C.Vec3();fa.axis.tangents(tangent,other);
            const normals=mate.type==='concentric'?[tangent,other]:mate.type==='plane'?[fa.axis]:[];
            normals.forEach(n=>constraint.equations.push(new PlaneEquation(a.body,b.body,fa.point,fb.point,n)));
            for(const localAxis of [tangent,other]){
                const equation=Kernel.localRotationEquation(a.body,b.body,localAxis,fb.axis);
                constraint.equations.push(equation);
            }
            world.addConstraint(constraint);
            constraint.equations.forEach(equation=>equation.setSpookParams(1e7,4,timeStep));
        }
        visual.updateMatrixWorld(true);
        for(const runtime of products){
            const data=runtime.physicsModel(),manifest=data.manifest,byId=new Map();
            runtimeEntries.set(runtime,byId);
            for(const part of manifest.components){
                const mesh=data.meshes.get(part.id);if(!mesh||!mesh.geometry)continue;
                mesh.updateWorldMatrix(true,false);mesh.geometry.computeBoundingBox();
                const physics=part.physics||{},properties=ProductPhysics.estimate(T,mesh,physics);
                const box=mesh.geometry.boundingBox,localCenter=vec(properties.centerOfMass),worldCenter=mesh.localToWorld(localCenter.clone());
                const rotation=mesh.getWorldQuaternion(new T.Quaternion()),scale=mesh.getWorldScale(new T.Vector3());
                const body=new C.Body({mass:physics.static?0:properties.mass,linearDamping:.015,angularDamping:.025});
                body.position.copy(cv(worldCenter));body.quaternion.set(rotation.x,rotation.y,rotation.z,rotation.w);
                body.material=new C.Material({friction:Number.isFinite(physics.friction)?physics.friction:.6,restitution:0});
                if(Number.isFinite(physics.lateralFriction))body.material.lateralFriction=Math.max(0,physics.lateralFriction);
                if(Number.isFinite(physics.contactStiffness)&&physics.contactStiffness>0)body.material.contactStiffness=physics.contactStiffness;
                body.allowSleep=false;
                const wheelDevice=manifest.devices.find(d=>d.type==='motor'&&['left','right'].includes(d.driveSide)&&manifest.joints.some(j=>j.id===d.jointId&&j.child===part.id));
                let wheelRadius=0;
                if(wheelDevice){
                    const joint=manifest.joints.find(j=>j.id===wheelDevice.jointId),parent=data.meshes.get(joint.parent);
                    const worldAxis=vec(joint.axis).transformDirection(parent.matrixWorld),axis=worldAxis.clone().applyQuaternion(rotation.clone().invert());
                    const pivot=parent.localToWorld(vec(joint.position)),bodyPivot=body.pointToLocalFrame(cv(pivot));
                    let radius=0,lo=Infinity,hi=-Infinity;const positions=mesh.geometry.attributes.position,p=new T.Vector3();
                    for(let i=0;i<positions.count;i++){
                        p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).sub(pivot);const along=p.dot(worldAxis);
                        lo=Math.min(lo,along);hi=Math.max(hi,along);p.addScaledVector(worldAxis,-along);radius=Math.max(radius,p.length());
                    }
                    const offset=bodyPivot.vadd(cv(axis).scale((lo+hi)/2)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis);
                    wheelRadius=radius;
                    if(properties.collider==='auto'){
                        const shape=new C.Cylinder(Math.max(.001,radius),Math.max(.001,radius),Math.max(.001,hi-lo),64);
                        if(Number.isFinite(physics.lateralFriction))shape.frictionAxle=new C.Vec3(0,0,1);
                        body.addShape(shape,offset,new C.Quaternion(q.x,q.y,q.z,q.w));
                    }
                }
                if(properties.collider==='cylinder'){
                    const mount=(part.mounts||[]).find(m=>['shaft','hole'].includes(m.type)&&Array.isArray(m.axis));
                    const axisLocal=vec(physics.colliderAxis||mount&&mount.axis||[1,0,0]);
                    if(axisLocal.lengthSq()<1e-12)axisLocal.set(1,0,0);
                    const worldAxis=axisLocal.normalize().transformDirection(mesh.matrixWorld),axis=worldAxis.clone().applyQuaternion(rotation.clone().invert());
                    const pivot=mesh.localToWorld(box.getCenter(new T.Vector3())),bodyPivot=body.pointToLocalFrame(cv(pivot));
                    const positions=mesh.geometry.attributes.position,p=new T.Vector3();let radius=0,lo=Infinity,hi=-Infinity;
                    for(let i=0;i<positions.count;i++){
                        p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).sub(pivot);const along=p.dot(worldAxis);
                        lo=Math.min(lo,along);hi=Math.max(hi,along);p.addScaledVector(worldAxis,-along);radius=Math.max(radius,p.length());
                    }
                    const offset=bodyPivot.vadd(cv(axis).scale((lo+hi)/2)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis);
                    const shape=new C.Cylinder(Math.max(.00005,radius),Math.max(.00005,radius),Math.max(.0001,hi-lo),64);
                    if(Number.isFinite(physics.lateralFriction))shape.frictionAxle=new C.Vec3(0,0,1);
                    body.addShape(shape,offset,new C.Quaternion(q.x,q.y,q.z,q.w));
                }else if(properties.collider==='sphere'){
                    if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
                    const sphere=mesh.geometry.boundingSphere;
                    body.addShape(new C.Sphere(Math.max(.00005,sphere.radius*Math.max(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z)))),cv(sphere.center.clone().sub(localCenter).multiply(scale)));
                }else if(!wheelDevice||properties.collider!=='auto'){
                    const authoredBoxes=physics.colliderBoxes&&physics.colliderBoxes.length?physics.colliderBoxes.map(b=>new T.Box3(vec(b.min),vec(b.max))):null;
                    const authoredHulls=physics.colliderHulls&&physics.colliderHulls.length?physics.colliderHulls:null;
                    const automatic=!authoredBoxes&&!authoredHulls&&properties.collider==='auto'?lowerColliders(T,mesh.geometry):null;
                    const colliderBox=box.clone();
                    if(automatic)colliderBox.min.y=automatic.bottom;
                    else if(properties.collider==='auto'&&Array.isArray(physics.supports)&&physics.supports.length&&Number.isFinite(physics.colliderBottom)) colliderBox.min.y=Math.min(colliderBox.max.y-.002,Math.max(colliderBox.min.y,physics.colliderBottom));
                    for(const bounds of authoredBoxes||(authoredHulls?[]:(automatic&&automatic.compound?automatic.boxes:[colliderBox].concat(automatic?automatic.boxes:[])))){
                        const half=bounds.getSize(new T.Vector3()).multiply(scale).multiplyScalar(.5),offset=bounds.getCenter(new T.Vector3()).sub(localCenter).multiply(scale);
                        body.addShape(new C.Box(new C.Vec3(Math.max(.00005,Math.abs(half.x)),Math.max(.00005,Math.abs(half.y)),Math.max(.00005,Math.abs(half.z)))),cv(offset));
                    }
                    (authoredHulls||(automatic?automatic.hulls:[])).forEach(hull=>{
                        const vertices=hull.vertices.map(p=>cv(vec(p).multiply(scale)));
                        const faces=scale.x*scale.y*scale.z<0?hull.faces.map(f=>f.slice().reverse()):hull.faces;
                        const shape=new C.ConvexPolyhedron(vertices,faces);shape.sourceNode=hull.sourceNode;
                        body.addShape(shape,cv(vec(hull.center).sub(localCenter).multiply(scale)));
                    });
                    (automatic?automatic.supports:properties.collider==='auto'?(physics.supports||[]):[]).forEach(support=>{
                        // Passive support proxies: friction 0 represents an
                        // ideal free caster, not a silicone drive tire.
                        if(!Array.isArray(support.position)||!(support.radius>0))return;
                        const sphere=new C.Sphere(support.radius*Math.max(Math.abs(scale.x),Math.abs(scale.y),Math.abs(scale.z)));
                        // Older editor sources store the common caster setting
                        // on manually positioned supports. Automatic geometry
                        // must not silently replace that setting with .03.
                        const legacy=physics.supports||[],legacyFriction=legacy.length&&legacy.every(s=>Number.isFinite(s.friction)&&s.friction===legacy[0].friction)?legacy[0].friction:undefined;
                        const friction=Number.isFinite(physics.passiveSupportFriction)?physics.passiveSupportFriction:Number.isFinite(support.friction)?support.friction:Number.isFinite(legacyFriction)?legacyFriction:.002;
                        sphere.material=new C.Material({friction:Math.max(0,friction),restitution:0});
                        sphere.sourceNode=support.sourceNode;
                        body.addShape(sphere,cv(vec(support.position).sub(localCenter).multiply(scale)));
                    });
                }
                body.shapes.forEach(shape=>{shape.gearCollisionProxy=physics.gearCollisionProxy===true;});
                const soundName=(part.name||'')+' '+(part.equipmentId||'');
                body._impactMaterial=physics.soundMaterial||(wheelRadius?'rubber':/paper/i.test(soundName)?'paper':/glass/i.test(soundName)?'glass':/wood|bamboo/i.test(soundName)?'wood':/alumin|metal|steel|motor|screw|battery/i.test(soundName)?'metal':'plastic');
                body.shapes.forEach(shape=>{shape.impactMaterial=body._impactMaterial;});
                world.addBody(body);
                const authoredMassFrame=Array.isArray(physics.centerOfMass)||Array.isArray(physics.inertia);
                const entry={body,mesh,freeDrag:physics.drag3D===true,localCenter,wheelRadius,scale,properties,authoredMassFrame,initialPosition:body.position.clone(),initialQuaternion:body.quaternion.clone(),runtime};
                entries.push(entry);byId.set(part.id,entry);
                if(!primary||(part.kind==='board'||part.boardDefinition)&&(!part.boardRole||part.boardRole==='main'))primary=entry;
            }
            const jointPairs=new Set(manifest.joints.map(j=>[j.parent,j.child].sort().join('|')));
            for(const mate of manifest.mates){
                const a=byId.get(mate.a),b=byId.get(mate.b);if(!a||!b||!mate.faceA||!mate.faceB)continue;
                // An explicit Motion joint replaces rigid authoring mates for
                // that pair, so the intended motor/servo degree remains free.
                if(jointPairs.has([mate.a,mate.b].sort().join('|')))continue;
                addMate(a,b,mate);
            }
            for(const joint of manifest.joints){
                const a=byId.get(joint.parent),b=byId.get(joint.child);if(!a||!b)continue;
                let constraint;
                if(joint.type==='fixed')constraint=new C.LockConstraint(a.body,b.body,{collideConnected:false});
                else{
                    const pivot=a.mesh.localToWorld(vec(joint.position)),axis=vec(joint.axis).transformDirection(a.mesh.matrixWorld);
                    constraint=new C.HingeConstraint(a.body,b.body,{pivotA:a.body.pointToLocalFrame(cv(pivot)),pivotB:b.body.pointToLocalFrame(cv(pivot)),axisA:a.body.vectorToLocalFrame(cv(axis)),axisB:b.body.vectorToLocalFrame(cv(axis)),collideConnected:false,maxForce:1e4});
                    const tangent=new C.Vec3(),other=new C.Vec3();cv(axis).tangents(tangent,other);
                    const refA=a.body.vectorToLocalFrame(tangent),refB=b.body.vectorToLocalFrame(tangent);
                    const wheelCount=Math.max(1,Array.from(byId.values()).filter(e=>e.wheelRadius>0).length);
                    const supportedMass=Array.from(byId.values()).reduce((sum,e)=>sum+e.body.mass,0)/wheelCount;
                    // Tire grip does not increase the motor's available torque.
                    const defaultTorque=b.wheelRadius>0?Math.max(.001,supportedMass*9.81*b.wheelRadius*.6):.08;
                    hinges.push({constraint,joint,data,a,b,defaultTorque,targetSpeed:0,axis:a.body.vectorToLocalFrame(cv(axis)),refA,refB,angle:(joint.home||0)*Math.PI/180,lastAngle:0});
                }
                // Cannon 0.6 Hinge/Lock constructors do not forward this
                // option to their base constructor. Set it explicitly or the
                // coarse chassis collider fights its own attached wheel.
                constraint.collideConnected=false;
                constraint.equations.forEach(equation=>equation.setSpookParams(1e7,4,timeStep));
                world.addConstraint(constraint);
            }
            runtime.setPhysicsDriven(true);
        }
        for(const mate of environment&&environment.assemblyMates||[]){
            const a=mate.a&&runtimeEntries.get(mate.a.runtime),b=mate.b&&runtimeEntries.get(mate.b.runtime);
            addMate(a&&a.get(mate.a.componentId),b&&b.get(mate.b.componentId),mate);
        }
        // A wheel fixed onto a shaft belongs to the shaft's rigid group.
        // Apply the hinge's adjacent-link collision exclusion to that entire
        // group; otherwise the wheel collider fights its motor housing through
        // the small shaft and overpowers the attachment equations.
        const rigidGroup=body=>{
            const seen=new Set(),queue=[body];
            while(queue.length){const current=queue.pop();if(seen.has(current))continue;seen.add(current);rigidPairs.forEach(([a,b])=>{if(a===current)queue.push(b);if(b===current)queue.push(a);});}
            return seen;
        };
        const excluded=new Set(world.constraints.filter(c=>c.collideConnected===false).map(c=>[c.bodyA.id,c.bodyB.id].sort((a,b)=>a-b).join(':')));
        const exclude=(a,b)=>{
            if(a===b)return;const key=[a.id,b.id].sort((x,y)=>x-y).join(':');if(excluded.has(key))return;excluded.add(key);
            const constraint=new C.Constraint(a,b,{collideConnected:false});constraint.update=function(){};world.addConstraint(constraint);
        };
        rigidPairs.forEach(([body])=>{const group=Array.from(rigidGroup(body));group.forEach((a,i)=>group.slice(i+1).forEach(b=>exclude(a,b)));});
        hinges.forEach(h=>rigidGroup(h.a.body).forEach(a=>rigidGroup(h.b.body).forEach(b=>exclude(a,b))));
        const visualRigidGroups=[],grouped=new Set();
        rigidPairs.forEach(([body])=>{
            if(grouped.has(body))return;
            const bodies=Array.from(rigidGroup(body));bodies.forEach(b=>grouped.add(b));
            const anchor=(hinges.find(h=>bodies.includes(h.b.body))||{}).b;
            const parent=anchor?anchor.body:bodies.find(b=>!b.invMass)||body;
            visualRigidGroups.push({parent,children:bodies.filter(b=>b!==parent).map(child=>({child,
                offset:parent.pointToLocalFrame(child.position),rotation:parent.quaternion.conjugate().mult(child.quaternion)}))});
        });
        function alignRigidVisuals(){
            visualRigidGroups.forEach(({parent,children})=>children.forEach(({child,offset,rotation})=>{
                parent.pointToWorldFrame(offset.scale(unitScale),child.position);
                parent.quaternion.mult(rotation,child.quaternion);
                child.aabbNeedsUpdate=true;
            }));
        }
        // Reconciliation must preserve ground contact for the entire connected
        // mechanism. Moving only a wheel would open its fixed shaft mate again.
        const visualContactGroups=[];
        function buildContactGroups(){
        const contactSeen=new Set(),neighbours=new Map(entries.map(e=>[e.body,[]]));
        world.constraints.filter(c=>c.equations.length).forEach(c=>{
            if(neighbours.has(c.bodyA)&&neighbours.has(c.bodyB)){
                neighbours.get(c.bodyA).push(c.bodyB);neighbours.get(c.bodyB).push(c.bodyA);
            }
        });
        entries.forEach(({body})=>{
            if(contactSeen.has(body))return;
            const group=[],queue=[body];
            while(queue.length){const b=queue.pop();if(contactSeen.has(b))continue;contactSeen.add(b);group.push(b);queue.push(...neighbours.get(b));}
            // A loose body receives no mate projection, so its clearance
            // cannot change here and needs no second collision-bound scan.
            if(group.length>1&&group.every(b=>b.invMass>0))visualContactGroups.push(group);
        });
        }
        const clearancePosition=new C.Vec3(),clearanceRotation=new C.Quaternion(),clearanceLo=new C.Vec3(),clearanceHi=new C.Vec3();
        function groundClearance(group){
            let clearance=Infinity;
            group.forEach(body=>{
                // Evaluate each shape separately: a compound's empty space
                // must not count as support over the edge of the field.
                body.shapes.forEach((shape,i)=>{
                    const p=clearancePosition,q=clearanceRotation,lo=clearanceLo,hi=clearanceHi;
                    body.pointToWorldFrame(body.shapeOffsets[i],p);body.quaternion.mult(body.shapeOrientations[i],q);
                    shape.calculateWorldAABB(p,q,lo,hi);
                    let top=0;
                    if(fieldBody){
                        const half=fieldBody.shapes[0].halfExtents,center=fieldBody.position;
                        if(hi.x>center.x-half.x&&lo.x<center.x+half.x&&hi.z>center.z-half.z&&lo.z<center.z+half.z&&hi.y>center.y+half.y)
                            top=Math.max(top,center.y+half.y);
                    }
                    clearance=Math.min(clearance,lo.y-top);
                });
            });
            return clearance;
        }
        if(!entries.length){world.removeBody(floor);if(fieldBody)world.removeBody(fieldBody);return null;}
        const canPhysics=environment&&environment.cans?(root.SimFieldCans||(typeof require==='function'?require('./field-cans'):null)).attach(C,T,world,environment.cans,unitScale):null;
        Kernel.installImpactAudio(world,unitScale);
        function sync(){
            if(canPhysics)canPhysics.sync();
            visual.updateMatrixWorld(true);
            entries.forEach(({body,mesh,localCenter,bodyFrame})=>{
                const rotation=bodyFrame?body.quaternion.mult(bodyFrame.quaternion):body.quaternion;
                const position=bodyFrame?body.pointToWorldFrame(bodyFrame.position):body.position;
                const worldQ=new T.Quaternion(rotation.x,rotation.y,rotation.z,rotation.w),parentQ=mesh.parent.getWorldQuaternion(new T.Quaternion());
                mesh.quaternion.copy(parentQ.invert().multiply(worldQ));
                const centerLocal=mesh.parent.worldToLocal(new T.Vector3(position.x,position.y,position.z).divideScalar(unitScale));
                mesh.position.copy(centerLocal).sub(localCenter.clone().multiply(mesh.scale).applyQuaternion(mesh.quaternion));mesh.updateMatrix();
            });
            visual.updateMatrixWorld(true);
        }
        // ADC optics only need their component's current world matrix. Building
        // it directly avoids replacing/restoring every rendered mesh (and all
        // their artwork descendants) on each firmware scan.
        const sensorEntries=new Map(entries.map(entry=>[entry.mesh,entry]));
        const sensorMatrices=new WeakMap(),sensorParentInverse=new T.Matrix4();
        const sensorParentPosition=new T.Vector3(),sensorParentScale=new T.Vector3(),sensorCenter=new T.Vector3(),sensorOffset=new T.Vector3();
        const sensorParentQuaternion=new T.Quaternion(),sensorLocalQuaternion=new T.Quaternion();
        const sensorBodyPosition=new C.Vec3(),sensorBodyQuaternion=new C.Quaternion();
        function sensorMatrixWorld(mesh){
            const entry=sensorEntries.get(mesh);
            if(!entry)return null;
            const {body,bodyFrame,localCenter}=entry;
            const rotation=bodyFrame?body.quaternion.mult(bodyFrame.quaternion,sensorBodyQuaternion):body.quaternion;
            const position=bodyFrame?body.pointToWorldFrame(bodyFrame.position,sensorBodyPosition):body.position;
            // Component meshes are siblings under their product root. Updating
            // this ancestor chain does not traverse the component descendants.
            mesh.parent.updateWorldMatrix(true,false);
            mesh.parent.matrixWorld.decompose(sensorParentPosition,sensorParentQuaternion,sensorParentScale);
            sensorLocalQuaternion.set(rotation.x,rotation.y,rotation.z,rotation.w);
            sensorLocalQuaternion.premultiply(sensorParentQuaternion.invert());
            sensorParentInverse.copy(mesh.parent.matrixWorld).invert();
            sensorCenter.set(position.x,position.y,position.z).divideScalar(unitScale).applyMatrix4(sensorParentInverse);
            sensorOffset.copy(localCenter).multiply(mesh.scale).applyQuaternion(sensorLocalQuaternion);
            sensorCenter.sub(sensorOffset);
            let matrix=sensorMatrices.get(mesh);
            if(!matrix){matrix=new T.Matrix4();sensorMatrices.set(mesh,matrix);}
            return matrix.compose(sensorCenter,sensorLocalQuaternion,mesh.scale).premultiply(mesh.parent.matrixWorld);
        }
        function stabilizeAxles(){
            // Project only the five constrained hinge degrees of freedom.
            // Spin around the axle remains physical; loose/partial mates are
            // deliberately untouched. This prevents small-body solver drift
            // from appearing as a flexible shaft after tire contact impulses.
            for(let pass=0;pass<6;pass++)for(const h of hinges){
                const a=h.a.body,b=h.b.body,c=h.constraint,total=a.invMass+b.invMass;if(!total)continue;
                const axisA=a.quaternion.vmult(c.axisA),axisB=b.quaternion.vmult(c.axisB);
                const rotation=new C.Quaternion();
                if(b.invMass){rotation.setFromVectors(axisB,axisA);rotation.mult(b.quaternion,b.quaternion);b.quaternion.normalize();}
                else {rotation.setFromVectors(axisA,axisB);rotation.mult(a.quaternion,a.quaternion);a.quaternion.normalize();}
                const pa=a.pointToWorldFrame(c.pivotA),pb=b.pointToWorldFrame(c.pivotB),gap=pb.vsub(pa);
                a.position.vadd(gap.scale(a.invMass/total),a.position);b.position.vsub(gap.scale(b.invMass/total),b.position);
                a.aabbNeedsUpdate=b.aabbNeedsUpdate=true;
            }
        }
        const visualPoses=entries.map(()=>({position:new C.Vec3(),quaternion:new C.Quaternion()}));
        const visualClearances=[];
        function syncAligned(){
            // Keep the visual axle precise without feeding a positional snap
            // back into next frame's contact solver (which injects energy).
            entries.forEach((e,i)=>{visualPoses[i].position.copy(e.body.position);visualPoses[i].quaternion.copy(e.body.quaternion);});
            visualContactGroups.forEach((group,i)=>{visualClearances[i]=groundClearance(group);});
            stabilizeAxles();alignRigidVisuals();
            visualContactGroups.forEach((group,i)=>{
                // Preserve solver clearance, including its small contact
                // tolerance; never snap an airborne body down onto the field.
                const lift=Math.max(0,Math.min(0,visualClearances[i])-groundClearance(group));
                if(Number.isFinite(lift)&&lift>0)group.forEach(body=>{body.position.y+=lift;body.aabbNeedsUpdate=true;});
            });
            sync();
            entries.forEach((e,i)=>{e.body.position.copy(visualPoses[i].position);e.body.quaternion.copy(visualPoses[i].quaternion);e.body.aabbNeedsUpdate=true;});
        }
        function step(dt){renderedState=null;accumulator+=Math.max(0,Math.min(.05,dt||0));while(accumulator>=timeStep){Kernel.motors(hinges,timeStep,unitScale);Kernel.stepWorld(world,timeStep);accumulator-=timeStep;}syncAligned();}
        function reset(){world._audioImpacts=[];for(const i of world._dragHeld||[])Kernel.setHeld(world,i,false);if(canPhysics)canPhysics.reset();renderedState=null;entries.forEach(e=>{e.body.position.copy(e.initialPosition);e.body.quaternion.copy(e.initialQuaternion);e.body.velocity.set(0,0,0);e.body.angularVelocity.set(0,0,0);e.body.force.set(0,0,0);e.body.torque.set(0,0,0);e.body.aabbNeedsUpdate=true;e.body.wakeUp();});hinges.forEach(h=>{h.angle=(h.joint.home||0)*Math.PI/180;h.lastAngle=0;h.targetSpeed=0;});accumulator=0;sync();}
        // Solve in decimetres: millimetre-sized wheel inertias otherwise make
        // contact and hinge equations poorly conditioned in this solver.
        world.gravity.scale(unitScale,world.gravity);
        entries.forEach(e=>{
            const b=e.body;b.position.scale(unitScale,b.position);e.initialPosition.copy(b.position);
            b.shapeOffsets.forEach(v=>v.scale(unitScale,v));
            b.shapes.forEach(shape=>{
                if(shape.halfExtents){shape.halfExtents.scale(unitScale,shape.halfExtents);shape.updateConvexPolyhedronRepresentation();}
                else if(shape.radius!==undefined){shape.radius*=unitScale;}
                else if(shape.vertices){shape.vertices.forEach(v=>v.scale(unitScale,v));}
                shape.updateBoundingSphereRadius();
            });
            b.aabbNeedsUpdate=true;b.updateBoundingRadius();
            if(e.authoredMassFrame&&b.mass>0){
                const inertia=ProductPhysics.scaledInertia(e.properties.inertia,e.scale).map(n=>n*unitScale*unitScale),update=b.updateMassProperties;
                // Cannon recomputes an AABB tensor whenever mass properties
                // update. Reapply the authored tensor in solver length units.
                b.updateMassProperties=function(){
                    update.call(this);
                    if(this.mass>0){
                        this.inertia.set(inertia[0],inertia[1],inertia[2]);
                        this.invInertia.set(1/inertia[0],1/inertia[1],1/inertia[2]);
                        this.updateInertiaWorld(true);
                    }
                };
            }
            b.updateMassProperties();
        });
        const scaledPoints=new Set();
        world.constraints.forEach(c=>{
            if(c.pivotA){c.pivotA.scale(unitScale,c.pivotA);c.pivotB.scale(unitScale,c.pivotB);}
            c.equations.forEach(e=>{if(e instanceof PlaneEquation){for(const p of [e.pa,e.pb])if(!scaledPoints.has(p)){p.scale(unitScale,p);scaledPoints.add(p);}}e.minForce*=unitScale*unitScale;e.maxForce*=unitScale*unitScale;});
        });
        const replacements=Kernel.compound(world,entries,hinges);
        Kernel.coupleJoints(world,hinges,timeStep,unitScale);
        for(let i=visualRigidGroups.length-1;i>=0;i--)if(replacements.has(visualRigidGroups[i].parent))visualRigidGroups.splice(i,1);
        buildContactGroups();
        function connectedBodies(anchor){
            const group=new Set([anchor]),queue=[anchor];
            while(queue.length){const b=queue.pop();for(const c of world.constraints){const other=c.bodyA===b?c.bodyB:c.bodyB===b?c.bodyA:null;if(other&&!group.has(other)&&entries.some(e=>e.body===other)){group.add(other);queue.push(other);}}}
            return group;
        }
        function placementBody(index){return Number.isInteger(index)&&world.bodies[index]&&entries.some(e=>e.body===world.bodies[index])?world.bodies[index]:primary.body;}
        function placementState(index){const b=placementBody(index);const e=new C.Vec3();b.quaternion.toEuler(e,'YZX');return {index:world.bodies.indexOf(b),x:b.position.x/unitScale,y:b.position.y/unitScale,z:b.position.z/unitScale,heading:b===primary.body?api.readState().heading:e.y,freeDrag:entries.some(e=>e.body===b&&e.freeDrag)};}
        const api={world,body:primary.body,unitScale,entries,step,reset,sensorMatrixWorld,
            playbackParents(){
                // A spanning forest of actual rigid bodies/hinges; free parts
                // remain independent and closed linkage loops add no cycles.
                const groups=new Map();for(const e of entries){if(!groups.has(e.body))groups.set(e.body,[]);groups.get(e.body).push(e.mesh);}
                const links=[],seen=new Set(),queue=[];
                for(const start of [primary.body,...groups.keys()]){
                    if(seen.has(start))continue;seen.add(start);queue.push(start);
                    while(queue.length){const body=queue.shift(),meshes=groups.get(body);if(!meshes)continue;
                        const parent=meshes[0];for(const node of meshes.slice(1))links.push({node,parent});
                        for(const h of hinges){const other=h.a.body===body?h.b.body:h.b.body===body?h.a.body:null;
                            if(!other||seen.has(other)||!groups.has(other))continue;
                            seen.add(other);links.push({node:groups.get(other)[0],parent});queue.push(other);
                        }
                    }
                }return links;
            },
            placementState,
            placementForMesh(mesh){let selected;for(let node=mesh;node&&!selected;node=node.parent)selected=entries.find(e=>e.mesh===node);if(!selected)return null;const group=connectedBodies(selected.body);return placementState(world.bodies.indexOf(group.has(primary.body)?primary.body:selected.body));},
            controlDescriptor(bindings,obstacles){
                const sensors=[],motors=[],distances=[];
                for(const {port,device,runtime,triggerPort,triggerError} of bindings){
                    const data=runtime.physicsModel();
                    if(device.type==='motor'){
                        const hinge=hinges.findIndex(h=>h.data.commands===data.commands&&h.joint.id===device.jointId);
                        if(hinge>=0)motors.push({port,hinge,device});
                    }
                    if(device.type!=='line-sensor'&&!(obstacles&&device.type==='distance-sensor'))continue;
                    const mesh=data.meshes.get(device.componentId),entry=sensorEntries.get(mesh);
                    if(!entry)continue;
                    const matrix=sensorMatrixWorld(mesh);
                    const position=new T.Vector3().fromArray(device.position||[0,0,0]).applyMatrix4(matrix).multiplyScalar(unitScale);
                    const direction=new T.Vector3(0,0,-1).applyEuler(new T.Euler(...(device.rotation||[0,0,0]).map(v=>v*Math.PI/180))).transformDirection(matrix);
                    const point=entry.body.pointToLocalFrame(new C.Vec3(position.x,position.y,position.z));
                    const axis=entry.body.vectorToLocalFrame(new C.Vec3(direction.x,direction.y,direction.z));
                    const descriptor={port,device,body:world.bodies.indexOf(entry.body),position:[point.x,point.y,point.z],direction:[axis.x,axis.y,axis.z]};
                    if(device.type==='distance-sensor'){
                        const excluded=[];runtime.root.traverse(object=>excluded.push(object.id));
                        distances.push({...descriptor,triggerPort,triggerError,excluded});
                    }else sensors.push(descriptor);
                }
                const q=primary.initialQuaternion;
                // Copy ray-test geometry once, without textures or render state.
                // Each dynamic mesh retains its body-local transform so the
                // worker tests the current pose, including held/moving cans.
                const distanceMeshes=[];
                if(distances.length)api.withLatestPhysicsPose(()=>{
                    const owners=new Map(entries.concat(canPhysics?canPhysics.entries:[]).map(e=>[e.mesh,e.body])),seen=new Set();
                    for(const rootMesh of obstacles)rootMesh.traverse(mesh=>{
                        if(!mesh.isMesh||!mesh.geometry||seen.has(mesh.id))return;seen.add(mesh.id);
                        const geometry=mesh.geometry.isBufferGeometry?mesh.geometry:new T.BufferGeometry().fromGeometry(mesh.geometry),position=geometry.attributes.position;if(!position)return;
                        let body;for(let node=mesh;node&&!body;node=node.parent)body=owners.get(node);
                        const matrix=mesh.matrixWorld.clone();
                        if(body){const frame=new T.Matrix4().compose(new T.Vector3(body.position.x,body.position.y,body.position.z).divideScalar(unitScale),new T.Quaternion(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w),new T.Vector3(1,1,1));matrix.premultiply(frame.invert());}
                        const positions=new Float32Array(position.count*3);for(let i=0;i<position.count;i++){positions[i*3]=position.getX(i);positions[i*3+1]=position.getY(i);positions[i*3+2]=position.getZ(i);}
                        distanceMeshes.push({id:mesh.id,body:body?world.bodies.indexOf(body):-1,matrix:matrix.toArray(),positions,index:geometry.index?Array.from(geometry.index.array):null,groups:geometry.groups,drawRange:geometry.drawRange,sides:Array.isArray(mesh.material)?mesh.material.map(m=>m.side):mesh.material.side});
                    });
                });
                return {sensors,motors,distances,distanceMeshes,unitScale,imu:{body:world.bodies.indexOf(primary.body),initial:[q.x,q.y,q.z,q.w]}};
            },
            moveToXZ(x,z,heading,bodyIndex,y,held){
                // Interactive placement uses the body's actual world centre.
                // Saved/default robot poses retain the legacy scene reference.
                const pose=Number.isInteger(bodyIndex)?placementState(bodyIndex):api.readState();let dx=(x-pose.x)*unitScale,dz=(z-pose.z)*unitScale,dy=Number.isFinite(y)?(y-pose.y)*unitScale:0;
                if(!Number.isFinite(dx)||!Number.isFinite(dz))return;
                const turn=new C.Quaternion();turn.setFromAxisAngle(new C.Vec3(0,1,0),Number.isFinite(heading)?heading-pose.heading:0);
                const anchor=placementBody(bodyIndex),pivot=anchor.position.clone();
                if(held===true&&pose.freeDrag){const next=sweepHeldSphere(world,anchor,anchor.position.vadd(new C.Vec3(dx,dy,dz)));dx=next.x-pivot.x;dy=next.y-pivot.y;dz=next.z-pivot.z;}
                const bodies=connectedBodies(anchor);
                bodies.forEach(b=>{
                    const offset=turn.vmult(b.position.vsub(pivot));pivot.vadd(offset,b.position);
                    b.quaternion.copy(turn.mult(b.quaternion));
                    b.position.x+=dx;b.position.y+=dy;b.position.z+=dz;
                    if(typeof held==='boolean')Kernel.setHeld(world,world.bodies.indexOf(b),held);
                    if(b.previousQuaternion)b.previousQuaternion.copy(b.quaternion);if(b.interpolatedQuaternion)b.interpolatedQuaternion.copy(b.quaternion);b.updateInertiaWorld(true);
                    b.previousPosition.copy(b.position);b.interpolatedPosition.copy(b.position);
                    b.velocity.set(0,0,0);b.angularVelocity.set(0,0,0);b.force.set(0,0,0);b.torque.set(0,0,0);
                    b.aabbNeedsUpdate=true;b.wakeUp();
                });
                world.broadphase.dirty=true;accumulator=0;renderedState=null;syncAligned();
            },
            isActive:()=>entries.some(e=>e.body.sleepState!==C.Body.SLEEPING),
            workerSnapshot:()=>Kernel.snapshot(world,hinges,timeStep,unitScale),
            workerCommands:()=>hinges.map(h=>h.data.commands.get(h.joint.id)||null),
            syncFromWorker:syncAligned,
            drainImpacts:()=>Kernel.drainImpacts(world),
            workerState:()=>Kernel.state(world,hinges),
            readJointAngle(runtime,jointId){
                const productRoot=runtime.physicsModel().root;
                const hinge=hinges.find(h=>h.data.root===productRoot&&h.joint.id===jointId);
                return hinge?hinge.angle*180/Math.PI:null;
            },
            applyWorkerState:packet=>Kernel.applyState(world,hinges,packet),
            withLatestPhysicsPose(sample){
                // Sensors must observe the latest solver pose. The meshes
                // normally retain an older pose for smooth worker playback.
                const saved=entries.concat(canPhysics?canPhysics.entries:[]).map(({mesh})=>({mesh,position:mesh.position.clone(),quaternion:mesh.quaternion.clone()}));
                try{sync();return sample();}
                finally{
                    saved.forEach(({mesh,position,quaternion})=>{mesh.position.copy(position);mesh.quaternion.copy(quaternion);mesh.updateMatrixWorld(true);});
                    visual.updateMatrixWorld(true);
                }
            },
            renderWorkerState(previous,current,alpha,latest){
                // Render one sample behind the solver for smooth camera and
                // model updates. Telemetry continues to read the latest state.
                const qa=new T.Quaternion(),qb=new T.Quaternion();
                world.bodies.forEach((body,i)=>{
                    const n=i*13,a=previous.values,b=current.values;
                    body.position.set(a[n]+(b[n]-a[n])*alpha,a[n+1]+(b[n+1]-a[n+1])*alpha,a[n+2]+(b[n+2]-a[n+2])*alpha);
                    qa.set(a[n+3],a[n+4],a[n+5],a[n+6]);qb.set(b[n+3],b[n+4],b[n+5],b[n+6]);qa.slerp(qb,alpha);
                    body.quaternion.set(qa.x,qa.y,qa.z,qa.w);
                });
                syncAligned();renderedState=api.readState();Kernel.applyState(world,hinges,latest||current);
            },
            readVisualState:()=>renderedState||api.readState(),
            readState(){const p=primary.body.position,q=primary.body.quaternion.mult(primary.initialQuaternion.conjugate()),angles=new T.Euler().setFromQuaternion(new T.Quaternion(q.x,q.y,q.z,q.w),'YXZ');return {x:initialVisualPosition.x+(p.x-primary.initialPosition.x)/unitScale,y:initialVisualPosition.y+(p.y-primary.initialPosition.y)/unitScale,z:initialVisualPosition.z+(p.z-primary.initialPosition.z)/unitScale,heading:angles.y,pitch:angles.x,roll:angles.z};},
            dispose(){world.constraints.slice().forEach(c=>world.removeConstraint(c));world.bodies.slice().forEach(b=>world.removeBody(b));products.forEach(p=>p.setPhysicsDriven(false));}};
        return api;
    }
    root.AssemblyPhysics={create};if(typeof module!=='undefined')module.exports=root.AssemblyPhysics;
})(typeof window!=='undefined'?window:globalThis);
