import { writeFileSync } from 'node:fs'

const toml = `[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`

writeFileSync('dist/netlify.toml', toml, 'utf8')
writeFileSync('dist/_redirects', '/*    /index.html   200\n', 'utf8')
