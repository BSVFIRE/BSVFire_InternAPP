// Skriver public/version.json fra nyeste versjon i src/lib/changelog.ts, så UpdateChecker og appen alltid er enige.
import { readFileSync, writeFileSync } from 'node:fs'
const kilde = readFileSync(new URL('../src/lib/changelog.ts', import.meta.url), 'utf8')
const m = kilde.match(/version:\s*'([^']+)'/)
if (!m) { console.error('Fant ingen versjon i changelog.ts'); process.exit(1) }
writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify({ version: m[1], buildDate: new Date().toISOString() }, null, 2) + '\n')
console.log(`version.json → ${m[1]}`)
