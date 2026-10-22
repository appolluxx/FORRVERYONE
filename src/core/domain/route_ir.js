/**
 * =============================================================================
 * PT-BOT TACTICAL IDE · ROUTE INTERMEDIATE REPRESENTATION (IR) & COLLISION MODEL
 * Authoritative geometric and kinematic constraints for PT-BOT Atom VX
 * =============================================================================
 */

// PT-BOT Physical Dimensions (meters)
const ROBOT_LENGTH = 0.18;   // 180 mm chassis length
const ROBOT_WIDTH = 0.14;    // 140 mm chassis width
const ROBOT_RADIUS = 0.114;  // 114 mm bounding circle radius

// Arena Boundaries (meters)
const ARENA_BOUNDS = {
    'atom-vx-rescue-five-points': {
        minX: -1.20, maxX: 1.20,
        minZ: -0.60, maxZ: 0.60,
        cols: 8, rows: 4,
        tileW: 0.30, tileH: 0.30
    },
    'quick-box-drop': {
        minX: -0.60, maxX: 0.60,
        minZ: -0.60, maxZ: 0.60,
        cols: 4, rows: 4,
        tileW: 0.30, tileH: 0.30
    }
};

/**
 * Waypoint data structure
 */
class Waypoint {
    constructor(x, z, heading = 0, speed = 70, action = null, desc = "") {
        this.x = Number(x);
        this.z = Number(z);
        this.heading = Number(heading); // degrees [-180, 180]
        this.speed = Math.max(20, Math.min(100, Number(speed))); // speed 20-100%
        this.action = action; // null | 'DROP_FL' | 'DROP_FR' | 'DROP_B' | 'DROP_F' | 'SETFRONT' | 'SETBACK' | 'STOP'
        this.desc = desc || "";
    }
}

/**
 * Route Segment between two waypoints
 */
class RouteSegment {
    constructor(startWp, endWp, index) {
        this.index = index;
        this.start = startWp;
        this.end = endWp;

        const dx = endWp.x - startWp.x;
        const dz = endWp.z - startWp.z;
        this.distance = Math.hypot(dx, dz); // meters

        // In simulator: +Z is 0 deg heading, -X is -90 deg, +X is +90 deg, -Z is 180 deg
        let targetHeading = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
        while (targetHeading > 180) targetHeading -= 360;
        while (targetHeading < -180) targetHeading += 360;
        this.targetHeading = targetHeading;

        // Turn angle required from start heading to segment heading
        let turnAngle = this.targetHeading - startWp.heading;
        while (turnAngle > 180) turnAngle -= 360;
        while (turnAngle < -180) turnAngle += 360;
        this.turnAngle = turnAngle;

        // Kinematic duration calculation based on speed
        // At speed S (20-100%), velocity v = (S / 100) * 0.85 m/s
        const velocity = (startWp.speed / 100) * 0.85; // m/s
        const moveTimeSec = velocity > 0 ? this.distance / velocity : 0;
        this.moveDurationMs = Math.round(moveTimeSec * 1000);

        // Turn duration based on gyro spin speed (typically 100% spin = ~250 deg/s)
        const spinVelocity = 250.0; // deg/sec
        this.turnDurationMs = Math.round((Math.abs(this.turnAngle) / spinVelocity) * 1000);

        this.isValid = true;
        this.collisionReason = null;
    }
}

/**
 * Route Intermediate Representation
 */
class RouteIR {
    constructor(projectId = 'atom-vx-rescue-five-points', waypoints = [], arenaData = null) {
        this.projectId = projectId;
        this.waypoints = waypoints.map(w => new Waypoint(w.x, w.z, w.heading, w.speed, w.action || w.drop, w.desc));
        this.arenaData = arenaData;
        this.segments = [];
        this.totalDistance = 0;
        this.totalDurationMs = 0;
        this.isValid = true;
        this.validationErrors = [];

        this.compileSegments();
        this.validateRoute();
    }

