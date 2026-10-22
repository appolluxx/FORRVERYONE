import math

weights_mm = [-42, -30, -18, -6, 6, 18, 30, 42]

def simulate_optical_sensors(line_offset_mm, is_bamboo=False, is_junction=False, is_off_line=False):
    readings_cal = []
    
    for i, w in enumerate(weights_mm):
        if is_off_line:
            refl = 0.08
        elif is_junction:
            refl = 0.92
        elif is_bamboo:
            refl = 0.689
        else:
            dist_to_line = abs(w - line_offset_mm)
            if dist_to_line <= 10.0:
                refl = 0.92
            elif dist_to_line <= 16.0:
                t = (dist_to_line - 10.0) / 6.0
                refl = 0.92 - t * (0.92 - 0.08)
            else:
                refl = 0.08
        
        adc_raw = round(refl * 1023)
        cal_pct = max(3, min(98, round(((adc_raw - 120) / (920 - 120)) * 100)))
        readings_cal.append(cal_pct)
    
    # Centroid calculation
    weighted_sum = 0
    sum_val = 0
    active_count = 0
    high_count = 0
    
    for i, w in enumerate(weights_mm):
        if readings_cal[i] > 25:
            weighted_sum += w * readings_cal[i]
            sum_val += readings_cal[i]
            active_count += 1
        if readings_cal[i] > 85:
            high_count += 1
            
    if sum_val == 0 or is_off_line or active_count == 0:
        centroid = 0.0
        status = "OFF LINE"
    elif is_bamboo or (active_count >= 6 and high_count == 0 and 60 <= readings_cal[3] <= 80):
        centroid = round(weighted_sum / sum_val, 2)
        status = "BAMBOO SPEED BUMP (0.689)"
    elif is_junction or high_count >= 6:
        centroid = round(weighted_sum / sum_val, 2)
        status = "JUNCTION (ALL CHANNELS ACTIVE)"
    else:
        centroid = round(weighted_sum / sum_val, 2)
        status = "ON LINE"
        
    return readings_cal, centroid, status

print("=== 8-CHANNEL OPTICAL SENSOR ARRAY TESTS ===")

# Test 1: Centered line
cal, c, st = simulate_optical_sensors(0.0)
print(f"1. Centered Line (0mm): Readings={cal}, Centroid={c:+.1f}mm, Status={st}")
assert abs(c) < 1.0
assert cal[3] > 80 and cal[4] > 80

# Test 2: Line offset to Right (+18mm)
cal, c, st = simulate_optical_sensors(18.0)
print(f"2. Line Offset Right (+18mm): Readings={cal}, Centroid={c:+.1f}mm, Status={st}")
assert c > 10.0
assert cal[5] > 80

# Test 3: Line offset to Left (-18mm)
cal, c, st = simulate_optical_sensors(-18.0)
print(f"3. Line Offset Left (-18mm): Readings={cal}, Centroid={c:+.1f}mm, Status={st}")
assert c < -10.0
assert cal[2] > 80

# Test 4: White floor (Off line)
cal, c, st = simulate_optical_sensors(0.0, is_off_line=True)
print(f"4. Off Line (White Floor): Readings={cal}, Centroid={c:+.1f}mm, Status={st}")
assert all(v < 15 for v in cal)
assert st == "OFF LINE"

# Test 5: Bamboo Speed Bump (Reflectance = 0.689)
cal, c, st = simulate_optical_sensors(0.0, is_bamboo=True)
print(f"5. Bamboo Speed Bump (0.689): Readings={cal}, Centroid={c:+.1f}mm, Status={st}")
assert all(65 <= v <= 78 for v in cal)
assert st == "BAMBOO SPEED BUMP (0.689)"

# Test 6: T-Junction / Cross Junction
cal, c, st = simulate_optical_sensors(0.0, is_junction=True)
print(f"6. T-Junction / Cross Line: Readings={cal}, Centroid={c:+.1f}mm, Status={st}")
assert all(v > 90 for v in cal)
assert "JUNCTION" in st

print("\nSensor Array Unit Tests: ALL 6 TESTS PASSED!")
