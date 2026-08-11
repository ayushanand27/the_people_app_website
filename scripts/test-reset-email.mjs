import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const env = {}
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

const env = loadEnv()
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: false },
})

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/test-reset-email.mjs <email>')
  process.exit(1)
}
const redirectTo = 'https://the-people-app-website.vercel.app/reset-password'

console.log('Testing resetPasswordForEmail for:', email)
const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

if (error) {
  console.error('ERROR:', error.message)
  console.error('Status:', error.status)
  console.error('Full:', JSON.stringify(error, null, 2))
  process.exit(1)
}

console.log('SUCCESS:', data)
