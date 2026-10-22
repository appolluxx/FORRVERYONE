(function(root) {
    'use strict';
    const degrees = 180 / Math.PI, rpm = 60 / (2 * Math.PI);
    const finiteVector = value => value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
    const finiteQuaternion = value => finiteVector(value) && Number.isFinite(value.w);

    // Read-only ideal sensors at the primary body's center of mass. Position
    // is in world metres; IMU uses X forward, Y left, Z up. Acceleration is
    // specific force (dv/dt - gravity), so an upright resting robot reads +g Z.
    // The returned snapshot is reused; callers retaining samples must copy it.
    function create(T) {
        const output = {available:false, elapsed:0, position:{x:0,y:0,z:0}, speed:0,
            imu:{roll:0,pitch:0,yaw:0,gyro:{x:0,y:0,z:0},accel:null}, motors:[], servos:[]};
        const acceleration = {x:0,y:0,z:0};
        const velocity = new T.Vector3(), previousVelocity = new T.Vector3(), force = new T.Vector3();
        const scratch = new T.Vector3(), axis = new T.Vector3();
        const forward = new T.Vector3(), left = new T.Vector3(), up = new T.Vector3(0,1,0);
        const basis = new T.Matrix4(), homeBodyInverse = new T.Quaternion(), homeFrame = new T.Quaternion();
        const homeFrameInverse = new T.Quaternion(), sensorFrame = new T.Quaternion(), sensorInverse = new T.Quaternion();
        const relative = new T.Quaternion(), rotation = new T.Euler(0,0,0,'ZYX');
        let currentEngine = null, previousTime = null, fallbackTime = 0, bindings = [], cachedAngle = null, hasForce = false;

        function reset() {
            currentEngine = null; previousTime = null; fallbackTime = 0; cachedAngle = null; hasForce = false; bindings = [];
            output.available = false; output.elapsed = 0; output.speed = 0; output.motors.length = 0; output.servos.length = 0;
            output.position.x = output.position.y = output.position.z = 0;
            output.imu.roll = output.imu.pitch = output.imu.yaw = 0;
            output.imu.gyro.x = output.imu.gyro.y = output.imu.gyro.z = 0; output.imu.accel = null;
            return output;
        }

        function bind(engine) {
            currentEngine = engine;
            const entries = engine.entries || [], primary = entries.find(entry => entry.body === engine.body);
            // RigidRobot has an identity home quaternion; AssemblyPhysics
            // records its imported component orientation explicitly.
            const initial = primary && primary.initialQuaternion || engine.initialQuaternion;
            if (finiteQuaternion(initial)) homeBodyInverse.copy(initial).normalize().invert();
            else homeBodyInverse.identity();
            const byMesh = new Map(entries.map(entry => [entry.mesh,entry.body]));
            const runtimes = new Set(entries.map(entry => entry.runtime).filter(Boolean));
            const constraints = engine.world && engine.world.constraints || [];
            for (const runtime of runtimes) {
                if (typeof runtime.physicsModel !== 'function') continue;
                const model = runtime.physicsModel(), manifest = model && model.manifest;
                if (!manifest || !model.meshes) continue;
                const joints = new Map((manifest.joints || []).map(joint => [joint.id,joint]));
                for (const device of manifest.devices || []) {
                    if (device.type !== 'motor' && device.type !== 'servo') continue;
                    const sample = {id:device.id, name:device.name || device.id, rpm:null, command:null};
                    (device.type === 'servo' ? output.servos : output.motors).push(sample);
                    const joint = joints.get(device.jointId);
                    if (!joint) continue;
                    const parent = byMesh.get(model.meshes.get(joint.parent)), child = byMesh.get(model.meshes.get(joint.child));
                    if (!parent || !child) continue;
                    const hinge = constraints.find(constraint => constraint.axisA && constraint.axisB &&
                        ((constraint.bodyA === parent && constraint.bodyB === child) ||
                         (constraint.bodyB === parent && constraint.bodyA === child)));
                    if (!hinge) continue;
                    bindings.push({device,joint,parent,child,model,sample,
                        localAxis:hinge.bodyA === parent ? hinge.axisA : hinge.axisB});
                }
            }
        }

        function update(engine, dt, forwardAngle) {
            const body = engine && engine.body;
            if (!body || !finiteVector(body.position) || !finiteVector(body.velocity) ||
                !finiteVector(body.angularVelocity) || !finiteQuaternion(body.quaternion)) return reset();
            if (currentEngine !== engine) { reset(); bind(engine); }
            const scale = Number.isFinite(engine.unitScale) && engine.unitScale > 0 ? engine.unitScale : 1;
            const world = engine.world, clock = world && world.time;
            fallbackTime += Number.isFinite(dt) ? Math.max(0,dt) : 0;
            const time = Number.isFinite(clock) ? clock : fallbackTime;
            if (previousTime !== null && time < previousTime) { previousTime = null; hasForce = false; }
            const angle = Number.isFinite(forwardAngle) ? forwardAngle : 0;
            if (angle !== cachedAngle) {
                forward.set(Math.sin(angle),0,Math.cos(angle)); left.crossVectors(up,forward);
                basis.makeBasis(forward,left,up); homeFrame.setFromRotationMatrix(basis);
                homeFrameInverse.copy(homeFrame).invert(); cachedAngle = angle;
            }
            sensorFrame.copy(body.quaternion).normalize().multiply(homeBodyInverse).multiply(homeFrame);
            sensorInverse.copy(sensorFrame).invert();
            relative.copy(homeFrameInverse).multiply(sensorFrame);
            rotation.setFromQuaternion(relative,'ZYX');
            output.imu.roll = rotation.x * degrees; output.imu.pitch = rotation.y * degrees; output.imu.yaw = rotation.z * degrees;
            scratch.copy(body.angularVelocity).applyQuaternion(sensorInverse).multiplyScalar(degrees);
            output.imu.gyro.x = scratch.x; output.imu.gyro.y = scratch.y; output.imu.gyro.z = scratch.z;
            velocity.copy(body.velocity).divideScalar(scale);
            // Render frames without a physics step must not dilute the finite
            // difference or replace the previous velocity sample. The first
            // sample after reset has no derivative and displays unavailable.
            if (previousTime !== null && time > previousTime) {
                force.copy(velocity).sub(previousVelocity).divideScalar(time - previousTime);
                if (world && finiteVector(world.gravity)) {
                    force.x -= world.gravity.x / scale; force.y -= world.gravity.y / scale; force.z -= world.gravity.z / scale;
                }
                hasForce = finiteVector(force);
            }
            if (previousTime === null || time !== previousTime) { previousVelocity.copy(velocity); previousTime = time; }
            if (hasForce) {
                scratch.copy(force).applyQuaternion(sensorInverse);
                acceleration.x = scratch.x; acceleration.y = scratch.y; acceleration.z = scratch.z;
                output.imu.accel = acceleration;
            } else output.imu.accel = null;
            output.available = true; output.elapsed = time;
            output.position.x = body.position.x / scale; output.position.y = body.position.y / scale; output.position.z = body.position.z / scale;
            output.speed = velocity.length();
            for (const binding of bindings) {
                const {parent,child,sample,device,model,joint} = binding;
                axis.copy(binding.localAxis).applyQuaternion(parent.quaternion).normalize();
                scratch.copy(child.angularVelocity).sub(parent.angularVelocity);
                const measured = scratch.dot(axis) * rpm;
                sample.rpm = Number.isFinite(measured) ? measured : null;
                const command = model.commands && model.commands.get(joint.id);
                sample.command = command && Number.isFinite(command.velocity) && command.maxSpeed > 0 ?
                    Math.max(-100,Math.min(100,command.velocity / command.maxSpeed * 100 * (device.invert ? -1 : 1))) : null;
            }
            return output;
        }
        return {update,reset};
    }
    root.SimTelemetry = {create};
    if (typeof module !== 'undefined') module.exports = root.SimTelemetry;
})(typeof window !== 'undefined' ? window : globalThis);
