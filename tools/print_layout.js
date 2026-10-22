const path = require('path');
const d = require(path.join(__dirname, '..', 'data', 'arenas', 'rescue_five_points_layout.json'));
console.log('=== RESCUE FIVE POINTS CELLS ===');
d.cells.forEach((c, i) => {
    const row = Math.floor(i / 8);
    const col = i % 8;
    console.log(`Cell ${i.toString().padStart(2, ' ')} (r${row}, c${col}): ${c.type.padEnd(26, ' ')} rot=${c.rotation}`);
});
console.log('=== OBJECTS ===');
console.log(JSON.stringify(d.objects, null, 2));
