import { copyFileSync, writeFileSync } from 'node:fs'

/** GitHub Pages：子路径 SPA 需要 404.html（内容与 index 相同） */
if (process.env.GITHUB_PAGES === 'true') {
  copyFileSync('dist/index.html', 'dist/404.html')
} else {
  const toml = `[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`
  writeFileSync('dist/netlify.toml', toml, 'utf8')
  writeFileSync('dist/_redirects', '/*    /index.html   200\n', 'utf8')
}
