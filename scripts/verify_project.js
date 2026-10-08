/**
 * =============================================================================
 * PROJECT INTEGRITY & LINK VERIFICATION SUITE
 * Run: node scripts/verify_project.js
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_PATHS = [
    'index.html',
    'tactical_planner.html',
    'web.html',
    'docs/doc.md',
    'docs/robot_competition_rules_intermediate.pdf',
    'docs/PT-BOT_Atom_VX_Assembly_Guide.pdf',
    'docs/PT-BOT_Atom_VX_User_Manual.pdf',
    'data/official_field_mission.json',
    'data/jaajaj.json',
    'assets/images.jpg',
    'firmware/PT_BOT_Middle_3Drop_ATOM_VX/PT_BOT_Middle_3Drop_ATOM_VX.ino',
    'firmware/PT_BOT_Middle_ATOM_VX/PT_BOT_Middle_ATOM_VX.ino',
    'ide_server.js',
    'launch_ide.bat',
    'firmware/PT_BOT_Middle_3Drop_ATOM_VX/MissionRunner.ino',
    'firmware/PT_BOT_Middle_ATOM_VX/MissionRunner.ino',
    'drivers/CP210x_Windows_Drivers/slabvcp.inf',
    'archives/robot-intermediate-backup-20260922.zip'
];

console.log('=== VERIFYING PROJECT DIRECTORY STRUCTURE ===\n');

let missingCount = 0;
REQUIRED_PATHS.forEach(relPath => {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
        console.log(`[PASS] ${relPath}`);
    } else {
        console.error(`[FAIL] Missing: ${relPath}`);
        missingCount++;
    }
});

console.log('\n=== VERIFYING JSON DATASETS ===');
['data/official_field_mission.json', 'data/jaajaj.json'].forEach(relPath => {
    try {
        const content = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
        const parsed = JSON.parse(content);
        console.log(`[PASS] ${relPath} (Grid cells: ${parsed.gridData?.length || 0})`);
    } catch (err) {
        console.error(`[FAIL] ${relPath} JSON parse error: ${err.message}`);
        missingCount++;
    }
});

console.log('\n=== SUMMARY ===');
if (missingCount === 0) {
    console.log('All files and directories organized with 100% integrity.');
    process.exit(0);
} else {
    console.error(`Found ${missingCount} issues.`);
    process.exit(1);
}
