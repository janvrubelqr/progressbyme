// Post-processes the `expo export --platform web` output so it deploys
// cleanly on Vercel. Vercel's deploy pipeline silently drops any file whose
// path contains a literal "node_modules" segment — but Expo's asset hashing
// preserves each font/icon's original path under node_modules (since that's
// where the source package lives), so most fonts/icons would 404 in
// production otherwise. This renames that folder and rewrites the few
// references to it in the built JS bundle, and adds the SPA rewrite config
// Vercel needs for expo-router's client-side routes.
const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, '..', 'dist')
const oldAssetsDir = path.join(distDir, 'assets', 'node_modules')
const newAssetsDir = path.join(distDir, 'assets', 'vendor')

if (fs.existsSync(oldAssetsDir)) {
  fs.renameSync(oldAssetsDir, newAssetsDir)
}

const jsDir = path.join(distDir, '_expo', 'static', 'js', 'web')
for (const file of fs.readdirSync(jsDir)) {
  if (!file.endsWith('.js')) continue
  const filePath = path.join(jsDir, file)
  const content = fs.readFileSync(filePath, 'utf8')
  fs.writeFileSync(filePath, content.split('assets/node_modules').join('assets/vendor'))
}

fs.writeFileSync(
  path.join(distDir, 'vercel.json'),
  JSON.stringify(
    {
      rewrites: [{ source: '/((?!assets/|_expo/|favicon.ico|metadata.json).*)', destination: '/index.html' }],
    },
    null,
    2
  )
)

fs.writeFileSync(path.join(distDir, '.vercelignore'), '')

// `output: "single"` (our app.json web config) is pure client-side SPA
// bootstrapping — Expo Router's app/+html.tsx customization only takes
// effect for "static"/"server" output, so it's not an option here.
// Patching index.html directly instead: viewport-fit=cover is what lets
// mobile browsers report a real env(safe-area-inset-bottom) at all —
// without it, the bottom tab bar renders flush against (or under) an
// iPhone's home-indicator bar, since the page never learns that inset
// exists. The tab bar layouts then add their own bottom padding from
// useSafeAreaInsets().
const indexHtmlPath = path.join(distDir, 'index.html')
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8')
const patchedIndexHtml = indexHtml.replace(
  /<meta name="viewport" content="[^"]*"\s*\/?>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />'
)
if (patchedIndexHtml === indexHtml) {
  throw new Error('fix-vercel-assets: viewport meta tag not found in dist/index.html — expo\'s export template may have changed')
}
fs.writeFileSync(indexHtmlPath, patchedIndexHtml)

console.log('dist/ ready for Vercel (assets renamed, vercel.json + .vercelignore written, viewport-fit=cover patched in)')
