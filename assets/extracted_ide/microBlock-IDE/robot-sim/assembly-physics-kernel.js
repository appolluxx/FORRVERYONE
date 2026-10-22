(function(root){
    'use strict';
    const C=root.CANNON||(typeof require==='function'?require('./vendor/cannon-0.6.2.min.js'):null);
    const Wasm=root.AssemblyPhysicsWasm||(typeof require==='function'?require('./assembly-physics-wasm.js'):null);
    const referenceSolve=C.GSSolver.prototype.solve;
    function installSolver(world){if(world.solver.solve===referenceSolve)world.solver.solve=cachedSolve;}
    function solveWithDiagnostics(solver,solve,dt,world){
        const result=solve.call(solver,dt,world),diagnostics=world._stepDiagnostics;
        if(diagnostics){
            // Cannon and the matching WASM solver return the zero-based last
            // iteration when they converge early, or the budget on exhaustion.
            const iterations=solver.equations.length?Math.min(solver.iterations,result+1):0;
            diagnostics.solverBudget=Math.max(diagnostics.solverBudget,solver.iterations);
            diagnostics.solverIterations=Math.max(diagnostics.solverIterations,iterations);
            diagnostics.solverIterationsTotal+=iterations;
            diagnostics.solverEquations=Math.max(diagnostics.solverEquations,solver.equations.length);
        }
        return result;
    }
    function solveIndependentProps(solver,solve,dt,world){
        if(world.disableIndependentProps)return solveWithDiagnostics(solver,solve,dt,world);
        const equations=solver.equations,props=new Set(world.bodies.filter(b=>b.mass>0&&b.shapes.some(s=>s.groundContactLimit===4)));
        // A can touching the robot or another moving body belongs to that
        // coupled solve. Static scenery transmits no impulse between islands.
        for(const e of equations){
            const moving=[...new Set([e.bi,e.bj,...(e._solverAngularRows||[]).map(r=>r.body)])].filter(b=>b&&b.mass>0);
            if(moving.length>1)moving.forEach(b=>props.delete(b));
        }
        if(!props.size)return solveWithDiagnostics(solver,solve,dt,world);
        const groups=new Map(),main=[];
        for(const e of equations){
            const body=props.has(e.bi)?e.bi:props.has(e.bj)?e.bj:null;
            if(!body){main.push(e);continue;}
            if(!groups.has(body))groups.set(body,[]);groups.get(body).push(e);
        }
        let result=0;
        try{
            solver.equations=main;result=solveWithDiagnostics(solver,solve,dt,world);
            for(const [body,rows]of groups){
                // Keep a separate packed workspace so a small island does not
                // overwrite the large robot's allocation on every substep.
                const local=body._independentSolver||(body._independentSolver=new C.GSSolver());
                // A free can resting/rolling on scenery has no gear or servo
                // loop. Its four support rows do not need the robot's 1280
                // stalled-actuator budget. Restore that budget on contact.
                local.iterations=Math.min(solver.iterations,80);local.tolerance=solver.tolerance;local.equations=rows;
                const allBodies=world.bodies;
                try{
                    world.bodies=[...new Set(rows.flatMap(e=>[e.bi,e.bj]))];
                    result=Math.max(result,solveWithDiagnostics(local,solve,dt,world));
                }finally{world.bodies=allBodies;}
            }
        }finally{solver.equations=equations;}
        return result;
    }
    // The Jacobian and inverse inertia are constant during one GS solve.
    // Cache their product once per step instead of multiplying matrices in
    // every iteration. Equation order, bounds and convergence stay unchanged.
    function cachedSolve(dt,world){
        if(world.referenceSolver)return referenceSolve.call(this,dt,world);
        const equations=this.equations,bodies=world.bodies,n=equations.length;if(!n)return 0;
        for(const e of equations)if(!e._solverAngularRows&&(e.computeGWlambda!==C.Equation.prototype.computeGWlambda||
            (e.addToWlambda!==C.Equation.prototype.addToWlambda&&e._normalFrictionAdd!==C.Equation.prototype.addToWlambda)))return referenceSolve.call(this,dt,world);
        let pool=this._numericSolver;
        const normalReferences=equations.reduce((total,e)=>total+(e._frictionPatches?e._frictionPatches.length:0),0);
        if(!pool||pool.capacity<n||pool.bodyCapacity<bodies.length||pool.normalCapacity<normalReferences){
            const capacity=Math.max(n,pool?pool.capacity:0),bodyCapacity=Math.max(bodies.length,pool?pool.bodyCapacity:0);
            const normalCapacity=Math.max(1,normalReferences,pool?pool.normalCapacity:0);
            const layout=[['terms',capacity*39,Float64Array],['rows',capacity,Int32Array],...['b','inv','eps','lambda','lo','hi'].map(k=>[k,capacity,Float64Array]),['velocity',bodyCapacity*6,Float64Array],['patch',capacity,Int32Array],['mu',capacity,Float64Array],['impulses',capacity,Float64Array],['starts',capacity,Int32Array],['counts',capacity,Int32Array],['normals',normalCapacity,Int32Array]];
            let bytes=64;layout.forEach(item=>{bytes=Math.ceil(bytes/8)*8;item.push(bytes);bytes+=item[1]*item[2].BYTES_PER_ELEMENT;});
            const wasm=!world.disableWasmSolver&&Wasm&&Wasm.create(Math.ceil(bytes/65536));
            const buffer=wasm?wasm.memory.buffer:new ArrayBuffer(bytes);
            pool=this._numericSolver={capacity,bodyCapacity,normalCapacity,wasm,patches:[],contacts:[]};
            const config=new Int32Array(buffer,0,layout.length);
            layout.forEach(([name,length,Type,offset],i)=>{pool[name]=new Type(buffer,offset,length);config[i]=offset;});
        }
        const t=pool.terms,rows=pool.rows,B=pool.b,inv=pool.inv,eps=pool.eps,lambda=pool.lambda,lo=pool.lo,hi=pool.hi,v=pool.velocity,patches=pool.patches,contacts=pool.contacts,scratch=new C.Vec3();
        v.fill(0);lambda.fill(0);
        bodies.forEach((body,i)=>{body.updateSolveMassProperties();body._solverSlot=i*6;body.vlambda.set(0,0,0);body.wlambda.set(0,0,0);
            body._solverImmovable=!world.disableStaticRowReduction&&body.invMassSolve===0&&body.invInertiaWorldSolve.elements.every(value=>value===0);
        });
        const pack=(offset,body,s,a)=>{
            // An immovable body's solve-velocity is exactly zero throughout
            // GS. Its prescribed velocity still participates in computeB.
            if(body._solverImmovable)return false;
            t[offset]=body._solverSlot;t[offset+1]=s?s.x:0;t[offset+2]=s?s.y:0;t[offset+3]=s?s.z:0;t[offset+4]=a.x;t[offset+5]=a.y;t[offset+6]=a.z;
            t[offset+7]=t[offset+1]*body.invMassSolve;t[offset+8]=t[offset+2]*body.invMassSolve;t[offset+9]=t[offset+3]*body.invMassSolve;
            body.invInertiaWorldSolve.vmult(a,scratch);t[offset+10]=scratch.x;t[offset+11]=scratch.y;t[offset+12]=scratch.z;
            return true;
        };
        for(let i=0;i<n;i++){
            const e=equations[i];B[i]=e.computeB(dt);inv[i]=1/e.computeC();eps[i]=e.eps;lo[i]=e.minForce;hi[i]=e.maxForce;patches[i]=e._normalPatch;contacts[i]=e._frictionPatches;
            const angular=e._solverAngularRows;let count=0;
            if(angular){for(const r of angular)if(pack(i*39+count*13,r.body,null,r.j))count++;}
            else {if(pack(i*39,e.bi,e.jacobianElementA.spatial,e.jacobianElementA.rotational))count++;
                if(pack(i*39+count*13,e.bj,e.jacobianElementB.spatial,e.jacobianElementB.rotational))count++;}
            rows[i]=count;
        }
        let iteration=0;const tolerance=this.tolerance*this.tolerance;
        if(pool.wasm){
            const ids=new Map(),objects=[];let next=0;
            const id=patch=>{if(!ids.has(patch)){ids.set(patch,objects.length);objects.push(patch);}return ids.get(patch);};
            for(let i=0;i<n;i++){
                pool.patch[i]=patches[i]?id(patches[i]):-1;pool.starts[i]=next;
                const normal=contacts[i]||[];pool.counts[i]=normal.length;for(const patch of normal)pool.normals[next++]=id(patch);
            }
            objects.forEach((patch,i)=>{pool.mu[i]=patch.coefficient;pool.impulses[i]=patch.impulse;});
            iteration=pool.wasm.solve(n,this.iterations,tolerance,0);
            objects.forEach((patch,i)=>{patch.impulse=pool.impulses[i];});
        }else for(;iteration<this.iterations;iteration++){
            let total=0;
            for(let i=0;i<n;i++){
                const start=i*39,end=start+rows[i]*13;let gw=0;
                for(let p=start;p<end;p+=13){const j=t[p];gw+=(t[p+1]*v[j]+t[p+2]*v[j+1]+t[p+3]*v[j+2])+(t[p+4]*v[j+3]+t[p+5]*v[j+4]+t[p+6]*v[j+5]);}
                let delta=inv[i]*(B[i]-gw-eps[i]*lambda[i]);const patch=patches[i],limit=patch?patch.coefficient*Math.max(0,patch.impulse):0,min=patch?-limit:lo[i],max=patch?limit:hi[i];
                if(lambda[i]+delta<min)delta=min-lambda[i];else if(lambda[i]+delta>max)delta=max-lambda[i];lambda[i]+=delta;total+=Math.abs(delta);
                const normal=contacts[i];if(normal)for(const patch of normal)patch.impulse+=delta;
                for(let p=start;p<end;p+=13){const j=t[p];v[j]+=t[p+7]*delta;v[j+1]+=t[p+8]*delta;v[j+2]+=t[p+9]*delta;v[j+3]+=t[p+10]*delta;v[j+4]+=t[p+11]*delta;v[j+5]+=t[p+12]*delta;}
            }
            if(total*total<tolerance)break;
        }
        bodies.forEach((body,i)=>{const j=i*6;body.vlambda.set(v[j],v[j+1],v[j+2]);body.wlambda.set(v[j+3],v[j+4],v[j+5]);body.velocity.vadd(body.vlambda,body.velocity);body.angularVelocity.vadd(body.wlambda,body.angularVelocity);});
        return iteration;
    }
    function coupleContactFriction(world){
        if(world._normalCoupledFriction)return;
        world._normalCoupledFriction=true;
        const narrowphase=world.narrowphase,create=narrowphase.createFrictionEquationsFromContact,average=narrowphase.createFrictionFromAverage;
        function shapeSide(shape,preferred,other){
            // Convex/convex narrowphase can reverse si/sj while retaining the
            // original bi/bj order. Resolve the shape's actual compound body
            // before using its material fallback or local axle transform.
            let body=preferred,index=body.shapes.indexOf(shape);
            if(index<0){body=other;index=body.shapes.indexOf(shape);}
            if(index<0){
                body=preferred;index=body.shapes.findIndex(s=>s.convexPolyhedronRepresentation===shape);
                if(index<0){body=other;index=body.shapes.findIndex(s=>s.convexPolyhedronRepresentation===shape);}
            }
            if(index<0)body=preferred;
            const source=index>=0?body.shapes[index]:shape;
            return {body,index,shape:source,material:shape.material||source.material||body.material};
        }
        const createContact=narrowphase.createContactEquation;
        narrowphase.createContactEquation=function(){
            // Cannon initializes every pooled normal row with this step's
            // stock material parameters first. Optional component compliance
            // then applies even to frictionless contacts and averaged patches.
            const contact=createContact.apply(this,arguments);
            const a=shapeSide(contact.si,contact.bi,contact.bj).material,b=shapeSide(contact.sj,contact.bj,contact.bi).material;
            const ka=a&&a.contactStiffness,kb=b&&b.contactStiffness;
            const stiffness=Math.min(Number.isFinite(ka)&&ka>0?ka:Infinity,Number.isFinite(kb)&&kb>0?kb:Infinity);
            if(Number.isFinite(stiffness))contact.setSpookParams(stiffness,this.currentContactMaterial.contactEquationRelaxation,this.world.dt);
            return contact;
        };
        function connect(equations,start,contacts,material){
            if(equations.length===start)return;
            const contact=contacts[0],sideA=shapeSide(contact.si,contact.bi,contact.bj),sideB=shapeSide(contact.sj,contact.bj,contact.bi),a=sideA.material,b=sideB.material;
            const coefficient=a&&b&&a.friction>=0&&b.friction>=0?a.friction*b.friction:material.friction;
            // Authored tires may resist rolling slip and sideways scrub by
            // different amounts. Keep the axle in shape coordinates so fixed
            // body compounding and arbitrary robot headings preserve it.
            let rolling=null,lateral=null,lateralCoefficient=coefficient;
            const tire=a&&Number.isFinite(a.lateralFriction)&&sideA.shape.frictionAxle?{...sideA,other:b}:
                b&&Number.isFinite(b.lateralFriction)&&sideB.shape.frictionAxle?{...sideB,other:a}:null;
            if(tire){
                const index=tire.index;
                if(index>=0){
                    const axle=tire.body.quaternion.vmult(tire.body.shapeOrientations[index].vmult(tire.shape.frictionAxle));
                    const normal=contact.ni;axle.vsub(normal.scale(axle.dot(normal)),axle);
                    if(axle.lengthSquared()>1e-12){
                        axle.normalize();lateral=axle;rolling=axle.cross(normal);rolling.normalize();
                        lateralCoefficient=Math.max(0,tire.material.lateralFriction)*(tire.other&&tire.other.friction>=0?tire.other.friction:1);
                    }
                }
            }
            const shared=rolling?null:(equations[start]._sharedFrictionPatch||(equations[start]._sharedFrictionPatch={}));
            if(shared){shared.contacts=contacts;shared.coefficient=coefficient;shared.impulse=0;}
            for(let i=start;i<equations.length;i++){
                const equation=equations[i];
                // Separate patches give both the JS and WASM solvers the
                // same directional limits, driven by the same support rows.
                const patch=shared||(equation._directionalFrictionPatch||(equation._directionalFrictionPatch={}));
                if(rolling){
                    const sideways=(i-start)%2===1;equation.t.copy(sideways?lateral:rolling);
                    patch.contacts=contacts;patch.coefficient=sideways?lateralCoefficient:coefficient;patch.impulse=0;
                }
                equation._normalPatch=patch;
                if(equation._normalFrictionBounds)continue;
                equation._normalFrictionBounds=true;
                // Cannon 0.6.2 clamps lambda (an impulse), but its stock
                // narrowphase supplies mu * gravity * reducedMass (a force).
                // Use the actual support impulse instead. This also accounts
                // for chassis weight carried through a wheel's hinge.
                Object.defineProperties(equation,{
                    maxForce:{configurable:true,get(){return this._normalPatch.coefficient*Math.max(0,this._normalPatch.impulse);},set(value){}},
                    minForce:{configurable:true,get(){return -this._normalPatch.coefficient*Math.max(0,this._normalPatch.impulse);},set(value){}}
                });
            }
        }
        narrowphase.createFrictionEquationsFromContact=function(contact,equations){
            const start=equations.length,result=create.call(this,contact,equations);
            connect(equations,start,[contact],this.currentContactMaterial);return result;
        };
        narrowphase.createFrictionFromAverage=function(count){
            // A flat 24-sided can cap generates 24 redundant floor rows.
            // Keep a spread-out support manifold only against static ground;
            // gripper/can and other dynamic contacts retain every CAD contact.
            if(count>4&&!world.disableGroundContactReduction){
                const start=this.result.length-count,contacts=this.result.slice(start);
                const eligible=contacts.every(c=>Math.abs(c.ni.y)>.999&&
                    ((c.si.groundContactLimit===4&&c.bj.mass===0)||(c.sj.groundContactLimit===4&&c.bi.mass===0)));
                if(eligible){
                    const points=contacts.map(c=>c.bi.position.vadd(c.ri));
                    let deepest=0,depth=Infinity;
                    contacts.forEach((c,i)=>{const d=c.bj.position.vadd(c.rj).vsub(points[i]).dot(c.ni);if(d<depth){depth=d;deepest=i;}});
                    const chosen=[deepest];
                    while(chosen.length<4){
                        let best=-1,score=-1;
                        points.forEach((p,i)=>{
                            if(chosen.includes(i))return;
                            const value=chosen.length===2?points[chosen[1]].vsub(points[chosen[0]]).cross(p.vsub(points[chosen[0]])).lengthSquared():
                                Math.min(...chosen.map(j=>p.distanceSquared(points[j])));
                            if(value>score){score=value;best=i;}
                        });
                        chosen.push(best);
                    }
                    const keep=new Set(chosen);
                    this.result.splice(start,count,...contacts.filter((c,i)=>keep.has(i)));count=4;
                    contacts.forEach((c,i)=>{if(!keep.has(i))this.contactPointPool.push(c);});
                }
            }
            const start=this.frictionResult.length,result=average.call(this,count);
            connect(this.frictionResult,start,this.result.slice(-count),this.currentContactMaterial);return result;
        };
        const solver=world.solver,solve=solver.solve===referenceSolve?cachedSolve:solver.solve;
        solver.solve=function(dt,currentWorld){
            const patches=new Set(),contacts=new Set();
            for(const equation of this.equations){
                // Contact equations are pooled. A former frictional contact
                // may now belong to a frictionless surface and must not keep
                // contributing to the old patch when the pool is reused.
                if(equation._normalFrictionAdd)equation._frictionPatches=[];
                if(equation._normalPatch)patches.add(equation._normalPatch);
            }
            for(const patch of patches){patch.impulse=0;for(const contact of patch.contacts)contacts.add(contact);}
            for(const contact of contacts){
                contact._frictionPatches=[];
                if(contact._normalFrictionAdd)continue;
                contact._normalFrictionAdd=contact.addToWlambda;
                contact.addToWlambda=function(delta){
                    // Accumulate once per normal update; both friction rows
                    // read their shared patch limit in O(1) during the solve.
                    for(const patch of this._frictionPatches)patch.impulse+=delta;
                    return this._normalFrictionAdd(delta);
                };
            }
            for(const patch of patches)for(const contact of patch.contacts)contact._frictionPatches.push(patch);
            // Keep Cannon's two orthogonal friction rows. Their square bound
            // permits at most sqrt(2) * mu * normalImpulse on diagonal slip.
            const iterations=this.iterations;
            // Static gear resistance couples the axle and tire contact rows.
            // At rest they need more iterations to converge than powered motion;
            // stopping at the moving budget leaves a small artificial wobble.
            // Keep all dynamics live and spend the extra budget only while no
            // actuator requests motion. The solver can still converge early.
            const constraints=currentWorld.constraints;
            // A stalled servo pushes against contact and its housing at once.
            // Resolve that closed chain more accurately while retaining torque
            // and live bodies; the moving budget otherwise creates chassis buzz.
            if(constraints.some(c=>c._actuatorStalled))this.iterations=Math.max(iterations,1280);
            if(!constraints.some(c=>c._actuatorDriving)&&constraints.some(c=>c.equations.some(e=>e._gearboxFriction&&e.enabled)))
                this.iterations=Math.max(iterations,640);
            if(currentWorld._stepDiagnostics){
                const diagnostics=currentWorld._stepDiagnostics;
                diagnostics.stalledActuators=Math.max(diagnostics.stalledActuators,constraints.reduce((count,c)=>count+(c._actuatorStalled?1:0),0));
            }
            try{return solveIndependentProps(this,solve,dt,currentWorld);}
            finally{this.iterations=iterations;}
        };
    }
    function shapeCollisionFilters(world){
        if(world._shapeCollisionFilters)return;world._shapeCollisionFilters=true;
        const narrowphase=world.narrowphase,types=Object.values(C.Shape.types);
        const bounds=new WeakMap(),bodyFrames=new WeakMap(),satEdges=new WeakMap(),projectionVertices=new WeakMap();let frame=0;const getContacts=narrowphase.getContacts;
        const projectDirection=new C.Vec3(),projectOrigin=new C.Vec3(),projectInverse=new C.Quaternion();
        const topPosition=new C.Vec3(),topRotation=new C.Quaternion(),topMin=new C.Vec3(),topMax=new C.Vec3();
        topRotation.setFromEuler(-Math.PI/2,0,0);
        const flatCanTop=(np,a,b)=>{
            // Entire can footprint is inside an unrotated static box, above
            // its middle plane: only the top face can support it. Reuse the
            // stock plane manifold with the real box's material/body/shape.
            // Edges, undersides and rotated obstacles retain full convex SAT.
            const box=a.shape,can=b.shape,q=a.rotation;
            if(world.disableCanTopPlane||!(box instanceof C.Box)||can.groundContactLimit!==4||
                a.body.mass!==0||b.body.mass<=0||Math.abs(q.x)+Math.abs(q.y)+Math.abs(q.z)>1e-12||
                b.min.x<=a.min.x+1e-6||b.max.x>=a.max.x-1e-6||
                b.min.z<=a.min.z+1e-6||b.max.z>=a.max.z-1e-6||b.min.y<=a.position.y)return false;
            // Support must use the original face height, never the padding
            // used only to reject distant shapes.
            if(!world.disableFastBoxBounds)box.calculateWorldAABB(a.position,a.rotation,topMin,topMax);
            topPosition.set(a.position.x,world.disableFastBoxBounds?a.max.y:topMax.y,a.position.z);
            np.planeConvex(box,can,topPosition,b.position,topRotation,b.rotation,a.body,b.body);
            world._canTopPlaneCalls=(world._canTopPlaneCalls||0)+1;
            return true;
        };
        const project=(shape,direction,position,rotation,result)=>{
            const vertices=shape.vertices;let cached=projectionVertices.get(shape);
            if(!cached||cached.values.length!==vertices.length*3){cached={values:new Float64Array(vertices.length*3)};projectionVertices.set(shape,cached);}
            if(cached.frame!==frame){
                for(let i=0;i<vertices.length;i++){const v=vertices[i],j=i*3;cached.values[j]=v.x;cached.values[j+1]=v.y;cached.values[j+2]=v.z;}
                cached.frame=frame;
            }
            // Match Cannon's local transforms and arithmetic order. Only the
            // vertex storage is packed; every separating axis is still tested
            // against the same vertices using double precision.
            rotation.w*=-1;rotation.vmult(direction,projectDirection);rotation.w*=-1;
            projectOrigin.setZero();projectOrigin.vsub(position,projectOrigin);rotation.conjugate(projectInverse);projectInverse.vmult(projectOrigin,projectOrigin);
            const offset=projectOrigin.dot(projectDirection),x=projectDirection.x,y=projectDirection.y,z=projectDirection.z,data=cached.values;
            let min=data[0]*x+data[1]*y+data[2]*z,max=min;
            for(let j=3;j<data.length;j+=3){const value=data[j]*x+data[j+1]*y+data[j+2]*z;if(value>max)max=value;if(value<min)min=value;}
            min-=offset;max-=offset;if(min>max){const temp=min;min=max;max=temp;}result[0]=max;result[1]=min;
        };
        const reduceEdges=shape=>{
            const hull=shape.convexPolyhedronRepresentation||(shape.vertices?shape:null);
            if(!hull||!hull.uniqueEdges)return null;
            const original=hull.uniqueEdges;let cached=satEdges.get(hull);
            if(cached&&cached.reduced===original)return null;
            if(!cached||cached.original!==original){
                // Cannon's computeEdges keeps both e and -e. Their cross
                // products describe the same SAT axis, so the second test
                // repeats both vertex projections. Keep the first direction
                // and remove only exactly opposite vectors (no tolerance).
                const reduced=[];
                for(const edge of original)if(!reduced.some(e=>e.x===-edge.x&&e.y===-edge.y&&e.z===-edge.z))reduced.push(edge);
                cached={original,reduced};satEdges.set(hull,cached);
            }
            hull.uniqueEdges=cached.reduced;return {hull,original};
        };
        // Conservative box bounds from the rotation matrix avoid transforming
        // all eight corners of every CAD box each step. The tiny padding is
        // only for broad rejection; contact geometry stays unchanged.
        const shapeBounds=(shape,position,q,min,max)=>{
            if(world.disableFastBoxBounds||!(shape instanceof C.Box))return shape.calculateWorldAABB(position,q,min,max);
            const h=shape.halfExtents,x=q.x,y=q.y,z=q.z,w=q.w;
            const xx=x*x,yy=y*y,zz=z*z,ww=w*w,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;
            const ex=Math.abs(ww+xx-yy-zz)*h.x+2*Math.abs(xy-wz)*h.y+2*Math.abs(xz+wy)*h.z+1e-12;
            const ey=2*Math.abs(xy+wz)*h.x+Math.abs(ww-xx+yy-zz)*h.y+2*Math.abs(yz-wx)*h.z+1e-12;
            const ez=2*Math.abs(xz-wy)*h.x+2*Math.abs(yz+wx)*h.y+Math.abs(ww-xx-yy+zz)*h.z+1e-12;
            min.set(position.x-ex,position.y-ey,position.z-ez);max.set(position.x+ex,position.y+ey,position.z+ez);
        };
        const frames=body=>{
            let cached=bodyFrames.get(body);if(!cached){cached={values:[]};bodyFrames.set(body,cached);}
            if(cached.frame!==frame){cached.frame=frame;cached.values.length=body.shapes.length;
                body.shapes.forEach((shape,i)=>{const value=cached.values[i]||(cached.values[i]={position:new C.Vec3(),rotation:new C.Quaternion(),min:new C.Vec3(),max:new C.Vec3()});
                    value.shape=shape;value.body=body;body.quaternion.mult(body.shapeOrientations[i],value.rotation);body.quaternion.vmult(body.shapeOffsets[i],value.position);value.position.vadd(body.position,value.position);
                    shapeBounds(shape,value.position,value.rotation,value.min,value.max);
                });
            }return cached.values;
        };
        const separate=(x,y)=>x.max.x+1e-6<y.min.x||y.max.x+1e-6<x.min.x||x.max.y+1e-6<y.min.y||y.max.y+1e-6<x.min.y||x.max.z+1e-6<y.min.z||y.max.z+1e-6<x.min.z;
        // Cache each compound shape transform once, rather than repeating the
        // same quaternion rotations for every shape on the opposing body.
        narrowphase.getContacts=function(as,bs,currentWorld,result,oldContacts,frictionResult,oldFriction){
            frame++;if(world.disableShapeAabb)return getContacts.apply(this,arguments);
            this.contactPointPool=oldContacts;this.frictionEquationPool=oldFriction;this.result=result;this.frictionResult=frictionResult;
            this._cachedCandidates=true;
            try{for(let i=0;i<as.length;i++){
                const a=as[i],b=bs[i],material=a.material&&b.material?currentWorld.getContactMaterial(a.material,b.material):null;
                for(const x of frames(a))for(const y of frames(b)){
                    const sa=x.shape,sb=y.shape;if(separate(x,y)||x.position.distanceTo(y.position)>sa.boundingSphereRadius+sb.boundingSphereRadius)continue;
                    const shapeMaterial=sa.material&&sb.material?currentWorld.getContactMaterial(sa.material,sb.material):null;
                    this.currentContactMaterial=shapeMaterial||material||currentWorld.defaultContactMaterial;
                    if(flatCanTop(this,x,y)||flatCanTop(this,y,x))continue;
                    const handler=this[sa.type|sb.type];if(!handler)continue;
                    if(sa.type<sb.type)handler.call(this,sa,sb,x.position,y.position,x.rotation,y.rotation,a,b,sa,sb);
                    else handler.call(this,sb,sa,y.position,x.position,y.rotation,x.rotation,b,a,sa,sb);
                }
            }}finally{this._cachedCandidates=false;}
        };
        const aabb=(shape,position,rotation)=>{
            let value=bounds.get(shape);if(!value){value={min:new C.Vec3(),max:new C.Vec3()};bounds.set(shape,value);}
            if(value.frame!==frame||value.x!==position.x||value.y!==position.y||value.z!==position.z||value.qx!==rotation.x||value.qy!==rotation.y||value.qz!==rotation.z||value.qw!==rotation.w){
                shape.calculateWorldAABB(position,rotation,value.min,value.max);
                value.frame=frame;value.x=position.x;value.y=position.y;value.z=position.z;value.qx=rotation.x;value.qy=rotation.y;value.qz=rotation.z;value.qw=rotation.w;
            }
            return value;
        };
        const keyFor=(a,b)=>[a.id,b.id].sort((x,y)=>x-y).join(':');
        const geared=new Set(world.constraints.filter(c=>c._gearCoupling).map(c=>keyFor(c.bodyA,c.bodyB)));
        for(const key of new Set(types.flatMap(a=>types.map(b=>a|b)))){
            const original=narrowphase[key];if(typeof original!=='function')continue;
            narrowphase[key]=function(a,b,pa,pb,qa,qb,ba,bb,sa,sb,facesA,facesB){
                if(a.gearCollisionProxy&&b.gearCollisionProxy&&geared.has(keyFor(ba,bb)))return;
                // Compound CAD parts have many thin shapes. Sphere bounds
                // alone send distant surfaces through expensive convex SAT.
                // A cached world AABB rejects only separated shape pairs.
                if(!this._cachedCandidates&&!world.disableShapeAabb&&a.calculateWorldAABB&&b.calculateWorldAABB){
                    const x=aabb(a,pa,qa),y=aabb(b,pb,qb),eps=1e-6;
                    if(x.max.x+eps<y.min.x||y.max.x+eps<x.min.x||x.max.y+eps<y.min.y||y.max.y+eps<x.min.y||x.max.z+eps<y.min.z||y.max.z+eps<x.min.z)return;
                }
                const edgeA=!world.disableSatEdgeReduction&&reduceEdges(a),edgeB=!world.disableSatEdgeReduction&&reduceEdges(b),referenceProject=C.ConvexPolyhedron.project;
                if(!world.disableCachedProjection)C.ConvexPolyhedron.project=project;
                try{return original.call(this,a,b,pa,pb,qa,qb,ba,bb,sa,sb,facesA,facesB);}
                finally{
                    C.ConvexPolyhedron.project=referenceProject;
                    if(edgeB)edgeB.hull.uniqueEdges=edgeB.original;
                    if(edgeA)edgeA.hull.uniqueEdges=edgeA.original;
                }
            };
        }
    }
    function rememberSupport(rest,body){
        rest.support=body;
        rest.supportPose=body?[body.position.x,body.position.y,body.position.z,body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w]:null;
    }
    function wakeRestingProps(world){
        const sleeping=world.bodies.filter(b=>b._canRest&&b.sleepState===C.Body.SLEEPING);
        if(!sleeping.length)return;
        const movers=world.bodies.filter(b=>b.type!==C.Body.STATIC&&b.sleepState!==C.Body.SLEEPING);
        for(const b of movers)if(b.aabbNeedsUpdate)b.computeAABB();
        for(const b of sleeping){
            const rest=b._canRest,s=rest.support,p=rest.supportPose;
            let wake=b.velocity.lengthSquared()>0||b.angularVelocity.lengthSquared()>0||b.force.lengthSquared()>0||b.torque.lengthSquared()>0||!s||!world.bodies.includes(s)||!p||
                [s.position.x,s.position.y,s.position.z,s.quaternion.x,s.quaternion.y,s.quaternion.z,s.quaternion.w].some((n,i)=>n!==p[i]);
            if(b.aabbNeedsUpdate)b.computeAABB();
            // Wake before contact generation, even for a very slow gripper.
            // Cannon's velocity-triggered wake alone misses gentle pushes.
            if(!wake)wake=movers.some(other=>other!==b&&b.aabb.overlaps(other.aabb));
            if(wake){b.wakeUp();rest.quiet=0;rememberSupport(rest,null);}
        }
    }
    function settleProps(world,dt){
        for(const b of world.bodies){
            const rest=b._canRest;if(!rest||b.sleepState===C.Body.SLEEPING)continue;
            let support=null,blocked=false;
            for(const c of world.contacts){
                if(!c.enabled||(c.bi!==b&&c.bj!==b))continue;
                const other=c.bi===b?c.bj:c.bi;
                if(other.type!==C.Body.STATIC){blocked=true;break;}
                const up=c.bi===b?-c.ni.y:c.ni.y;
                if(up>.5)support=other;
            }
            if(!blocked&&support&&b.velocity.lengthSquared()<rest.linearLimit**2&&b.angularVelocity.lengthSquared()<rest.angularLimit**2){
                rest.quiet+=dt;
                if(rest.quiet>=.5){rememberSupport(rest,support);b.sleep();}
            }else {rest.quiet=0;rememberSupport(rest,null);}
        }
    }
    function stepWorld(world,dt){
        wakeRestingProps(world);
        shapeCollisionFilters(world);
        coupleContactFriction(world);
        // Cannon 0.6.2 advances time in both internalStep() and step(). The
        // body integration runs once, so its packet timestamp must too.
        // Otherwise playback backpressure eventually runs physics at half
        // the firmware clock rate even when the worker has ample capacity.
        const time=world.time;world.step(dt);world.time=time+dt;
        settleProps(world,dt);
        if(world._stepDiagnostics)world._stepDiagnostics.substeps++;
    }
    // Bilateral plane equation. Unlike a contact, it can pull as well as push.
    class PlaneEquation extends C.Equation {
        constructor(a,b,pa,pb,normal){super(a,b,-1e4,1e4);this.pa=pa;this.pb=pb;this.normal=normal;this.setSpookParams(1e7,4,1/120);}
        computeB(h){
            const a=this.bi,b=this.bj,n=a.quaternion.vmult(this.normal),ra=a.quaternion.vmult(this.pa),rb=b.quaternion.vmult(this.pb);
            this.jacobianElementA.spatial.copy(n.negate());this.jacobianElementB.spatial.copy(n);
            this.jacobianElementA.rotational.copy(ra.cross(n).negate());this.jacobianElementB.rotational.copy(rb.cross(n));
            const delta=b.position.vadd(rb).vsub(a.position.vadd(ra));
            return -delta.dot(n)*this.a-this.computeGW()*this.b-h*this.computeGiMf();
        }
    }
    function gearboxEquation(a,b){
        const equation=new C.RotationalMotorEquation(a,b),scratch=new C.Vec3();
        equation._gearboxFriction=true;
        // Cannon 0.6's generic denominator always adds inverse mass, even for
        // purely angular rows with zero spatial Jacobians. Use only angular
        // inertia here so a static-friction row can actually hold zero twist.
        equation.computeGiMGt=function(){
            this.bi.invInertiaWorldSolve.vmult(this.jacobianElementA.rotational,scratch);
            const a=this.jacobianElementA.rotational.dot(scratch);
            this.bj.invInertiaWorldSolve.vmult(this.jacobianElementB.rotational,scratch);
            return a+this.jacobianElementB.rotational.dot(scratch);
        };
        // Sleeping or kinematic bodies can lose their solve inertia after the
        // pre-step setup. A zero inverse denominator ignores that immovable
        // row without producing Infinity * 0 in Cannon's iteration.
        equation.computeC=function(){const inverseInertia=this.computeGiMGt();return inverseInertia>0?inverseInertia:Infinity;};
        return equation;
    }
    function gearboxFriction(hinge,timeStep,unitScale){
        const constraint=hinge.constraint,value=Number(hinge.joint.gearboxFrictionTorque);
        const torque=Number.isFinite(value)?Math.max(0,value):0;
        let equation=hinge.gearboxFrictionEquation||constraint.equations.find(e=>e._gearboxFriction);
        if(!torque){
            if(equation){const index=constraint.equations.indexOf(equation);if(index>=0)constraint.equations.splice(index,1);}
            hinge.gearboxFrictionEquation=null;return 0;
        }
        if(!equation){
            equation=gearboxEquation(constraint.bodyA,constraint.bodyB);constraint.equations.push(equation);
        }
        hinge.gearboxFrictionEquation=equation;
        // Mechanical resistance is present even with the motor disconnected.
        // A separate bounded row can hold a stationary shaft below its breakaway
        // torque, and slips under a larger load; it never fixes a body's pose.
        equation.bi=constraint.bodyA;equation.bj=constraint.bodyB;
        constraint.bodyA.quaternion.vmult(constraint.axisA,equation.axisA);
        constraint.bodyB.quaternion.vmult(constraint.axisB,equation.axisB);
        equation.a=0;equation.b=1;equation.eps=0;equation.targetVelocity=0;
        // With no rotational degree of freedom, an exact velocity row would
        // have a zero denominator. Static/fixed-rotation bodies need no brake.
        const inverseInertia=equation.axisA.dot(constraint.bodyA.invInertiaWorld.vmult(equation.axisA))+
            equation.axisB.dot(constraint.bodyB.invInertiaWorld.vmult(equation.axisB));
        equation.enabled=inverseInertia>0;
        const impulse=torque*unitScale*unitScale*timeStep;
        equation.minForce=-impulse;equation.maxForce=impulse;
        return torque;
    }
    function motors(hinges,timeStep,unitScale){
            for(const h of hinges){
                const gearTorque=gearboxFriction(h,timeStep,unitScale);
                const axis=h.a.body.quaternion.vmult(h.axis),a=h.a.body.quaternion.vmult(h.refA),b=h.b.body.quaternion.vmult(h.refB);
                const angle=Math.atan2(axis.dot(a.cross(b)),a.dot(b));let delta=angle-h.lastAngle;
                if(delta>Math.PI)delta-=2*Math.PI;if(delta< -Math.PI)delta+=2*Math.PI;h.angle+=delta;h.lastAngle=angle;
                const command=h.data.commands.get(h.joint.id),servo=command&&command.type==='servo';
                const acceleration=command&&Number.isFinite(command.maxAcceleration)?Math.max(.01,command.maxAcceleration):servo?Math.PI*2:10;
                let speed=command?(servo?(command.angle-h.angle)*12:command.velocity):0;
                if(servo){
                    // A proportional velocity target alone brakes too late:
                    // the acceleration ramp carries the arm past its target
                    // and reverses it repeatedly, shaking the whole chassis.
                    const error=command.angle-h.angle,limit=Number.isFinite(command.maxSpeed)?Math.max(.01,command.maxSpeed):Math.PI*2;
                    // Reach rated speed outside the final six degrees. The
                    // old fixed gain of 12 imposed a long settling tail even
                    // when the device specified a fast travel speed.
                    speed=error*(limit/(Math.PI/30));
                    const remaining=Math.max(0,Math.abs(error)-Math.abs(h.targetSpeed)*timeStep);
                    speed=Math.sign(error)*Math.min(Math.abs(speed),limit,Math.sqrt(2*acceleration*remaining));
                    if(Math.abs(error)<.002)speed=0;
                }
                let active=!!command;
                if(h.joint.type==='revolute'){
                    const lo=(h.joint.lower||0)*Math.PI/180,hi=(h.joint.upper||0)*Math.PI/180;
                    // Keep a requested inward motion: a tiny gravity-induced
                    // limit error must not replace a lift command with a weak
                    // correction back to zero and trap the servo at its stop.
                    if(h.angle<lo){speed=Math.max(speed,(lo-h.angle)*20);active=true;}if(h.angle>hi){speed=Math.min(speed,(hi-h.angle)*20);active=true;}
                }
                const directMotor=command&&command.type==='motor'&&command.maxAcceleration===0;
                const motorEquation=h.constraint.motorEquation;
                if(!directMotor&&h.dcMotorSpook){
                    Object.assign(motorEquation,h.dcMotorSpook);delete h.dcMotorSpook;
                }
                if(active){
                    // Honor the actuator's output-shaft rating. The former
                    // 30 rad/s ceiling silently capped 900 RPM gearmotors.
                    const speedLimit=command&&Number.isFinite(command.maxSpeed)?Math.max(0,command.maxSpeed):30;
                    const target=Math.max(-speedLimit,Math.min(speedLimit,speed));
                    // Zero opts out of software slew limiting for a direct
                    // motor command. The finite shaft torque and rigid-body
                    // inertia still determine its actual acceleration.
                    if(directMotor)h.targetSpeed=target;
                    else h.targetSpeed+=Math.max(-acceleration*timeStep,Math.min(acceleration*timeStep,target-h.targetSpeed));
                    const shaftTorque=Math.max(.0001,Number(h.joint.maxTorque)||h.defaultTorque);
                    if(directMotor){
                        // Solve DC torque = stallTorque * (target - speed) /
                        // noLoadSpeed at the NEW velocity, together with the
                        // contact equations. A torque cap computed from last
                        // step's RPM oscillated on light shafts: their motor
                        // damping time can be shorter than a physics step.
                        // Cannon solves Gv_new - target + eps * impulse = 0.
                        // This compliance therefore gives the implicit DC
                        // law, including passive back-EMF braking at PWM 0.
                        if(!h.dcMotorSpook)h.dcMotorSpook={a:motorEquation.a,b:motorEquation.b,eps:motorEquation.eps};
                        const angularImpulse=shaftTorque*unitScale*unitScale*timeStep;
                        motorEquation.a=0;motorEquation.b=1;
                        motorEquation.eps=Math.max(.01,speedLimit)/angularImpulse;
                        // Authored torque/RPM are net output-shaft ratings.
                        // Compensate internal electrical drive for the authored
                        // gear loss so full PWM still delivers those ratings.
                        // Partial PWM retains the physical breakaway deadband.
                        const grossRatio=(shaftTorque+gearTorque)/shaftTorque;
                        // A measured curve already includes gearbox losses at
                        // each PWM. Compensate only that internal loss; external
                        // load/contact torque still reduces the resulting RPM.
                        const electricalTarget=command.calibratedNoLoad&&target!==0
                            ? target+Math.sign(target)*speedLimit*gearTorque/shaftTorque
                            : target*grossRatio;
                        h.constraint.enableMotor();h.constraint.setMotorSpeed(-electricalTarget);
                        h.constraint.setMotorMaxForce(angularImpulse*grossRatio);
                    }else{
                        h.constraint.enableMotor();h.constraint.setMotorSpeed(-h.targetSpeed);
                        // Cannon bounds the accumulated impulse, not torque.
                        // Keep the servo's rated torque independent of step rate.
                        h.constraint.setMotorMaxForce(shaftTorque*unitScale*unitScale*timeStep);
                    }
                    if(Math.abs(speed)>.001){h.a.body.wakeUp();h.b.body.wakeUp();}
                }else {h.constraint.disableMotor();h.targetSpeed=0;}
                h.driving=active&&Math.abs(speed)>.001;
                h.constraint._actuatorDriving=h.driving;
                h.constraint._actuatorStalled=!!(servo&&Math.abs(command.angle-h.angle)>.05&&Math.abs(h.targetSpeed)>(command.maxSpeed||30)*.5&&Math.abs(h.b.body.angularVelocity.vsub(h.a.body.angularVelocity).dot(axis))<.05);
            }
        }

    function localRotationEquation(a,b,axisA,axisB){
        const equation=new C.RotationalEquation(a,b),compute=equation.computeB;
        equation.localAxisA=axisA;equation.localAxisB=axisB;
        equation.computeB=function(dt){this.bi.quaternion.vmult(this.localAxisA,this.axisA);this.bj.quaternion.vmult(this.localAxisB,this.axisB);return compute.call(this,dt);};
        return equation;
    }
    // Weld authored fixed links into real compound bodies. The mesh frames
    // remain separate so appearances, sensors and joint names retain identity.
    function compound(world,entries,hinges){
        const owners=new Map(entries.map(e=>[e.body,e.body]));
        const find=b=>{while(owners.get(b)!==b)b=owners.get(b);return b;};
        world.constraints.forEach(c=>{if(c instanceof C.LockConstraint&&owners.has(c.bodyA)&&owners.has(c.bodyB))owners.set(find(c.bodyB),find(c.bodyA));});
        const groups=new Map();owners.forEach((_,body)=>{const key=find(body);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(body);});
        const replacement=new Map();
        for(const bodies of groups.values()){
            if(bodies.length<2||hinges.some(h=>bodies.includes(h.a.body)&&bodies.includes(h.b.body)))continue;
            const mass=bodies.reduce((sum,b)=>sum+b.mass,0),fixed=bodies.some(b=>b.mass===0);
            const master=new C.Body({mass:fixed?0:mass,linearDamping:bodies[0].linearDamping,angularDamping:bodies[0].angularDamping,allowSleep:false});
            master.quaternion.copy(bodies[0].quaternion);
            if(mass>0)bodies.forEach(b=>master.position.vadd(b.position.scale(b.mass/mass),master.position));
            else master.position.copy(bodies[0].position);
            const inertia=new C.Vec3();
            for(const body of bodies){
                replacement.set(body,master);
                const offset=master.pointToLocalFrame(body.position),rotation=master.quaternion.conjugate().mult(body.quaternion);
                // Diagonal tensor in the compound frame, including each
                // constituent's rotated inertia and parallel-axis contribution.
                const axes=[rotation.vmult(new C.Vec3(1,0,0)),rotation.vmult(new C.Vec3(0,1,0)),rotation.vmult(new C.Vec3(0,0,1))];
                const values=[body.inertia.x,body.inertia.y,body.inertia.z];
                for(const key of ['x','y','z'])inertia[key]+=axes.reduce((sum,axis,i)=>sum+axis[key]*axis[key]*values[i],0)+body.mass*(offset.norm2()-offset[key]*offset[key]);
                body.shapes.forEach((shape,i)=>{
                    // Shape-level material preserves rubber/metal friction
                    // even though the pieces now share one rigid body.
                    if(!shape.material)shape.material=body.material;
                    master.addShape(shape,master.pointToLocalFrame(body.pointToWorldFrame(body.shapeOffsets[i])),master.quaternion.conjugate().mult(body.quaternion.mult(body.shapeOrientations[i])));
                });
            }
            master.material=bodies[0].material;
            setInertia(master,inertia);
            bodies.forEach(b=>world.removeBody(b));world.addBody(master);
        }
        const point=(old,next,value)=>next.pointToLocalFrame(old.pointToWorldFrame(value));
        const vector=(old,next,value)=>next.vectorToLocalFrame(old.vectorToWorldFrame(value));
        world.constraints.slice().forEach(c=>{
            const a=c.bodyA,b=c.bodyB,na=replacement.get(a)||a,nb=replacement.get(b)||b;
            if(na===nb){world.removeConstraint(c);return;}
            c.bodyA=na;c.bodyB=nb;
            if(c.pivotA){c.pivotA.copy(point(a,na,c.pivotA));c.pivotB.copy(point(b,nb,c.pivotB));}
            if(c.axisA){c.axisA.copy(vector(a,na,c.axisA));c.axisB.copy(vector(b,nb,c.axisB));}
            c.equations.forEach(e=>{
                e.bi=na;e.bj=nb;
                if(e instanceof PlaneEquation){e.pa=point(a,na,e.pa);e.pb=point(b,nb,e.pb);e.normal=vector(a,na,e.normal);}
                if(e.localAxisA){e.localAxisA=vector(a,na,e.localAxisA);e.localAxisB=vector(b,nb,e.localAxisB);}
            });
        });
        // Motion joints already replace authoring mates on the same pair of
        // components. Apply that same rule after fixed parts have been welded:
        // a bracket fixed to the chassis is also the chassis side of its hinge.
        // Keeping both sets of nearly coincident axes makes them fight at rest.
        const motionConstraints=hinges.map(h=>h.constraint).filter(c=>world.constraints.includes(c));
        world.constraints.slice().forEach(c=>{
            if(c.authoringMate&&motionConstraints.some(h=>
                (h.bodyA===c.bodyA&&h.bodyB===c.bodyB)||(h.bodyA===c.bodyB&&h.bodyB===c.bodyA)))world.removeConstraint(c);
        });
        world.constraints.slice().forEach(c=>{
            if(!c.equations.length&&!c.collideConnected&&world.constraints.some(other=>other!==c&&other.equations.length&&!other.collideConnected&&
                ((other.bodyA===c.bodyA&&other.bodyB===c.bodyB)||(other.bodyA===c.bodyB&&other.bodyB===c.bodyA))))world.removeConstraint(c);
        });
        hinges.forEach(h=>{
            const a=h.a.body,b=h.b.body,na=replacement.get(a)||a,nb=replacement.get(b)||b;
            h.axis=vector(a,na,h.axis);h.refA=vector(a,na,h.refA);h.refB=vector(b,nb,h.refB);
        });
        entries.forEach(e=>{
            const old=e.body,next=replacement.get(old);if(!next)return;
            e.bodyFrame={position:next.pointToLocalFrame(old.position),quaternion:next.quaternion.conjugate().mult(old.quaternion)};
            e.body=next;e.initialPosition.copy(next.position);e.initialQuaternion.copy(next.quaternion);
        });
        return replacement;
    }
    // Mechanical gear coupling: follower angle = ratio * driver angle + offset.
    // The parent receives the reaction too, so a moving arm is not grounded by
    // its gripper gears. No additional powered servo is assigned to the follower.
    function coupleJoints(world,hinges,timeStep,unitScale){
        for(const follower of hinges){
            const mimic=follower.joint.mimic;if(!mimic)continue;
            const driver=hinges.find(h=>h.a.body===follower.a.body&&h.joint.id===mimic.jointId);
            if(!driver||driver.a.body!==follower.a.body)throw Error('Coupled joints must share a rigid parent.');
            const a=driver.b.body,b=follower.b.body,parent=driver.a.body,ratio=mimic.multiplier;
            // Gearing does not disable contact between attached gripper tips.
            // Only meshing tooth proxies opt out; other gears still collide.
            const constraint=new C.Constraint(a,b,{collideConnected:true});constraint._gearCoupling=true;constraint.update=function(){};
            const equation=new C.Equation(a,b),scratch=new C.Vec3(),ja=new C.Vec3(),jb=new C.Vec3(),jp=new C.Vec3();
            equation.setSpookParams(1e7,4,timeStep);
            const rows=[{body:a,j:ja},{body:b,j:jb},{body:parent,j:jp}];
            equation._solverAngularRows=rows;
            equation.computeB=function(dt){
                driver.a.body.quaternion.vmult(driver.axis,ja);ja.scale(-ratio,ja);
                follower.a.body.quaternion.vmult(follower.axis,jb);ja.vadd(jb,jp);jp.negate(jp);
                const error=follower.angle-ratio*driver.angle-(mimic.offset||0)*Math.PI/180;
                return -error*this.a-this.computeGW()*this.b-dt*this.computeGiMf();
            };
            equation.computeGW=()=>rows.reduce((sum,r)=>sum+r.j.dot(r.body.angularVelocity),0);
            equation.computeGWlambda=()=>rows.reduce((sum,r)=>sum+r.j.dot(r.body.wlambda),0);
            equation.computeGiMf=()=>rows.reduce((sum,r)=>sum+r.j.dot(r.body.invInertiaWorldSolve.vmult(r.body.torque,scratch)),0);
            equation.computeGiMGt=()=>rows.reduce((sum,r)=>sum+r.j.dot(r.body.invInertiaWorldSolve.vmult(r.j,scratch)),0);
            equation.addToWlambda=delta=>rows.forEach(r=>{r.body.invInertiaWorldSolve.vmult(r.j,scratch);scratch.scale(delta,scratch);r.body.wlambda.vadd(scratch,r.body.wlambda);});
            const impulse=(mimic.maxTorque||1)*unitScale*unitScale*timeStep;equation.minForce=-impulse;equation.maxForce=impulse;
            constraint.equations.push(equation);world.addConstraint(constraint);
        }
    }
    function setInertia(body,inertia){
        const update=C.Body.prototype.updateMassProperties;
        body.updateMassProperties=function(){
            update.call(this);
            if(this.mass>0){this.inertia.copy(inertia);this.invInertia.set(inertia.x>0?1/inertia.x:0,inertia.y>0?1/inertia.y:0,inertia.z>0?1/inertia.z:0);this.updateInertiaWorld(true);}
        };
        body.updateMassProperties();
    }
    const v=value=>[value.x,value.y,value.z],q=value=>[value.x,value.y,value.z,value.w];
    const V=value=>new C.Vec3(...value),Q=value=>new C.Quaternion(...value);
    const material=m=>m?{friction:m.friction,restitution:m.restitution,...(Number.isFinite(m.lateralFriction)?{lateralFriction:m.lateralFriction}:{}),...(Number.isFinite(m.contactStiffness)&&m.contactStiffness>0?{contactStiffness:m.contactStiffness}:{})}:null;
    const restoreMaterial=m=>{if(!m)return null;const value=new C.Material(m);if(Number.isFinite(m.lateralFriction))value.lateralFriction=m.lateralFriction;if(Number.isFinite(m.contactStiffness)&&m.contactStiffness>0)value.contactStiffness=m.contactStiffness;return value;};
    // Capture contact onset in the solver, never infer impacts from render jitter.
    function installImpactAudio(world, unitScale) {
        world._audioImpacts=[];
        const touching=new Map();let previousTime=world.time;
        // Contacts between linked parts are internal mechanism noise, already
        // represented by motor/servo audio, not loose-object collision sounds.
        const mechanism=new Map();
        const rootOf=b=>{let root=b;while(mechanism.has(root))root=mechanism.get(root);return root;};
        for(const constraint of world.constraints){const a=rootOf(constraint.bodyA),b=rootOf(constraint.bodyB);if(a!==b)mechanism.set(a,b);}
        const pairKey=(a,b)=>a.id<b.id?a.id+':'+b.id:b.id+':'+a.id;
        function resetClock(){if(world.time<previousTime)touching.clear();previousTime=world.time;}
        // A gripped/resting can may lose contact for one solver tick. Re-arm
        // only after a real separation, not on each narrowphase re-contact.
        world.addEventListener('postStep',()=>{resetClock();for(const c of world.contacts)touching.set(pairKey(c.bi,c.bj),world.time);});
        for(const body of world.bodies){
            const lastByOther=new WeakMap();
            body.addEventListener('collide',event=>{
                const contact=event.contact,other=event.body,time=world.time;
                if(!contact||!other||body.id>other.id||!(body.mass>0||other.mass>0))return;
                if(rootOf(body)===rootOf(other))return;
                const rod=body._impactSurface==='rod'||other._impactSurface==='rod';
                resetClock();const key=pairKey(body,other),lastTouch=touching.get(key);touching.set(key,time);
                if(lastTouch!==undefined&&time-lastTouch<(rod?.035:.12))return;
                if(world._dragHeld&&[body,other].some(b=>world._dragHeld.has(world.bodies.indexOf(b))))return;
                // Positive is closing; separating correction impulses are not impacts.
                const speed=contact.getImpactVelocityAlongNormal()/unitScale;
                let last=lastByOther.get(other)??-Infinity;
                if(time<last)last=-Infinity;
                if(speed<(rod?.025:.12)||time-last<(rod?.055:.09))return;
                lastByOther.set(other,time);
                const dynamic=body._canRest?body:other._canRest?other:body.mass>0?body:other,second=dynamic===body?other:body;
                const sound=b=>(contact.bi===b?contact.si:contact.sj)?.impactMaterial||b._impactMaterial||'plastic';
                if(world._audioImpacts.length<12)world._audioImpacts.push({material:rod?'wood':sound(dynamic),otherMaterial:rod?null:sound(second),resonance:!rod&&dynamic._canRest?'can':'solid',speed,mass:dynamic.mass,surface:rod?'rod':undefined});
            });
        }
    }
    function drainImpacts(world){const events=world._audioImpacts||[];world._audioImpacts=[];return events;}
    function snapshot(world,hinges,timeStep,unitScale){
        const bodies=world.bodies,bodyIndex=new Map(bodies.map((b,i)=>[b,i]));
        const constraints=world.constraints.filter(c=>!c._gearCoupling);
        return {timeStep,unitScale,state:state(world,hinges),gravity:v(world.gravity),iterations:world.solver.iterations,tolerance:world.solver.tolerance,
            contact:{friction:world.defaultContactMaterial.friction,restitution:world.defaultContactMaterial.restitution,contactEquationStiffness:world.defaultContactMaterial.contactEquationStiffness,contactEquationRelaxation:world.defaultContactMaterial.contactEquationRelaxation},
            bodies:bodies.map(b=>({impactMaterial:b._impactMaterial,impactSurface:b._impactSurface,mass:b.mass,position:v(b.position),quaternion:q(b.quaternion),inertia:v(b.inertia),material:material(b.material),linearDamping:b.linearDamping,angularDamping:b.angularDamping,canRest:b._canRest&&{linearLimit:b._canRest.linearLimit,angularLimit:b._canRest.angularLimit},
                shapes:b.shapes.map((s,i)=>({type:s instanceof C.Plane?'plane':s instanceof C.Box?'box':s instanceof C.Sphere?'sphere':'convex',halfExtents:s.halfExtents&&v(s.halfExtents),radius:s.radius,vertices:s.vertices&&s.vertices.map(v),faces:s.faces,axes:s.uniqueAxes&&s.uniqueAxes.map(v),offset:v(b.shapeOffsets[i]),orientation:q(b.shapeOrientations[i]),impactMaterial:s.impactMaterial,gearCollisionProxy:s.gearCollisionProxy,groundContactLimit:s.groundContactLimit,frictionAxle:s.frictionAxle&&v(s.frictionAxle),material:material(s.material)}))})),
            constraints:constraints.map(c=>({a:bodyIndex.get(c.bodyA),b:bodyIndex.get(c.bodyB),type:c instanceof C.HingeConstraint?'hinge':c instanceof C.LockConstraint?'lock':'custom',collideConnected:c.collideConnected,
                pivotA:c.pivotA&&v(c.pivotA),pivotB:c.pivotB&&v(c.pivotB),axisA:c.axisA&&v(c.axisA),axisB:c.axisB&&v(c.axisB),
                equations:c.equations.map(e=>({minForce:e.minForce,maxForce:e.maxForce,a:e.a,b:e.b,eps:e.eps,kind:e._gearboxFriction?'gearbox-friction':e instanceof PlaneEquation?'plane':e.localAxisA?'rotation':null,
                    pa:e.pa&&v(e.pa),pb:e.pb&&v(e.pb),normal:e.normal&&v(e.normal),axisA:e.localAxisA&&v(e.localAxisA),axisB:e.localAxisB&&v(e.localAxisB)}))})),
            hinges:hinges.map(h=>({constraint:constraints.indexOf(h.constraint),joint:h.joint,axis:v(h.axis),refA:v(h.refA),refB:v(h.refB),defaultTorque:h.defaultTorque,
                dcMotorSpook:h.dcMotorSpook&&{...h.dcMotorSpook}}))};
    }
    function restore(snapshot){
        const world=new C.World();installSolver(world);world.gravity.copy(V(snapshot.gravity));world.solver.iterations=snapshot.iterations;world.solver.tolerance=snapshot.tolerance;
        world.allowSleep=false;world.narrowphase.enableFrictionReduction=true;Object.assign(world.defaultContactMaterial,snapshot.contact);
        const bodies=snapshot.bodies.map(b=>{
            const body=new C.Body({mass:b.mass,linearDamping:b.linearDamping,angularDamping:b.angularDamping,allowSleep:false});
            body._impactMaterial=b.impactMaterial;
            body._impactSurface=b.impactSurface;
            if(b.canRest)body._canRest={...b.canRest,quiet:0,support:null};
            body.position.copy(V(b.position));body.quaternion.copy(Q(b.quaternion));body.material=restoreMaterial(b.material);
            b.shapes.forEach(s=>{const shape=s.type==='plane'?new C.Plane():s.type==='box'?new C.Box(V(s.halfExtents)):s.type==='sphere'?new C.Sphere(s.radius):new C.ConvexPolyhedron(s.vertices.map(V),s.faces,s.axes&&s.axes.map(V));
                shape.material=restoreMaterial(s.material);shape.impactMaterial=s.impactMaterial;shape.gearCollisionProxy=s.gearCollisionProxy;shape.groundContactLimit=s.groundContactLimit;shape.frictionAxle=s.frictionAxle&&V(s.frictionAxle);body.addShape(shape,V(s.offset),Q(s.orientation));});
            setInertia(body,V(b.inertia));world.addBody(body);return body;
        });
        snapshot.constraints.forEach(c=>{
            const a=bodies[c.a],b=bodies[c.b];let constraint;
            if(c.type==='hinge')constraint=new C.HingeConstraint(a,b,{pivotA:V(c.pivotA),pivotB:V(c.pivotB),axisA:V(c.axisA),axisB:V(c.axisB)});
            else if(c.type==='lock')constraint=new C.LockConstraint(a,b);
            else {constraint=new C.Constraint(a,b);constraint.update=function(){};c.equations.forEach(e=>constraint.equations.push(e.kind==='plane'?new PlaneEquation(a,b,V(e.pa),V(e.pb),V(e.normal)):localRotationEquation(a,b,V(e.axisA),V(e.axisB))));}
            if(c.type==='hinge')for(const equation of c.equations)if(equation.kind==='gearbox-friction'){
                constraint.equations.push(gearboxEquation(a,b));
            }
            constraint.collideConnected=c.collideConnected;
            constraint.equations.forEach((e,i)=>Object.assign(e,{minForce:c.equations[i].minForce,maxForce:c.equations[i].maxForce,a:c.equations[i].a,b:c.equations[i].b,eps:c.equations[i].eps}));world.addConstraint(constraint);
        });
        const hinges=snapshot.hinges.map(h=>{
            const constraint=world.constraints[h.constraint];return {...h,constraint,a:{body:constraint.bodyA},b:{body:constraint.bodyB},axis:V(h.axis),refA:V(h.refA),refB:V(h.refB),data:{commands:new Map()},angle:(h.joint.home||0)*Math.PI/180,lastAngle:0,targetSpeed:0};
        });
        coupleJoints(world,hinges,snapshot.timeStep,snapshot.unitScale);
        // A worker may attach after settling or resume from a nonzero clock.
        // Keep that timeline and its velocities/controller state together.
        if(snapshot.state)applyState(world,hinges,snapshot.state);
        installImpactAudio(world,snapshot.unitScale);
        let accumulator=0;
        return {world,hinges,reset(packet){
            world._audioImpacts=[];
            // Geometry and the numeric solver workspace survive Reset. Only
            // dynamical/contact state belongs to the previous run.
            applyState(world,hinges,packet);accumulator=0;world.stepnumber=0;
            world.contacts.length=0;world.frictionEquations.length=0;
            world.narrowphase.contactPointPool.length=0;world.narrowphase.frictionEquationPool.length=0;
            world.collisionMatrix.reset();world.collisionMatrixPrevious.reset();
            world.solver.removeAllEquations();world.broadphase.dirty=true;
            world.bodies.forEach(b=>{
                b.previousPosition.copy(b.position);b.interpolatedPosition.copy(b.position);
                if(b.previousQuaternion)b.previousQuaternion.copy(b.quaternion);if(b.interpolatedQuaternion)b.interpolatedQuaternion.copy(b.quaternion);
                b.force.set(0,0,0);b.torque.set(0,0,0);b.vlambda.set(0,0,0);b.wlambda.set(0,0,0);
                b.aabbNeedsUpdate=true;b.wakeUp();
                if(b._canRest){b._canRest.quiet=0;rememberSupport(b._canRest,null);}
            });
            hinges.forEach(h=>{h.data.commands.clear();h.driving=false;h.constraint._actuatorDriving=false;h.constraint._actuatorStalled=false;h.constraint.disableMotor();});
        },step(dt,commands){hinges.forEach((h,i)=>{h.data.commands.clear();if(commands[i])h.data.commands.set(h.joint.id,commands[i]);});
            accumulator+=Math.max(0,Math.min(.05,dt||0));while(accumulator>=snapshot.timeStep){motors(hinges,snapshot.timeStep,snapshot.unitScale);stepWorld(world,snapshot.timeStep);accumulator-=snapshot.timeStep;}
        }};
    }
    function setHeld(world,index,held){
        const body=world.bodies[index];if(!body||body.mass<=0)return;
        if(!world._dragHeld)world._dragHeld=new Set();
        if(held){if(body._dragBodyType===undefined)body._dragBodyType=body.type;body.type=C.Body.KINEMATIC;world._dragHeld.add(index);}
        else {if(body._dragBodyType!==undefined){body.type=body._dragBodyType;delete body._dragBodyType;}world._dragHeld.delete(index);}
        body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.force.set(0,0,0);body.torque.set(0,0,0);body.wakeUp();body.updateSolveMassProperties();
    }
    function state(world,hinges){
        const values=new Float64Array(world.bodies.length*13);
        world.bodies.forEach((b,i)=>values.set([...v(b.position),...q(b.quaternion),...v(b.velocity),...v(b.angularVelocity)],i*13));
        return {values,time:world.time,heldBodies:world._dragHeld?Array.from(world._dragHeld):undefined,hinges:hinges.map(h=>[h.angle,h.lastAngle,h.targetSpeed]),
            propStates:world.bodies.map(b=>b._canRest?[b.sleepState,b._canRest.quiet,world.bodies.indexOf(b._canRest.support)]:null)};
    }
    function applyState(world,hinges,packet){
        if(Array.isArray(packet.heldBodies)){
            const held=new Set(packet.heldBodies);for(const i of world._dragHeld||[])if(!held.has(i))setHeld(world,i,false);
            for(const i of held)setHeld(world,i,true);
        }
        const values=packet.values;
        world.bodies.forEach((b,i)=>{let n=i*13;b.position.set(values[n++],values[n++],values[n++]);b.quaternion.set(values[n++],values[n++],values[n++],values[n++]);
            b.velocity.set(values[n++],values[n++],values[n++]);b.angularVelocity.set(values[n++],values[n++],values[n++]);b.aabbNeedsUpdate=true;b.updateInertiaWorld(true);});
        world.time=packet.time;hinges.forEach((h,i)=>{[h.angle,h.lastAngle,h.targetSpeed]=packet.hinges[i];});
        world.bodies.forEach((b,i)=>{if(!b._canRest)return;const p=packet.propStates&&packet.propStates[i];
            b._canRest.quiet=p?p[1]:0;rememberSupport(b._canRest,p&&world.bodies[p[2]]||null);
            if(p&&p[0]===C.Body.SLEEPING)b.sleep();else b.wakeUp();
        });
    }
    const api={installImpactAudio,drainImpacts,setHeld,PlaneEquation,stepWorld,motors,localRotationEquation,compound,coupleJoints,snapshot,restore,state,applyState,installSolver};
    root.AssemblyPhysicsKernel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
