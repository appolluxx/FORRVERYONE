import math

def calculate_heading_pd(target_deg, current_deg, prev_error, filt_deriv, kp=3.5, kd=17.0, max_limit=80):
    error = target_deg - current_deg
    while error > 180.0:
        error -= 360.0
    while error < -180.0:
        error += 360.0
    
    deriv = error - prev_error
    filt_deriv = 0.70 * filt_deriv + 0.30 * deriv
    prev_error = error
    pd = (error * kp) + (filt_deriv * kd)
    pd_clamped = max(-max_limit, min(max_limit, pd))
    return error, deriv, filt_deriv, pd, pd_clamped

# Test boundary conditions
test_cases = [
    # (name, target, current)
    ("Zero error", 0.0, 0.0),
    ("90 deg right turn", 90.0, 0.0),
    ("90 deg left turn", -90.0, 0.0),
    ("Small error near 0", 1.5, 0.0),
    ("Negative small error", -1.5, 0.0),
    ("Near +180 boundary", 179.0, 0.0),
    ("Near -180 boundary", -179.0, 0.0),
    ("Wrap across +179 to -179", -179.0, 179.0), # should be +2 deg, NOT -358 deg
    ("Wrap across -179 to +179", 179.0, -179.0), # should be -2 deg, NOT +358 deg
    ("Full circle 360 to 0", 0.0, 360.0),       # should be 0 deg
    ("Full circle 0 to 360", 360.0, 0.0),       # should be 0 deg
    ("Large overshoot 270 to 0", 0.0, 270.0),   # 270 is -90, so error should be +90
    ("Negative wrap -270 to 0", 0.0, -270.0)    # -270 is +90, so error should be -90
]

print("=== HEADING PD BOUNDARY UNIT TESTS ===")
all_pass = True
for name, tgt, cur in test_cases:
    err, deriv, fd, pd_raw, pd_clamp = calculate_heading_pd(tgt, cur, 0.0, 0.0)
    print(f"[{name}] Tgt: {tgt:6.1f}°, Cur: {cur:6.1f}° -> Error: {err:6.1f}°, PD: {pd_raw:7.1f}, Clamped: {pd_clamp:5.1f}")
    
    # Assertions
    if name == "Wrap across +179 to -179":
        if abs(err - 2.0) > 1e-4:
            print("  FAIL: Expected +2.0° error for +179 to -179 wrap!")
            all_pass = False
    elif name == "Wrap across -179 to +179":
        if abs(err - (-2.0)) > 1e-4:
            print("  FAIL: Expected -2.0° error for -179 to +179 wrap!")
            all_pass = False
    elif name in ["Full circle 360 to 0", "Full circle 0 to 360"]:
        if abs(err) > 1e-4:
            print("  FAIL: Expected 0.0° error for 360° circle wrap!")
            all_pass = False
    elif name == "Large overshoot 270 to 0":
        if abs(err - 90.0) > 1e-4:
            print("  FAIL: Expected +90.0° error for 270° overshoot!")
            all_pass = False
    elif name == "Negative wrap -270 to 0":
        if abs(err - (-90.0)) > 1e-4:
            print("  FAIL: Expected -90.0° error for -270° overshoot!")
            all_pass = False

print(f"\nHeading PD Unit Tests Result: {'PASSED' if all_pass else 'FAILED'}")
