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

console.log('dist/ ready for Vercel (assets renamed, vercel.json + .vercelignore written)')
