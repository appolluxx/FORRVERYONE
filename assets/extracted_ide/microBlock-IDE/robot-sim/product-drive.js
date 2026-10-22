(function (root) {
    'use strict';
    // A small differential-drive model shared by authoring Preview and SIM.
    // Joint motion is kinematic; this models chassis response and tyre traction.
    function advance(state, drive, physics, dt) {
        dt = Math.max(0, Math.min(.1, Number(dt) || 0));
        const mass = Math.max(.01, Number(physics && physics.mass) || .6);
        const friction = Math.max(0, physics && Number.isFinite(physics.friction) ? physics.friction : .6);
        const width = Math.max(.02, Number(drive.trackWidth) || .15);
        const targetLinear = (drive.left + drive.right) / 2;
        const targetAngular = (drive.right - drive.left) / width;
        const response = 1 - Math.exp(-5.6 * (.6 / mass) * dt);
        function approach(current, target, limit) {
            const delta = (target - current) * response;
            return current + Math.max(-limit * dt, Math.min(limit * dt, delta));
        }
        state.linearVelocity = approach(state.linearVelocity || 0, targetLinear, friction * 9.81);
        state.angularVelocity = approach(state.angularVelocity || 0, targetAngular, friction * 9.81 * 2 / width);
        return state;
    }
    root.ProductDrive = { advance };
    if (typeof module !== 'undefined') module.exports = root.ProductDrive;
})(typeof window !== 'undefined' ? window : globalThis);
