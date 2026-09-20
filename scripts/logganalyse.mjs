#!/usr/bin/env node
// Henter feil og advarsler fra system_logs og skriver en gruppert Markdown-rapport til stdout.
// Brukes av Claude Code-kommandoen /logganalyse (se .claude/commands/logganalyse.md) og kan kjøres for hånd:
//
//   node scripts/logganalyse.mjs [--dager 7] [--maks 30]
//
// Trenger VITE_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY (system_logs kan bare leses av admin via RLS,
// så anon-nøkkelen holder ikke). Legg SUPABASE_SERVICE_ROLE_KEY i .env.local – den er gitignored.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

for (const fil of ['.env.local', '.env']) {
  const p = resolve(process.cwd(), fil)
  if (!existsSync(p)) continue
  for (const linje of readFileSync(p, 'utf8').split('\n')) {
    const m = linje.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Mangler VITE_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i miljøet/.env.local')
  process.exit(1)
}

const arg = (navn, std) => { const i = process.argv.indexOf(`--${navn}`); return i > -1 ? Number(process.argv[i + 1]) : std }
const dager = arg('dager', 7)
const maks = arg('maks', 30)
const siden = new Date(Date.now() - dager * 86400_000).toISOString()

const res = await fetch(`${url}/rest/v1/system_logs?select=id,timestamp,level,message,data,namespace,page_url,user_email&level=in.(error,warn)&timestamp=gte.${siden}&order=timestamp.desc&limit=3000`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (!res.ok) { console.error('Supabase svarte', res.status, await res.text()); process.exit(1) }
const logger = await res.json()

const normaliser = s => s
  .replace(/https?:\/\/\S+/g, '<url>')
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
  .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}[^\s"]*/g, '<tid>')
  .replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 300)
const side = u => { try { return new URL(u).pathname } catch { return u || '' } }

const grupper = new Map()
for (const l of logger) {
  const k = `${l.level}|${normaliser(l.message)}`
  const g = grupper.get(k) || { nivaa: l.level, melding: l.message, antall: 0, brukere: new Set(), sider: new Set(), moduler: new Set(), forst: l.timestamp, sist: l.timestamp, data: l.data }
  g.antall++
  if (l.user_email) g.brukere.add(l.user_email.split('@')[0])
  if (l.page_url) g.sider.add(side(l.page_url))
  if (l.namespace && l.namespace !== 'unknown') g.moduler.add(l.namespace)
  if (l.timestamp < g.forst) g.forst = l.timestamp
  if (l.timestamp > g.sist) g.sist = l.timestamp
  grupper.set(k, g)
}
const liste = [...grupper.values()].sort((a, b) => b.antall - a.antall).slice(0, maks)

const feil = logger.filter(l => l.level === 'error').length
console.log(`# Systemlogg siste ${dager} dager\n`)
console.log(`${feil} feil og ${logger.length - feil} advarsler, ${grupper.size} unike grupper, ${new Set(logger.map(l => l.user_email).filter(Boolean)).size} brukere berørt. Viser de ${liste.length} hyppigste.\n`)
liste.forEach((g, i) => {
  console.log(`## ${i + 1}. [${g.nivaa}] ${g.antall} × – ${g.melding.slice(0, 120).replace(/\n/g, ' ')}${g.melding.length > 120 ? '…' : ''}`)
  console.log(`- Brukere: ${[...g.brukere].join(', ') || '–'}`)
  console.log(`- Sider: ${[...g.sider].slice(0, 6).join(', ') || '–'}`)
  if (g.moduler.size) console.log(`- Modul: ${[...g.moduler].join(', ')}`)
  console.log(`- Første: ${g.forst.slice(0, 16).replace('T', ' ')} · Sist: ${g.sist.slice(0, 16).replace('T', ' ')}`)
  if (g.melding.length > 120) console.log(`\n\`\`\`\n${g.melding.slice(0, 1500)}\n\`\`\``)
  if (g.data) {
    const d = typeof g.data === 'string' ? g.data : JSON.stringify(g.data)
    console.log(`\nEksempeldata:\n\`\`\`\n${d.slice(0, 1200)}\n\`\`\``)
  }
  console.log()
})
