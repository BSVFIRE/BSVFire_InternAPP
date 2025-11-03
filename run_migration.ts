import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = 'https://snyzduzqyjsllzvwuahh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required')
  console.log('Run with: SUPABASE_SERVICE_KEY=your_service_key npm run migrate')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('🚀 Kjører migrasjon: auto_update_kontroll_status.sql')
    
    const migrationPath = join(__dirname, 'supabase_migrations', 'auto_update_kontroll_status.sql')
    const sql = readFileSync(migrationPath, 'utf-8')
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Feil ved kjøring av migrasjon:', error)
      process.exit(1)
    }
    
    console.log('✅ Migrasjon fullført!')
    console.log('📝 Trigger opprettet: trigger_auto_update_kontroll_status')
    console.log('🎯 Funksjon opprettet: check_and_update_kontroll_status()')
    console.log('')
    console.log('Nå vil kontroll_status automatisk settes til "Utført" når alle tjenester er fullført!')
    
  } catch (error) {
    console.error('❌ Uventet feil:', error)
    process.exit(1)
  }
}

runMigration()
