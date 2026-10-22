(function (root) {
    'use strict';

    function create(T, orbit) {
        let enabled = true;
        let primed = false;
        let settled = true;

        function valid(anchor) {
            return anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y) && Number.isFinite(anchor.z);
        }

        function prime(anchor, immediate) {
            primed = !!valid(anchor);
            settled = true;
            if (!primed) return;
            orbit.desiredTarget.copy(anchor);
            if (immediate) orbit.target.copy(anchor);
        }

        return {
            get enabled() { return enabled; },
            isSettled() { return !enabled || settled; },
            update(anchor, dt) {
                if (!enabled) return;
                if (!valid(anchor)) { primed = false; settled = true; return; }
                if (!primed) { prime(anchor, false); return; }
                let remaining = dt === undefined ? 1 / 60 : Math.min(.1, Math.max(0, dt));
                if (!Number.isFinite(remaining)) return;
                const radius = Number.isFinite(orbit.radius) && orbit.radius > 0 ? orbit.radius : .3;
                const deadZone = radius * .08;
                // Let the subject move within the frame, then pan after it.
                // Move both orbit targets by the filtered pan, so existing
                // orbit interpolation only eases the initial framing offset.
                // Stacking two motion filters would let fast robots leave view.
                // Short time steps keep catch-up consistent across frame rates.
                while (remaining > 1e-8) {
                    const step = Math.min(remaining, 1 / 120);
                    remaining -= step;
                    const dx = anchor.x - orbit.desiredTarget.x;
                    const dy = anchor.y - orbit.desiredTarget.y;
                    const dz = anchor.z - orbit.desiredTarget.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (distance <= deadZone) break;
                    const catchUp = Math.min(1, Math.max(0, (distance / radius - .12) / .2));
                    const response = .32 + (.025 - .32) * catchUp;
                    const amount = (1 - deadZone / distance) * (1 - Math.exp(-step / response));
                    orbit.target.x += dx * amount;
                    orbit.target.y += dy * amount;
                    orbit.target.z += dz * amount;
                    orbit.desiredTarget.x += dx * amount;
                    orbit.desiredTarget.y += dy * amount;
                    orbit.desiredTarget.z += dz * amount;
                }
                const dx = anchor.x - orbit.desiredTarget.x;
                const dy = anchor.y - orbit.desiredTarget.y;
                const dz = anchor.z - orbit.desiredTarget.z;
                settled = dx * dx + dy * dy + dz * dz <= Math.pow(deadZone + radius * .001, 2);
            },
            setEnabled(value, anchor) {
                enabled = !!value;
                primed = false;
                settled = true;
                if (enabled) prime(anchor, false);
            },
            reset(anchor) {
                // A reset is a teleport: center now and discard the old location.
                prime(anchor, true);
            }
        };
    }

    root.SimCameraFollow = { create };
    if (typeof module !== 'undefined') module.exports = root.SimCameraFollow;
})(typeof window !== 'undefined' ? window : globalThis);
