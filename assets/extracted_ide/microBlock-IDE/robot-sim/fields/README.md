# OPT primary 2025 field

`opt-primary-2025.png` is rendered directly from the user-provided
`สนาม อปท ประถม 2025.ai` (PDF-compatible Adobe Illustrator artwork), without
redrawing, cropping, or changing the layout. The source stays outside the app.

- Source SHA-256: `775f6f7d448598dc4c7fc91955f5c5720e4795af4224d0b519432af18bb17910`
- One landscape artboard: 6803.1499 × 3401.5701 PDF points, physically 240 × 120 cm.
- PNG: 4096 × 2048 pixels, opaque RGB, white background, 148,765 bytes.
- Rasterizer: PyMuPDF 1.28.2; the converter is `tools/import-sim-field.py`.
- Approximate START center: 43.75% from the left, 87.5% from the top.
- SIM substrate: white plaswood, 2.4 × 1.2 × 0.005 m. The top is at Y=0.005 m,
  with a static box collider and the original base floor at Y=0.
- Field center: X=0.15 m, Z=-0.45 m, placing START at the robot's reset origin.
- Line sensors sample the same top-face image; the white sides and underside
  are separate materials on the same closed box.
- The PNG is a field texture, not a 3D obstacle model; the colored shapes and
  black lines remain printed markings.

To regenerate with Python and PyMuPDF available:

```powershell
python tools/import-sim-field.py 'C:\path\สนาม อปท ประถม 2025.ai' microBlock-IDE/robot-sim/fields/opt-primary-2025.png --width 4096 --height 2048
```

The conversion tools are used only during development. The packaged IDE needs
only the PNG and does not open or parse Illustrator files at runtime.