    compileSegments() {
        this.segments = [];
        this.totalDistance = 0;
        this.totalDurationMs = 0;

        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const seg = new RouteSegment(this.waypoints[i], this.waypoints[i + 1], i);
            this.segments.push(seg);
            this.totalDistance += seg.distance;
            this.totalDurationMs += seg.turnDurationMs + seg.moveDurationMs;
        }
    }

    validateRoute() {
        this.validationErrors = [];
        this.isValid = true;

        if (this.waypoints.length < 2) {
            this.validationErrors.push("Route requires at least 2 waypoints (Start and Destination).");
            this.isValid = false;
            return;
        }

        const bounds = ARENA_BOUNDS[this.projectId] || ARENA_BOUNDS['atom-vx-rescue-five-points'];
        const halfL = ROBOT_LENGTH / 2;
        const halfW = ROBOT_WIDTH / 2;

        // 1. Validate Waypoint Boundaries & Duplicate Detection
        for (let i = 0; i < this.waypoints.length; i++) {
            const wp = this.waypoints[i];

            // Check field boundaries with robot footprint clearance
            if (wp.x - halfW < bounds.minX || wp.x + halfW > bounds.maxX ||
                wp.z - halfL < bounds.minZ || wp.z + halfL > bounds.maxZ) {
                this.validationErrors.push(
                    `Waypoint P${i + 1} (${wp.x.toFixed(2)}m, ${wp.z.toFixed(2)}m) collides with outer arena boundary walls.`
                );
                this.isValid = false;
            }

            // Check duplicate consecutive waypoints
            if (i > 0) {
                const prev = this.waypoints[i - 1];
                const dist = Math.hypot(wp.x - prev.x, wp.z - prev.z);
                if (dist < 0.02) { // Less than 2 cm apart
                    this.validationErrors.push(
                        `Waypoints P${i} and P${i + 1} are virtually identical (distance ${(dist * 100).toFixed(1)} cm < 2 cm).`
                    );
                    this.isValid = false;
                }
            }
        }

        // 2. Validate Segment Obstacle Collisions
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const collision = this.checkSegmentCollision(seg, bounds);
            if (collision) {
                seg.isValid = false;
                seg.collisionReason = collision;
                this.validationErrors.push(`Segment P${i + 1} -> P${i + 2}: ${collision}`);
                this.isValid = false;
            }
        }
    }

    checkSegmentCollision(seg, bounds) {
        // Samples 15 points along the segment and checks for obstacles
        const samples = 15;
        for (let s = 0; s <= samples; s++) {
            const t = s / samples;
            const x = seg.start.x + t * (seg.end.x - seg.start.x);
            const z = seg.start.z + t * (seg.end.z - seg.start.z);

            // Check cell type if arenaData is present
            if (this.arenaData && this.arenaData.cells) {
                const cellW = (bounds.maxX - bounds.minX) / bounds.cols;
                const cellH = (bounds.maxZ - bounds.minZ) / bounds.rows;

                const col = Math.floor((x - bounds.minX) / cellW);
                const row = Math.floor((z - bounds.minZ) / cellH);

                if (col >= 0 && col < bounds.cols && row >= 0 && row < bounds.rows) {
                    const cellIdx = row * bounds.cols + col;
                    const cell = this.arenaData.cells[cellIdx];

                    if (cell) {
                        if (cell.type === 'rescue_pit') {
                            return `Obstacle collision detected at (${x.toFixed(2)}m, ${z.toFixed(2)}m): Impassable Pit Tile (#${cellIdx}).`;
                        }
                        if (cell.type === 'rescue_closed') {
                            return `Obstacle collision detected at (${x.toFixed(2)}m, ${z.toFixed(2)}m): Impassable Closed Wall (#${cellIdx}).`;
                        }
                    }
                }
            }

            // Five-point route bridge railing check
            if (this.projectId === 'atom-vx-rescue-five-points') {
                // Bridge deck platform is in the bridge lane where Z is in [0.0, 0.30]
                if (x >= -0.15 && x <= 0.05 && z >= 0.0 && z <= 0.30) {
                    if (z < 0.05 || z > 0.25) {
                        return `Bridge Railing Hazard at (${x.toFixed(2)}m, ${z.toFixed(2)}m): Robot footprint exceeds 20cm bridge platform.`;
                    }
                }
            }
        }
        return null;
    }
}

module.exports = {
    ROBOT_LENGTH,
    ROBOT_WIDTH,
    ROBOT_RADIUS,
    ARENA_BOUNDS,
    Waypoint,
    RouteSegment,
    RouteIR
};
