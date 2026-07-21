// Injects PWA support (manifest + icons + meta tags) into the static export produced by
// `expo export --platform web`. Expo's Metro web export doesn't have a documented hook for
// this in a non-Expo-Router app, so this patches dist/index.html directly after the fact.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const webDir = path.join(__dirname, '..', 'web');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('patch-web: dist/index.html not found -- run `expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('manifest.webmanifest')) {
  console.log('patch-web: already patched, skipping.');
  process.exit(0);
}

fs.mkdirSync(path.join(distDir, 'pwa'), { recursive: true });
fs.copyFileSync(path.join(webDir, 'manifest.webmanifest'), path.join(distDir, 'manifest.webmanifest'));
for (const file of fs.readdirSync(path.join(webDir, 'pwa'))) {
  fs.copyFileSync(path.join(webDir, 'pwa', file), path.join(distDir, 'pwa', file));
}

const injected = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#1a1a1a" />
    <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="SOCIAL" />
  </head>`;

html = html.replace('</head>', injected);
fs.writeFileSync(indexPath, html);
console.log('patch-web: injected PWA manifest + icons into dist/index.html');
