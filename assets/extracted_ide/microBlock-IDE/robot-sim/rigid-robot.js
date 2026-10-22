(function(root) {
    'use strict';
    const C = root.CANNON || (typeof require === 'function' ? require('./vendor/cannon-0.6.2.min.js') : null);
    function create(T, visual, drive, properties, wheels, environment) {
        if (!C || !wheels.length) return null;
        visual.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(visual), center = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3());
        const world = new C.World(); world.gravity.set(0,-9.81,0); world.solver.iterations = 20; world.allowSleep = true;
        const groundMaterial = new C.Material('ground'), tireMaterial = new C.Material('tire'), chassisMaterial = new C.Material('chassis');
        const friction = Math.max(0,Number(properties.friction) || 0), mass = Math.max(.05,Number(properties.mass) || .6);
        world.addContactMaterial(new C.ContactMaterial(groundMaterial,tireMaterial,{friction:0,restitution:0,contactEquationStiffness:1e7,contactEquationRelaxation:4}));
        world.addContactMaterial(new C.ContactMaterial(groundMaterial,chassisMaterial,{friction:friction,restitution:0}));
        const floor = new C.Body({mass:0,material:groundMaterial}), plane = new C.Plane(); plane.material=groundMaterial; floor.addShape(plane); floor.quaternion.setFromEuler(-Math.PI/2,0,0); world.addBody(floor);
        const field = environment && environment.field;
        let fieldBody = null, surface = null;
        if (field && Number.isFinite(field.width) && field.width > 0 && Number.isFinite(field.length) && field.length > 0 && Number.isFinite(field.thickness) && field.thickness > 0) {
            const x = Number.isFinite(field.centerX) ? field.centerX : 0, z = Number.isFinite(field.centerZ) ? field.centerZ : 0;
            const baseY = Number.isFinite(field.baseY) ? field.baseY : 0;
            surface = { minX:x-field.width/2, maxX:x+field.width/2, minZ:z-field.length/2, maxZ:z+field.length/2, topY:baseY+field.thickness };
            fieldBody = new C.Body({mass:0,material:groundMaterial});
            const shape = new C.Box(new C.Vec3(field.width/2,field.thickness/2,field.length/2));
            shape.material = groundMaterial; fieldBody.addShape(shape);
            fieldBody.position.set(x,baseY+field.thickness/2,z); world.addBody(fieldBody);
        }
        const groundHeight = (x,z) => surface && x >= surface.minX && x <= surface.maxX && z >= surface.minZ && z <= surface.maxZ ? Math.max(0,surface.topY) : 0;
        const body = new C.Body({mass,material:chassisMaterial,linearDamping:.03,angularDamping:.12});
        body.position.set(center.x,center.y,center.z); body.sleepSpeedLimit=.015; body.sleepTimeLimit=.6;
        // A lightweight compound collider avoids moving detailed GLB triangle
        // meshes in the solver. Sphere contacts approximate rolling tire contact.
        body.addShape(new C.Box(new C.Vec3(Math.max(.005,size.x*.35),Math.max(.004,size.y*.3),Math.max(.005,size.z*.35))));
        const contacts = wheels.map(wheel => {
            const offset = new C.Vec3(wheel.position[0]-center.x,wheel.position[1]-center.y,wheel.position[2]-center.z);
            const shape = new C.Sphere(Math.max(.001,wheel.radius)); shape.material=tireMaterial; body.addShape(shape,offset);
            return {offset,radius:shape.radius,side:wheel.side};
        });
        if (wheels.length === 2) {
            // Approximate the passive underside/caster supports of a two-wheel
            // robot. They carry weight but receive no motor traction force.
            const radius=Math.max(.002,Math.min(...wheels.map(w=>w.radius))*.15);
            const bottom=Math.min(bounds.min.y,...wheels.map(w=>w.position[1]-w.radius));
            const angle=drive.forwardAngle||0, reach=(Math.abs(Math.sin(angle))*size.x+Math.abs(Math.cos(angle))*size.z)*.35;
            for(const sign of [-1,1]) {
                const shape=new C.Sphere(radius);shape.material=tireMaterial;
                body.addShape(shape,new C.Vec3(Math.sin(angle)*reach*sign,bottom+radius-center.y,Math.cos(angle)*reach*sign));
            }
        }
        world.addBody(body);
        const visualOffset = visual.position.clone().sub(center), initial = body.position.clone();
        const forwardLocal = new C.Vec3(Math.sin(drive.forwardAngle||0),0,Math.cos(drive.forwardAngle||0));
        let accumulator = 0;
        const canPhysics=environment&&environment.cans?(root.SimFieldCans||(typeof require==='function'?require('./field-cans'):null)).attach(C,T,world,environment.cans,1):null;
        function sync() {
            if(canPhysics)canPhysics.sync();
            visual.quaternion.set(body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w);
            visual.position.copy(visualOffset).applyQuaternion(visual.quaternion).add(new T.Vector3(body.position.x,body.position.y,body.position.z));
            visual.updateMatrixWorld(true);
        }
        function traction() {
            const forward = body.quaternion.vmult(forwardLocal), lateral = new C.Vec3(forward.z,0,-forward.x);
            forward.y=0; forward.normalize(); lateral.normalize();
            const touching = contacts.map(wheel => ({wheel,center:body.pointToWorldFrame(wheel.offset)})).filter(item=>item.center.y-item.wheel.radius-groundHeight(item.center.x,item.center.z)<.002);
            touching.forEach(({wheel,center:wheelCenter}) => {
                const point = new C.Vec3(wheelCenter.x,wheelCenter.y-wheel.radius,wheelCenter.z), velocity = body.getVelocityAtWorldPoint(point,new C.Vec3());
                const target = wheel.side==='left' ? drive.left : drive.right;
                const gain=mass*8/Math.max(1,touching.length), limit=friction*mass*9.81/Math.max(1,touching.length);
                let longitudinal=(target-velocity.dot(forward))*gain, sideways=-velocity.dot(lateral)*gain;
                const magnitude=Math.sqrt(longitudinal*longitudinal+sideways*sideways), scale=magnitude>limit?limit/magnitude:1;
                const force=forward.scale(longitudinal*scale); force.vadd(lateral.scale(sideways*scale),force);
                // Cannon 0.6 takes a world-space point, unlike cannon-es.
                body.applyForce(force,point);
            });
        }
        function step(dt) {
            if (Math.abs(drive.left)+Math.abs(drive.right)>.0001) body.wakeUp();
            accumulator+=Math.max(0,Math.min(.05,dt||0));
            while(accumulator>=1/120){traction();world.step(1/120);accumulator-=1/120;}
            sync();
        }
        function reset() { if(canPhysics)canPhysics.reset();body.position.copy(initial);body.quaternion.set(0,0,0,1);body.velocity.set(0,0,0);body.angularVelocity.set(0,0,0);body.force.set(0,0,0);body.torque.set(0,0,0);body.aabbNeedsUpdate=true;body.wakeUp();accumulator=0;sync(); }
        return {world,body,step,reset,isActive:()=>body.sleepState!==C.Body.SLEEPING,dispose(){if(canPhysics)canPhysics.entries.forEach(e=>world.removeBody(e.body));world.removeBody(body);world.removeBody(floor);if(fieldBody)world.removeBody(fieldBody);}};
    }
    root.RigidRobot={create}; if(typeof module!=='undefined')module.exports=root.RigidRobot;
})(typeof window!=='undefined'?window:globalThis);
