/**
 * =============================================================================
 * PROJECT INTEGRITY & LINK VERIFICATION SUITE
 * Run: node scripts/verify_project.js
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const REQUIRED_PATHS = [
    'apps/web/index.html',
    'apps/desktop/main.js',
    'apps/desktop/launch_ide.bat',
    'apps/desktop/Launch_IDE.vbs',
    'src/infrastructure/server/ide_server.js',
    'docs/architecture/tactical_playbook.md',
    'docs/architecture/audit_adversarial_report.txt',
    'docs/rules/robot_competition_rules_intermediate.pdf',
    'docs/manuals/PT-BOT_Atom_VX_Assembly_Guide.pdf',
    'docs/manuals/PT-BOT_Atom_VX_User_Manual.pdf',
    'data/arenas/official_field_mission.json',
    'data/arenas/jaajaj.json',
    'data/arenas/normal.json',
    'assets/lib/three.min.js',
    'assets/lib/OrbitControls.js',
    'assets/images/robot_chassis.jpg',
    'assets/images/field_reference.jpg',
    'firmware/PT_BOT_Middle_3Drop_ATOM_VX/PT_BOT_Middle_3Drop_ATOM_VX.ino',
    'firmware/PT_BOT_Middle_ATOM_VX/PT_BOT_Middle_ATOM_VX.ino',
    'firmware/PT_BOT_Middle_3Drop_ATOM_VX/MissionRunner.ino',
    'firmware/PT_BOT_Middle_ATOM_VX/MissionRunner.ino',
    'drivers/cp210x/slabvcp.inf',
    'archives/backups/robot-intermediate-backup-20260922.zip',
    'archives/legacy-ui/tactical_planner.html.backup',
    'tools/cli/solve_cli.js',
    'tools/testing/verify_project.js'
];

console.log('=== VERIFYING CLEAN ARCHITECTURE DIRECTORY STRUCTURE ===\n');

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

console.log('\n=== VERIFYING JSON ARENA DATASETS ===');
['data/arenas/official_field_mission.json', 'data/arenas/jaajaj.json', 'data/arenas/normal.json'].forEach(relPath => {
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
