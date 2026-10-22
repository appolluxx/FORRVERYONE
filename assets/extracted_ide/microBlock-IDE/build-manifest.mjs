// build-manifest.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ===== CLI args =====
// ตัวอย่าง: node build-manifest.mjs --dir=. --version=2.9.2 --subdirs=dashboard,admin
const args = process.argv.slice(2);
const getArg = (key, def) => {
  const found = args.find(a => a.startsWith(`--${key}=`));
  return found ? found.split('=').slice(1).join('=') : def;
};

const VERSION   = getArg('version', '1.0.0');
const INPUT_DIR = getArg('dir', 'AUTO'); // AUTO = เดาเองจาก dist/build/public/cwd
const SUBDIRS   = (getArg('subdirs', '') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean); // โฟลเดอร์ย่อยที่จะสร้าง manifest แยก (เช่น "dashboard,admin")

// ===== Resolve base dir =====
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const cwd        = process.cwd();

const candidates = [
  INPUT_DIR !== 'AUTO' ? path.resolve(cwd, INPUT_DIR) : null,
  path.resolve(cwd, 'dist'),
  path.resolve(cwd, 'build'),
  path.resolve(cwd, 'public'),
  cwd,
].filter(Boolean);

async function dirExists(p) {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function pickBaseDir() {
  for (const cand of candidates) {
    if (await dirExists(cand)) return cand;
  }
  throw new Error('No suitable base directory found. Try --dir=.');
}

const includeExt = new Set([
  '.html', '.js', '.css', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.glb',
  '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.map', // ถ้าไม่อยากรวม .map ให้ลบบรรทัดนี้
]);

// ไฟล์/โฟลเดอร์ที่ไม่อยากรวม
const ignorePatterns = [
  /^\/?service-worker\.js$/i,
  /^\/?sw\.js$/i,
  /^\/?asset-manifest\.json$/i,
  /^\/?robots\.txt$/i,
  /^\/?CNAME$/i,
  /^\/?\.well-known\//i,
  /(^|\/)node_modules\//i,
  /(^|\/)\.git\//i,
];

function shouldIgnore(rel) {
  // rel อาจไม่มี / นำหน้า → ลองทั้งแบบมี/ไม่มี
  const withSlash    = rel.startsWith('/') ? rel : '/' + rel;
  const withoutSlash = rel.startsWith('/') ? rel.slice(1) : rel;
  return ignorePatterns.some(rx => rx.test(withSlash) || rx.test(withoutSlash));
}

// เดินไฟล์ใต้โฟลเดอร์ "dir" แล้วคืน path ที่ relative ต่อ "base"
async function walk(dir, base, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(p, base, out);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      const rel = path.relative(base, p).replace(/\\/g, '/'); // ไม่มี / นำหน้า
      if (shouldIgnore(rel)) continue;
      if (includeExt.has(ext)) out.push(rel);
    }
  }
}

async function buildOneManifest(scopeDir, outFile) {
  // เตือนถ้าไม่มี index.html (ยังใช้งานได้ แต่แนะนำให้มี)
  if (!await fileExists(path.join(scopeDir, 'index.html'))) {
    console.warn('[warn] index.html not found in:', scopeDir);
  }

  const files = [];
  await walk(scopeDir, scopeDir, files);
  files.sort();

  // เขียนไฟล์เป็นรายการ "relative-to-this-manifest-directory"
  // ตัวอย่างใน root:   ["index.html","css/app.css","js/app.js"]
  // ตัวอย่างใน /dashboard: ["index.html","css/page.css","js/page.js"]
  const manifest = { version: VERSION, files };
  await fs.writeFile(outFile, JSON.stringify(manifest, null, 2));

  console.log(`[ok] asset-manifest.json generated`);
  console.log(' base :', scopeDir);
  console.log(' files:', files.length);
  console.log(' path :', outFile);
}

(async () => {
  const BASE_DIR = await pickBaseDir();

  // รายการงานที่จะสร้าง manifest หลายไฟล์
  const jobs = [];

  // 1) root manifest (เช่น /asset-manifest.json)
  jobs.push({
    scopeDir: BASE_DIR,
    outFile:  path.join(BASE_DIR, 'asset-manifest.json'),
  });

  // 2) โฟลเดอร์ย่อย (เช่น dashboard, admin ฯลฯ)
  let subdirs = SUBDIRS.slice();

  // ถ้าไม่ระบุ --subdirs ให้ auto-detect dashboard ถ้ามี
  if (subdirs.length === 0) {
    const dashPath = path.join(BASE_DIR, 'dashboard');
    if (await dirExists(dashPath)) {
      subdirs.push('dashboard');
    }
  }

  for (const sd of subdirs) {
    const scopeDir = path.join(BASE_DIR, sd);
    if (!(await dirExists(scopeDir))) {
      console.warn(`[warn] skip subdir "${sd}" (not found)`);
      continue;
    }
    jobs.push({
      scopeDir,
      outFile: path.join(scopeDir, 'asset-manifest.json'),
    });
  }

  // สร้างทุก manifest (ทำแบบ sequential เพื่ออ่านง่าย)
  for (const j of jobs) {
    await buildOneManifest(j.scopeDir, j.outFile);
  }
})().catch((err) => {
  console.error('[error]', err.message || err);
  process.exit(1);
});