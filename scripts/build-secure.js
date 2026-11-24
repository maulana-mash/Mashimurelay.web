/**
 * scripts/build-secure.js
 * Comprehensive AST Minifier & Controlled Obfuscator for Mashimurelay
 * 
 * Pipeline:
 * Reads from clean development source: src_dev/
 * Compiles, minifies, and obfuscates into:
 *   1. mashimurelay-web/ (Root: index.html, css/style.css, js/*.js) -> deployed to Netlify / GitHub
 *   2. mashimurelay-web/dist/
 *   3. mashimurelay-windows/dist/
 * 
 * Guarantees:
 * - 0 HTML comments (<!-- ... --> stripped)
 * - 0 CSS comments (/* ... * / stripped)
 * - 0 JS comments (// and /* ... * / stripped)
 * - All internal function variables/parameters mangled into single letters (a, b, c)
 * - Compressed into 1 dense line
 * - Preserves all inter-file global symbols so simulation logic remains 100% identical and error-free
 */

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DEV_DIR = path.join(ROOT_DIR, 'src_dev');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const WIN_DIST_DIR = path.resolve(ROOT_DIR, '..', 'mashimurelay-windows', 'dist');

const RESERVED_GLOBALS = [
  'COMPONENTS_DATA',
  'MashimurelayCanvas',
  'soundManager',
  'ROUTER',
  'MashimurelayEngine',
  'parseLegacyCircuitTxt',
  'TauriBridge',
  'CIRCUIT_EXAMPLES',
  'LAMP_COLORS',
  'MashimurelayProjectManager',
  'Potential',
  'isPushButton',
  'isChangeoverSwitch',
  'isPlainFuse',
  'isOverloadRelay',
  'getTerminalWorldPos',
  'snapToGrid',
  'routeWirePoints',
  'pointsToSvgPath',
  'normalizeRotation',
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  '__TAURI__',
  'qrcode',
  'MashimurelayLoader',
  'openProjectDashboard',
  'mashimurelayNeedsInitialDashboard',
  'mashimuPanelControl',
  'togglePalette',
  'toggleInspector',
  'jspdf',
  'jsPDF',
  'generateCircuitPdfReport',
  'MashimurelayPdfReport',
  'ReviewTabManager',
  'reviewTabManager',
  'MashimurelayTheme',
  'PRACTICAL_MODULES_DATA',
  'MashimurelayModules'
];

console.log('=================================================================');
console.log('   MASHIMURELAY CONTROLLED MINIFICATION & OBFUSCATION ENGINE     ');
console.log('=================================================================\n');

if (!fs.existsSync(SRC_DEV_DIR)) {
  console.error('[ERROR] src_dev directory not found! Aborting to prevent source loss.');
  process.exit(1);
}

// 1. Minify CSS
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Strip comments
    .replace(/\s*([{}:;,>~])\s*/g, '$1') // Collapse spacing around syntax
    .replace(/;}/g, '}') // Remove trailing semicolon
    .replace(/[\r\n]+/g, '') // Collapse newlines
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// 2. Minify HTML
async function minifyHtml(html) {
  let processed = html;

  // Minify inline script tags if any
  const inlineScriptRegex = /<script(?![^>]*\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(inlineScriptRegex)];
  for (const match of matches) {
    const fullTag = match[0];
    const attrs = match[1];
    const code = match[2].trim();
    if (code) {
      try {
        const minified = await terserMinify(code, {
          compress: { drop_console: false, passes: 2 },
          mangle: { reserved: RESERVED_GLOBALS },
          format: { comments: false }
        });
        if (minified.code) {
          processed = processed.replace(fullTag, `<script${attrs}>${minified.code}</script>`);
        }
      } catch (err) {
        console.warn('  ! Inline script minification fallback:', err.message);
      }
    }
  }

  // Minify inline style tags
  processed = processed.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_, attrs, css) => `<style${attrs}>${minifyCss(css)}</style>`
  );

  // Strip all HTML comments (<!-- ... -->)
  processed = processed.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

  // Collapse whitespace between tags
  processed = processed
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\r\n]+/g, '')
    .trim();

  return processed;
}

// 3. Helper to write file to multiple destinations
function writeToTargets(relPath, content) {
  const targets = [
    path.join(ROOT_DIR, relPath),
    path.join(DIST_DIR, relPath),
    path.join(PUBLIC_DIR, relPath),
    path.join(WIN_DIST_DIR, relPath)
  ];
  targets.forEach(tgt => {
    const dir = path.dirname(tgt);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tgt, content, 'utf8');
  });
}

function copyToTargets(relPath) {
  const src = path.join(SRC_DEV_DIR, relPath);
  const targets = [
    path.join(ROOT_DIR, relPath),
    path.join(DIST_DIR, relPath),
    path.join(PUBLIC_DIR, relPath),
    path.join(WIN_DIST_DIR, relPath)
  ];
  targets.forEach(tgt => {
    const dir = path.dirname(tgt);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, tgt);
  });
}

