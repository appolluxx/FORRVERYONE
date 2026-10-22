import math

five_points = [
    {"x": 1.05, "z": -0.45, "heading": 0},
    {"x": 1.05, "z": 0.15, "heading": -90},
    {"x": 0.45, "z": 0.15, "heading": 0},
    {"x": -0.15, "z": 0.15, "heading": 90},
    {"x": -0.75, "z": -0.15, "heading": 0}
]

weights_mm = [-42, -30, -18, -6, 6, 18, 30, 42]

def simulate_step(posX, posZ, yawRad, pStart, pEnd, is_bamboo_zone):
    dx = pEnd["x"] - pStart["x"]
    dz = pEnd["z"] - pStart["z"]
    seg_len = math.hypot(dx, dz)
    if seg_len < 1e-6:
        tx, tz = 1.0, 0.0
    else:
        tx, tz = dx / seg_len, dz / seg_len
    
    # Normal to segment (pointing to right of track)
    # If tangent is (tx, tz), normal is (tz, -tx)
    nx, nz = tz, -tx
    
    # Front sensor bar center (offset +0.10m along robot heading)
    # Robot yaw in Three.js: 0 rad faces -Z or +X? Let's check:
    # In tactical_planner.html:
    # Point 1 (heading 0 deg) moves from z=-0.45 to z=+0.15.
    # In 2D plane:
    barX = posX
    barZ = posZ
    
    # Distance from sensor bar to line segment
    cross_track = (barX - pStart["x"]) * nx + (barZ - pStart["z"]) * nz
    
    sensor_readings = []
    weighted_sum = 0
    sum_val = 0
    high_count = 0
    active_count = 0
    
    for i, w in enumerate(weights_mm):
        # Sensor offset along normal
        dist_s = abs(cross_track + (w / 1000.0))
        
        if is_bamboo_zone:
            refl = 0.689
        elif dist_s <= 0.010: # within 20mm line (10mm half-width)
            refl = 0.92
        elif dist_s <= 0.018: # penumbra
            t = (dist_s - 0.010) / 0.008
            refl = 0.92 - t * (0.92 - 0.08)
        else:
            refl = 0.08
            
        adc_raw = round(refl * 1023)
        cal_pct = max(3, min(98, round(((adc_raw - 120) / (920 - 120)) * 100)))
        sensor_readings.append(cal_pct)
        if cal_pct > 25:
            weighted_sum += w * cal_pct
            sum_val += cal_pct
            active_count += 1
        if cal_pct > 85:
            high_count += 1
            
    if sum_val == 0 or active_count == 0:
        centroid = 0.0
        status = "OFF LINE"
    elif is_bamboo_zone:
        centroid = round(weighted_sum / sum_val, 1)
        status = "BAMBOO SPEED BUMP (0.689)"
    elif high_count >= 6:
        centroid = round(weighted_sum / sum_val, 1)
        status = "JUNCTION (ALL CHANNELS ACTIVE)"
    else:
        centroid = round(weighted_sum / sum_val, 1)
        status = "ON LINE (0.92)"
        
    return sensor_readings, centroid, status

print("=== TESTING SEGMENT 0 (VERTICAL SEGMENT ALONG Z) ===")
p0 = five_points[0]
p1 = five_points[1]

# Midpoint on segment 0: x=1.05, z=-0.15
readings, centroid, status = simulate_step(1.05, -0.15, 0.0, p0, p1, False)
print(f"Segment 0 Centered: Readings={readings}, Centroid={centroid:+.1f}mm, Status={status}")
assert abs(centroid) < 1.0, f"Expected ~0 centroid on centered segment 0, got {centroid}"
assert "ON LINE" in status, f"Expected ON LINE status, got {status}"

# Shift robot +12mm off line: x=1.062, z=-0.15
readings, centroid, status = simulate_step(1.062, -0.15, 0.0, p0, p1, False)
print(f"Segment 0 Shifted +12mm: Readings={readings}, Centroid={centroid:+.1f}mm, Status={status}")
assert centroid != 0.0, "Centroid should be non-zero when shifted"

# Chopstick zone on segment 2: x=0.75, z=0.15
p2 = five_points[2]
p3 = five_points[3]
readings, centroid, status = simulate_step(0.75, 0.15, 0.0, p2, p3, True)
print(f"Segment 2 Bamboo Zone: Readings={readings}, Centroid={centroid:+.1f}mm, Status={status}")
assert status == "BAMBOO SPEED BUMP (0.689)", f"Expected Bamboo status, got {status}"
assert all(65 <= r <= 78 for r in readings), f"All readings should be ~73%, got {readings}"

print("\nTrack simulation algorithm test: PASSED!")