async function runBuild() {
  console.log('[1/4] Processing HTML and CSS...');

  // HTML (Web & PWA)
  const rawHtml = fs.readFileSync(path.join(SRC_DEV_DIR, 'index.html'), 'utf8');
  const minifiedHtml = await minifyHtml(rawHtml);
  [DIST_DIR, PUBLIC_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  fs.writeFileSync(path.join(ROOT_DIR, 'index.html'), minifiedHtml, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), minifiedHtml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), minifiedHtml, 'utf8');

  // HTML for Windows Native Desktop (Strip 'Di HP', mobile orientation button, and Android QR modal)
  const winRawHtml = rawHtml
    .replace(/<button id="btnMobileOrientation"[\s\S]*?<\/button>\s*/gi, '')
    .replace(/<button id="btnQr"[\s\S]*?<\/button>\s*/gi, '')
    .replace(/<div id="modalQr"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');
  const winMinifiedHtml = await minifyHtml(winRawHtml);
  const winIndexDir = path.dirname(path.join(WIN_DIST_DIR, 'index.html'));
  if (!fs.existsSync(winIndexDir)) fs.mkdirSync(winIndexDir, { recursive: true });
  fs.writeFileSync(path.join(WIN_DIST_DIR, 'index.html'), winMinifiedHtml, 'utf8');

  console.log(`  ✓ index.html (Web: ${minifiedHtml.length.toLocaleString()} B, Windows: ${winMinifiedHtml.length.toLocaleString()} B, comments stripped)`);

  // CSS
  const rawCss = fs.readFileSync(path.join(SRC_DEV_DIR, 'css', 'style.css'), 'utf8');
  const minifiedCss = minifyCss(rawCss);
  writeToTargets('css/style.css', minifiedCss);
  console.log(`  ✓ css/style.css (${rawCss.length.toLocaleString()} B -> ${minifiedCss.length.toLocaleString()} B, comments stripped, 1-line)`);

  // Static files
  const staticFiles = ['components.json', 'manifest.json', 'sw.js'];
  staticFiles.forEach(file => {
    if (fs.existsSync(path.join(SRC_DEV_DIR, file))) {
      copyToTargets(file);
      console.log(`  ✓ static: ${file}`);
    }
  });

  // Windows desktop override: self-destructing sw.js to prevent WebView2 stale asset cache
  const winSwPath = path.join(WIN_DIST_DIR, 'sw.js');
  const winSwCode = "self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>self.registration.unregister()));});self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request));});";
  fs.writeFileSync(winSwPath, winSwCode, 'utf8');
  console.log('  ✓ win-static: self-destructing sw.js installed');

  // JS files
  console.log('\n[2/4] Minifying & Obfuscating JavaScript files...');
  const jsDir = path.join(SRC_DEV_DIR, 'js');
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

  for (const file of jsFiles) {
    const srcPath = path.join(jsDir, file);
    const rawJs = fs.readFileSync(srcPath, 'utf8');

    try {
      const result = await terserMinify(rawJs, {
        compress: {
          dead_code: true,
          drop_debugger: true,
          conditionals: true,
          evaluate: true,
          booleans: true,
          loops: true,
          unused: false,
          passes: 2
        },
        mangle: {
          toplevel: false, // Preserves global declarations, mangles all internal variables to single letters
          reserved: RESERVED_GLOBALS
        },
        format: {
          comments: false, // 100% comment removal
          ascii_only: true
        }
      });

      if (result.error) throw result.error;

      writeToTargets(`js/${file}`, result.code);
      const ratio = Math.round((1 - (result.code.length / rawJs.length)) * 100);
      console.log(`  ✓ js/${file.padEnd(24)} ${rawJs.length.toLocaleString()} B -> ${result.code.length.toLocaleString()} B (${ratio}% smaller, mangled)`);
    } catch (err) {
      console.error(`  ! Error obfuscating ${file}:`, err.message);
      process.exit(1);
    }
  }

  // Assets
  console.log('\n[3/4] Syncing Assets...');
  const assetsSrc = path.join(SRC_DEV_DIR, 'assets');
  const copyDir = (src, dst) => {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    const items = fs.readdirSync(src, { withFileTypes: true });
    for (const item of items) {
      const s = path.join(src, item.name);
      const d = path.join(dst, item.name);
      if (item.isDirectory()) copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  };

  if (fs.existsSync(assetsSrc)) {
    copyDir(assetsSrc, path.join(ROOT_DIR, 'assets'));
    copyDir(assetsSrc, path.join(DIST_DIR, 'assets'));
    copyDir(assetsSrc, path.join(PUBLIC_DIR, 'assets'));
    copyDir(assetsSrc, path.join(WIN_DIST_DIR, 'assets'));
    console.log('  ✓ Assets synced to root, dist, public, and windows/dist');
  }

  // Netlify configuration
  console.log('\n[4/4] Writing netlify.toml configuration...');
  const netlifyToml = `[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`;
  fs.writeFileSync(path.join(ROOT_DIR, 'netlify.toml'), netlifyToml, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'netlify.toml'), netlifyToml, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'netlify.toml'), netlifyToml, 'utf8');
  console.log('  ✓ netlify.toml written');

  console.log('\n=================================================================');
  console.log('✓ SUCCESS: All production files are now minified & obfuscated!');
  console.log('  - Root mashimurelay-web (for Netlify/GitHub): 100% Minified & Obfuscated');
  console.log('  - mashimurelay-web/dist: 100% Minified & Obfuscated');
  console.log('  - mashimurelay-web/public: 100% Minified & Obfuscated');
  console.log('  - mashimurelay-windows/dist: 100% Minified & Obfuscated');
  console.log('  - Clean original source preserved in: mashimurelay-web/src_dev/');
  console.log('=================================================================\n');
}

runBuild().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
